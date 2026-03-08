import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code } = await req.json();
    if (!code) {
      return new Response(JSON.stringify({ error: "Invite code is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: admins, error } = await supabase
      .from("admins")
      .select("id, name")
      .eq("invite_code", code.toUpperCase().trim())
      .limit(1);

    if (error || !admins?.length) {
      return new Response(JSON.stringify({ error: "Invalid invite code" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = admins[0];

    // Get subdivision name from app_config
    const { data: configs } = await supabase
      .from("app_config")
      .select("subdiv_name")
      .eq("admin_id", admin.id)
      .limit(1);

    const subdivName = configs?.[0]?.subdiv_name || admin.name;

    return new Response(JSON.stringify({
      admin_id: admin.id,
      subdiv_name: subdivName,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
