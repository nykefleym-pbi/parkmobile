import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user with their JWT
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { space_name, slot_id, vehicle_id } = await req.json();

    if (!space_name || !slot_id || !vehicle_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Validate vehicle belongs to user
    const { data: vehicle, error: vehErr } = await admin.from("vehicles").select("*").eq("id", vehicle_id).eq("user_id", user.id).single();
    if (vehErr || !vehicle) {
      return new Response(JSON.stringify({ error: "Vehicle not found or not yours" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get user profile for admin_id
    const { data: profile } = await admin.from("profiles").select("name, email, block_lot, admin_id").eq("id", user.id).single();
    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Look up the space to get the correct rate (prevents rate manipulation)
    const { data: space } = await admin.from("spaces").select("rate, name").eq("name", space_name).eq("admin_id", profile.admin_id).maybeSingle();
    if (!space) {
      return new Response(JSON.stringify({ error: "Parking space not found" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check slot is not already occupied
    const { data: occupied } = await admin.rpc("get_occupied_slots", { _admin_id: profile.admin_id });
    const occupiedIds = (occupied || []).map((o: any) => o.slot_id);
    if (occupiedIds.includes(slot_id)) {
      return new Response(JSON.stringify({ error: "Slot is already occupied" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create booking with server-validated rate
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + 30);
    const startDate = now.toISOString().split("T")[0];
    const endDate = end.toISOString().split("T")[0];
    const code = "BK-" + Date.now();

    const { data: booking, error: insertErr } = await admin.from("bookings").insert({
      booking_code: code,
      user_id: user.id,
      space_name: space.name,
      slot_id,
      vehicle_id: vehicle.id,
      vehicle_name: vehicle.name,
      vehicle_plate: vehicle.plate,
      vehicle_color: vehicle.color,
      rate: space.rate,
      status: "active",
      start_date: startDate,
      end_date: endDate,
      user_name: profile.name,
      user_email: profile.email,
      user_block_lot: profile.block_lot,
      admin_id: profile.admin_id,
    }).select().single();

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ booking }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
