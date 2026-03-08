import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      // Verify ownership
      const { data: cfg } = await supabase.from("app_config").select("admin_id").eq("id", id).single();
      if (cfg?.admin_id !== adminId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { error } = await supabase.from("app_config").update(fields).eq("id", id);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "update_space") {
      const { id, ...fields } = data;
      if (!id) return new Response(JSON.stringify({ error: "Space id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      // Verify ownership
      const { data: sp } = await supabase.from("spaces").select("admin_id").eq("id", id).single();
      if (sp?.admin_id !== adminId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { error } = await supabase.from("spaces").update(fields).eq("id", id);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "add_space") {
      // Inject admin_id into the space data
      const { data: result, error } = await supabase.from("spaces").insert({ ...data, admin_id: adminId }).select().single();
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ ok: true, record: result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete_space") {
      const { id } = data;
      if (!id) return new Response(JSON.stringify({ error: "Space id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      // Verify ownership
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
