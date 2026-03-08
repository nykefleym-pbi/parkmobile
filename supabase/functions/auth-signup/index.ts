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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { name, email, phone, password, blklot, restype, car, plate, color } = await req.json();

    if (!name || !email || !phone || !password || !blklot || !car || !plate) {
      return new Response(JSON.stringify({ error: "Please fill in all required fields." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: "Password must be at least 6 characters." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if email already exists
    const { data: existing } = await supabase.from("users").select("id").eq("email", email).limit(1);
    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ error: "Email already registered." }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hashedPassword = await hashPassword(password);

    const { data: uRes, error: uErr } = await supabase.from("users").insert({
      email, password_hash: hashedPassword, name, phone,
      block_lot: blklot, residence_type: restype || "Resident",
    }).select();

    if (uErr || !uRes?.length) {
      return new Response(JSON.stringify({ error: "Failed to create account." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = uRes[0].id;

    const { data: vRes } = await supabase.from("vehicles").insert({
      user_id: userId, name: car, plate, color: color || "White", is_primary: true,
    }).select();

    return new Response(JSON.stringify({
      success: true,
      user: { id: userId, name, email },
      vehicle: vRes?.[0] || null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
