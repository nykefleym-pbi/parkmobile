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
    const { token } = await req.json();
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

    const [bkRes, pmRes, penRes] = await Promise.all([
      supabase.from("bookings").select("*"),
      supabase.from("payments").select("*"),
      supabase.from("penalties").select("*"),
    ]);

    return new Response(JSON.stringify({
      bookings: bkRes.data || [],
      payments: pmRes.data || [],
      penalties: penRes.data || [],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
