import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PBKDF2_ITERATIONS = 310000;

async function hashPasswordPbkdf2(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = [...salt].map(b => b.toString(16).padStart(2, "0")).join("");
  const keyMaterial = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial, 256
  );
  const hashHex = [...new Uint8Array(derived)].map(b => b.toString(16).padStart(2, "0")).join("");
  return `$pbkdf2$${PBKDF2_ITERATIONS}$${saltHex}$${hashHex}`;
}

async function verifyPasswordPbkdf2(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  const iterations = parseInt(parts[2]);
  const saltHex = parts[3];
  const storedHash = parts[4];
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  const keyMaterial = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial, 256
  );
  const hashHex = [...new Uint8Array(derived)].map(b => b.toString(16).padStart(2, "0")).join("");
  return hashHex === storedHash;
}

async function verifyPasswordSha256(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  const salt = parts[2];
  const storedHash = parts[3];
  const data = new TextEncoder().encode(salt + password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const hashHex = [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
  return hashHex === storedHash;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (stored.startsWith("$pbkdf2$")) return verifyPasswordPbkdf2(password, stored);
  if (stored.startsWith("$sha256$")) return verifyPasswordSha256(password, stored);
  return stored === password;
}

async function generateToken(adminId: string): Promise<string> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const exp = Date.now() + 24 * 60 * 60 * 1000;
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

    // Auto-migrate old hashes to PBKDF2
    if (!admin.password_hash.startsWith("$pbkdf2$")) {
      const hashed = await hashPasswordPbkdf2(password);
      await supabase.from("admins").update({ password_hash: hashed }).eq("id", admin.id);
    }

    // Auto-initialize app_config and spaces for new admins
    const { data: existingConfig } = await supabase
      .from("app_config")
      .select("id")
      .eq("admin_id", admin.id)
      .limit(1);

    if (!existingConfig || existingConfig.length === 0) {
      await supabase.from("app_config").insert({
        admin_id: admin.id,
        subdiv_name: admin.name,
        app_name: "ParkAssist",
        theme: "green",
        hoa_phone: "",
        hoa_email: "",
        hoa_hours: "Mon–Sat, 8AM–5PM",
      });

      await supabase.from("spaces").insert([
        { admin_id: admin.id, name: "Parking Space 1", address: "[parking space address]", slots: 10, rate: 1500, sort_order: 0 },
        { admin_id: admin.id, name: "Parking Space 2", address: "[parking space address]", slots: 10, rate: 1500, sort_order: 1 },
      ]);
    }

    const token = await generateToken(admin.id);

    return new Response(JSON.stringify({
      token,
      admin: { id: admin.id, name: admin.name, username: admin.username, invite_code: admin.invite_code },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
