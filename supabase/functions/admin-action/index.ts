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

async function verifyToken(token: string): Promise<string | null> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [adminId, expStr, sigHex] = parts;
  if (Date.now() > parseInt(expStr)) return null;
  const payload = `${adminId}.${expStr}`;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
  );
  const sigBytes = new Uint8Array(sigHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  const valid = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(payload));
  return valid ? adminId : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token, action, data } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: "Token required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminId = await verifyToken(token);
    if (!adminId) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify admin still exists
    const { data: admin } = await supabase.from("admins").select("id").eq("id", adminId).limit(1);
    if (!admin?.length) {
      return new Response(JSON.stringify({ error: "Admin not found" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "change_password") {
      const { current_password, new_password } = data;
      if (!current_password || !new_password) {
        return new Response(JSON.stringify({ error: "Current and new password required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!/^\d{6,8}$/.test(new_password)) {
        return new Response(JSON.stringify({ error: "New password must be 6-8 digits" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Fetch current hash
      const { data: adminRow } = await supabase.from("admins").select("password_hash").eq("id", adminId).single();
      if (!adminRow) {
        return new Response(JSON.stringify({ error: "Admin not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const valid = await verifyPassword(current_password, adminRow.password_hash);
      if (!valid) {
        return new Response(JSON.stringify({ error: "Current password is incorrect" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const newHash = await hashPasswordPbkdf2(new_password);
      const { error } = await supabase.from("admins").update({ password_hash: newHash }).eq("id", adminId);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "insert_payment") {
      const { data: result, error } = await supabase.from("payments").insert(data).select().single();
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ ok: true, record: result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "insert_penalty") {
      const { data: result, error } = await supabase.from("penalties").insert(data).select().single();
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ ok: true, record: result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "update_config") {
      const { id, ...fields } = data;
      if (!id) return new Response(JSON.stringify({ error: "Config id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data: cfg } = await supabase.from("app_config").select("admin_id").eq("id", id).single();
      if (cfg?.admin_id !== adminId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { error } = await supabase.from("app_config").update(fields).eq("id", id);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "update_space") {
      const { id, ...fields } = data;
      if (!id) return new Response(JSON.stringify({ error: "Space id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data: sp } = await supabase.from("spaces").select("admin_id").eq("id", id).single();
      if (sp?.admin_id !== adminId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { error } = await supabase.from("spaces").update(fields).eq("id", id);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "add_space") {
      const { data: result, error } = await supabase.from("spaces").insert({ ...data, admin_id: adminId }).select().single();
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ ok: true, record: result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete_space") {
      const { id } = data;
      if (!id) return new Response(JSON.stringify({ error: "Space id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data: sp } = await supabase.from("spaces").select("admin_id").eq("id", id).single();
      if (sp?.admin_id !== adminId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { error } = await supabase.from("spaces").delete().eq("id", id);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "regenerate_invite_code") {
      const newCode = Array.from(crypto.getRandomValues(new Uint8Array(4))).map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
      const { error } = await supabase.from("admins").update({ invite_code: newCode }).eq("id", adminId);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ ok: true, invite_code: newCode }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
