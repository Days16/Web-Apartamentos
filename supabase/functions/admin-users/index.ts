import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Verificar que el llamante es admin
  const jwt = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!jwt) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${jwt}` } } }
  );
  const { data: { user }, error: authErr } = await anonClient.auth.getUser();
  if (authErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const role = user.app_metadata?.role;
  if (role !== "admin") return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });

  // Cliente con service role para operar sobre auth.users
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    if (req.method === "GET") {
      // Listar usuarios
      const { data, error } = await adminClient.auth.admin.listUsers();
      if (error) throw error;
      const users = data.users.map(u => ({
        id: u.id,
        email: u.email,
        role: u.app_metadata?.role ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        banned_until: u.banned_until ?? null,
      }));
      return new Response(JSON.stringify({ users }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (req.method === "POST") {
      // Invitar usuario
      const { email, role: newRole } = await req.json();
      if (!email || !newRole) return new Response(JSON.stringify({ error: "email and role required" }), { status: 400, headers: corsHeaders });
      const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { role: newRole },
      });
      if (error) throw error;
      // Actualizar app_metadata con el rol
      await adminClient.auth.admin.updateUserById(data.user.id, {
        app_metadata: { role: newRole },
      });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (req.method === "PATCH") {
      // Actualizar rol o estado de un usuario
      const { id, role: newRole, active } = await req.json();
      if (!id) return new Response(JSON.stringify({ error: "id required" }), { status: 400, headers: corsHeaders });

      if (newRole !== undefined) {
        await adminClient.auth.admin.updateUserById(id, {
          app_metadata: { role: newRole },
        });
      }
      if (active === false) {
        // Banear indefinidamente
        await adminClient.auth.admin.updateUserById(id, {
          ban_duration: "876600h", // 100 años
        });
      }
      if (active === true) {
        await adminClient.auth.admin.updateUserById(id, {
          ban_duration: "none",
        });
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
