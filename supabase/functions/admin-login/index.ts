import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = [...salt].map(b => b.toString(16).padStart(2, "0")).join("");
  const data = new TextEncoder().encode(saltHex + password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const hashHex = [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
  return `$sha256$${saltHex}$${hashHex}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (stored.startsWith("$sha256$")) {
    const parts = stored.split("$");
    const salt = parts[2];
    const storedHash = parts[3];
    const data = new TextEncoder().encode(salt + password);
    const hash = await crypto.subtle.digest("SHA-256", data);
    const hashHex = [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
    return hashHex === storedHash;
  }
  return stored === password;
}

async function generateToken(adminId: string): Promise<string> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const exp = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  const payload = `${adminId}.${exp}`;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const sigHex = [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
  return `${payload}.${sigHex}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return new Response(JSON.stringify({ error: "Username and password are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: admins, error } = await supabase
      .from("admins")
      .select("*")
      .eq("username", username)
      .limit(1);

    if (error || !admins?.length) {
      return new Response(JSON.stringify({ error: "Invalid admin credentials." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = admins[0];
    const valid = await verifyPassword(password, admin.password_hash);
    if (!valid) {
      return new Response(JSON.stringify({ error: "Invalid admin credentials." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auto-migrate plaintext passwords
    if (!admin.password_hash.startsWith("$sha256$")) {
      const hashed = await hashPassword(password);
      await supabase.from("admins").update({ password_hash: hashed }).eq("id", admin.id);
    }

    const token = await generateToken(admin.id);

    return new Response(JSON.stringify({
      token,
      admin: { id: admin.id, name: admin.name, username: admin.username },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
