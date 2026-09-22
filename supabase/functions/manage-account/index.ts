// manage-account — the one place a staff account is created.
//
// ── WHY AN EDGE FUNCTION ──
//
// Creating a login needs the Auth admin API, which needs the service-role key,
// which must never reach a browser (app/src/lib/supabase.ts). Migration 0030
// tried the other route — inserting into auth.users directly — and every
// sign-in failed until 0031 repaired the rows GoTrue could not read. This
// function runs server-side with the service key the runtime injects, and
// does three things: create an account, set an account's password, and change
// an account's email (which is two writes -- see set_email).
//
// Everything else about an account — role, municipality, is_active — is a
// plain UPDATE on public.app_user from the screen, under RLS (0118) and the
// guard_app_user trigger (0117), which is where those rules live. They are
// NOT re-implemented here.
//
// ── WHO MAY CALL IT ──
//
// Only an active super_admin (RAMTHA_IMPLEMENTATION_PLAN.md §2.5). The caller
// is identified from the JWT the browser sends, then looked up in app_user
// with the service client — never trusted from the request body.
//
// ── HOW THE ROLE AND MUNICIPALITY REACH app_user ──
//
// Explicitly, by a second write, and read back before the call is reported
// as a success. The first version of this function relied on the account's
// APP metadata alone: handle_new_user (0117) reads `app_role` and
// `municipality_id` from raw_app_meta_data when the auth row is inserted, and
// migration 0118's probe — which INSERTED an auth row with the metadata
// already on it — passed. GoTrue does not work that way: the admin API inserts
// the row first and applies the caller's app_metadata afterwards, so the
// AFTER INSERT trigger saw `{provider, providers}` and shaped the account as
// a participant with no municipality. The read-back below is what caught it,
// on the first real call. The metadata is still set, so the row documents
// what it was created as; the trigger stays as a default for rows created
// with metadata present (probes, fixtures); this function does not depend on
// either.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ROLES = ["coordinator", "data_entry", "enumerator", "partner_viewer", "super_admin"] as const;
type Role = (typeof ROLES)[number];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, result: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return json({ ok: false, result: "misconfigured" }, 500);

  // Who is asking. The JWT comes from the browser; the role does not.
  const authorization = req.headers.get("Authorization") ?? "";
  const asCaller = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: { user: caller } } = await asCaller.auth.getUser();
  if (!caller) return json({ ok: false, result: "not_signed_in" }, 401);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: me } = await admin
    .from("app_user")
    .select("role, is_active")
    .eq("id", caller.id)
    .maybeSingle();
  if (!me || !me.is_active || me.role !== "super_admin") {
    return json({ ok: false, result: "not_permitted" }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, result: "bad_request" }, 400);
  }

  // ── create ──────────────────────────────────────────────────────────────
  if (body.action === "create") {
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const fullName = String(body.full_name ?? "").trim();
    const role = String(body.role ?? "") as Role;
    const municipalityId = body.municipality_id ? String(body.municipality_id) : null;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, result: "bad_email" }, 400);
    if (password.length < 12) return json({ ok: false, result: "password_too_short" }, 400);
    if (!fullName) return json({ ok: false, result: "name_required" }, 400);
    if (!ROLES.includes(role)) return json({ ok: false, result: "bad_role" }, 400);

    // The same rule as app_user_municipality_by_role (0117), stated here so
    // the refusal is readable instead of a constraint name.
    if (role === "super_admin" && municipalityId) return json({ ok: false, result: "super_admin_has_no_municipality" }, 400);
    if (role !== "super_admin" && !municipalityId) return json({ ok: false, result: "municipality_required" }, 400);

    if (municipalityId) {
      const { data: muni } = await admin
        .from("municipality")
        .select("id")
        .eq("id", municipalityId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .maybeSingle();
      if (!muni) return json({ ok: false, result: "unknown_municipality" }, 400);
    }

    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
      app_metadata: { app_role: role, municipality_id: municipalityId },
    });
    if (error || !created.user) {
      const msg = error?.message ?? "";
      const result = /already|exists|registered/i.test(msg) ? "email_taken" : "create_failed";
      return json({ ok: false, result, detail: msg }, 400);
    }

    // handle_new_user has made an app_user row by now (participant, no
    // municipality — see the header). Shape it, as the service role, which
    // guard_app_user (0117) admits because it carries no auth.uid().
    const { error: shapeError } = await admin
      .from("app_user")
      .update({ role, municipality_id: municipalityId, full_name: fullName })
      .eq("id", created.user.id);
    if (shapeError) {
      return json({ ok: false, result: "app_user_update_failed", user_id: created.user.id, detail: shapeError.message }, 500);
    }

    // Read back. Not assumed.
    const { data: row } = await admin
      .from("app_user")
      .select("id, role, municipality_id, is_active")
      .eq("id", created.user.id)
      .maybeSingle();
    if (!row || row.role !== role || (row.municipality_id ?? null) !== municipalityId || !row.is_active) {
      return json({ ok: false, result: "app_user_mismatch", user_id: created.user.id, app_user: row }, 500);
    }
    return json({ ok: true, result: "created", user_id: created.user.id });
  }

  // ── set_email ───────────────────────────────────────────────────────────
  //
  // An account's email lives in TWO places: auth.users (GoTrue's own, with a
  // copy inside auth.identities' identity_data) and public.app_user.email,
  // which handle_new_user copies at creation and nothing keeps in step
  // afterwards. So this writes both, app_user second, and reports the pair it
  // read back -- a change that moved one and not the other would leave the
  // account signing in under one address and listed under the other.
  //
  // Through the admin API rather than SQL for the reason in this file's
  // header: 0030 wrote auth.users by hand and GoTrue could not read the rows.
  if (body.action === "set_email") {
    const userId = String(body.user_id ?? "");
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!userId) return json({ ok: false, result: "user_required" }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, result: "bad_email" }, 400);

    const { data: target } = await admin.from("app_user").select("id").eq("id", userId).maybeSingle();
    if (!target) return json({ ok: false, result: "not_found" }, 404);

    const taken = await admin.from("app_user").select("id").eq("email", email).neq("id", userId).maybeSingle();
    if (taken.data) return json({ ok: false, result: "email_taken" }, 409);

    // email_confirm keeps the address usable immediately; without it GoTrue
    // parks the new address in email_change and the account goes on signing
    // in under the old one, which is the failure this action exists to avoid.
    const { error } = await admin.auth.admin.updateUserById(userId, { email, email_confirm: true });
    if (error) return json({ ok: false, result: "update_failed", detail: error.message }, 400);

    const { error: rowError } = await admin.from("app_user").update({ email }).eq("id", userId);
    if (rowError) return json({ ok: false, result: "row_update_failed", detail: rowError.message }, 400);

    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    const { data: row } = await admin.from("app_user").select("email").eq("id", userId).maybeSingle();
    if (authUser?.user?.email !== email || row?.email !== email) {
      return json({ ok: false, result: "read_back_mismatch", auth: authUser?.user?.email ?? null, row: row?.email ?? null }, 500);
    }
    return json({ ok: true, result: "email_set", email });
  }

  // ── set_password ────────────────────────────────────────────────────────
  if (body.action === "set_password") {
    const userId = String(body.user_id ?? "");
    const password = String(body.password ?? "");
    if (!userId) return json({ ok: false, result: "user_required" }, 400);
    if (password.length < 12) return json({ ok: false, result: "password_too_short" }, 400);

    const { data: target } = await admin.from("app_user").select("id").eq("id", userId).maybeSingle();
    if (!target) return json({ ok: false, result: "not_found" }, 404);

    const { error } = await admin.auth.admin.updateUserById(userId, { password });
    if (error) return json({ ok: false, result: "update_failed", detail: error.message }, 400);
    return json({ ok: true, result: "password_set" });
  }

  return json({ ok: false, result: "bad_action" }, 400);
});
