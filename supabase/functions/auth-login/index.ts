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
  // Legacy plaintext comparison for migration
  return stored === password;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email and password are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .limit(1);

    if (error || !users?.length) {
      return new Response(JSON.stringify({ error: "Invalid credentials" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = users[0];
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return new Response(JSON.stringify({ error: "Invalid credentials" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auto-migrate plaintext passwords to hashed
    if (!user.password_hash.startsWith("$sha256$")) {
      const hashed = await hashPassword(password);
      await supabase.from("users").update({ password_hash: hashed }).eq("id", user.id);
    }

    // Fetch user's data
    const [vehRes, bkRes, pmRes, penRes, occRes] = await Promise.all([
      supabase.from("vehicles").select("*").eq("user_id", user.id),
      supabase.from("bookings").select("*").eq("user_id", user.id),
      supabase.from("payments").select("*"),
      supabase.from("penalties").select("*"),
      supabase.from("bookings").select("slot_id").eq("status", "active"),
    ]);

    // Filter payments/penalties to this user's bookings
    const bookingIds = (bkRes.data || []).map((b: any) => b.id);
    const payments = (pmRes.data || []).filter((p: any) => bookingIds.includes(p.booking_id));
    const penalties = (penRes.data || []).filter((p: any) => bookingIds.includes(p.booking_id));

    const { password_hash, ...userData } = user;

    return new Response(JSON.stringify({
      user: userData,
      vehicles: vehRes.data || [],
      bookings: bkRes.data || [],
      payments,
      penalties,
      occupiedSlots: (occRes.data || []).map((b: any) => b.slot_id),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
