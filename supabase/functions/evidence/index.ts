// evidence — the one thing that holds the R2 credentials.
//
// ── WHAT IT DOES ──
//
// Evidence files live in a Cloudflare R2 bucket (migration 0128 says why the
// row stores a bucket and a key and never a URL). The browser never holds an
// R2 key. It asks here for a presigned PUT, uploads, and asks here again to
// confirm; this function checks the object is really there and is the size
// the browser said, then inserts the `attachment` row AS THE USER — with the
// caller's own JWT, so RLS, guard_soft_delete, the audit trigger's actor and
// the column defaults all behave exactly as they do for every other table.
// Nothing about who may attach evidence to what is decided here; the
// database decides, and this function relays the refusal with its words.
//
//   presign_upload  can the caller see the record and write? is the file
//                   within the per-file limit? would it take the total past
//                   the quota? then a PUT URL, ten minutes
//   confirm         HEAD the object (exists? the declared size?), insert the
//                   row as the user; if the row is refused, DELETE the object
//                   so the bucket never holds a file no row points at
//   download        the row as the user (RLS), then a GET URL, sixty seconds,
//                   with the file's own name and type
//   remove          soft-delete the row as the user (RLS + guard_soft_delete,
//                   a coordinator's), counting the rows that came back, then
//                   DELETE the object
//
// ── THE LIMITS ARE CHECKED HERE AND ENFORCED IN THE DATABASE ──
//
// 1 MB per file and 9 GB in total. This function refuses early so no bytes
// move for a file that cannot be recorded; the check constraint and the
// quota trigger (0128) are the stop. A function can be redeployed without
// its checks; the database cannot.
//
// ── CONFIGURATION ──
//
// Four Edge Function secrets, set in the Supabase dashboard (never in git):
//
//   R2_ACCOUNT_ID          the Cloudflare account id (the host is
//                          <account>.r2.cloudflarestorage.com)
//   R2_ACCESS_KEY_ID       an R2 API token's key id, Object Read & Write on
//                          this one bucket
//   R2_SECRET_ACCESS_KEY   its secret
//   R2_BUCKET              the bucket name, e.g. shm-me-evidence
//
// and a CORS rule on the bucket allowing PUT from the app's origin(s), with
// the Content-Type header — the browser PUTs straight to R2. Until the
// secrets are set every call answers `r2_not_configured` naming the missing
// ones, and the screen says so.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { presign } from "./sigv4.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

// The same list as attachment_entity_type_known (0128). Checked here so the
// query below is over a known table name and never over a string from the
// request.
const ENTITY_TABLES = new Set([
  "training_session", "training_enrolment", "exhibition", "exhibition_registration",
  "partnership", "production_initiative", "followup_survey", "coordination_meeting",
  "office_service", "guidance_record", "mentorship_session", "advisory_session",
  "milestone", "case_study",
  "rmth_event", "rmth_proposal", "rmth_training_programme", "rmth_training_cycle",
  "rmth_training_enrolment", "rmth_project_implementer", "rmth_incubator",
  "rmth_enterprise", "rmth_incubation_service", "rmth_outcome_survey",
]);
const KINDS = new Set(["photo", "document", "other"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const UPLOAD_URL_SECONDS = 600;
const DOWNLOAD_URL_SECONDS = 60;

type R2 = { accountId: string; accessKeyId: string; secretAccessKey: string; bucket: string; host: string };

function r2Config(): { ok: true; r2: R2 } | { ok: false; missing: string[] } {
  const names = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"] as const;
  const missing = names.filter((n) => !Deno.env.get(n));
  if (missing.length) return { ok: false, missing };
  const accountId = Deno.env.get("R2_ACCOUNT_ID")!;
  return {
    ok: true,
    r2: {
      accountId,
      accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID")!,
      secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY")!,
      bucket: Deno.env.get("R2_BUCKET")!,
      host: `${accountId}.r2.cloudflarestorage.com`,
    },
  };
}

function objectUrl(r2: R2, method: "GET" | "PUT" | "HEAD" | "DELETE", key: string, seconds: number, query?: Record<string, string>) {
  return presign({
    method,
    host: r2.host,
    path: `/${r2.bucket}/${key}`,
    region: "auto",
    accessKeyId: r2.accessKeyId,
    secretAccessKey: r2.secretAccessKey,
    expiresSeconds: seconds,
    ...(query ? { query } : {}),
  });
}

/** A file name that is safe in a key: word characters, dot, dash, parentheses, space, Arabic. */
function safeName(name: string): string {
  const s = name.replace(/[^\w.\-() ؀-ۿ]+/g, "_").replace(/\s+/g, " ").trim().slice(0, 120);
  return s || "file";
}

async function deleteObject(r2: R2, key: string): Promise<boolean> {
  try {
    const res = await fetch(await objectUrl(r2, "DELETE", key, 60), { method: "DELETE" });
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, result: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) return json({ ok: false, result: "misconfigured" }, 500);

  // Who is asking. Every database call below is made as this user: RLS is
  // the permission check, here as everywhere.
  const authorization = req.headers.get("Authorization") ?? "";
  const asUser = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return json({ ok: false, result: "not_signed_in" }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, result: "bad_request" }, 400);
  }
  const action = String(body.action ?? "");

  const cfg = r2Config();
  if (!cfg.ok) return json({ ok: false, result: "r2_not_configured", missing: cfg.missing }, 503);
  const r2 = cfg.r2;

  // ── presign_upload ─────────────────────────────────────────────────────
  if (action === "presign_upload") {
    const entityType = String(body.entity_type ?? "");
    const entityId = String(body.entity_id ?? "");
    const fileName = safeName(String(body.file_name ?? ""));
    const sizeBytes = Number(body.size_bytes);
    if (!ENTITY_TABLES.has(entityType) || !UUID.test(entityId)) return json({ ok: false, result: "bad_request" }, 400);
    if (!Number.isInteger(sizeBytes) || sizeBytes <= 0) return json({ ok: false, result: "bad_request" }, 400);

    // The record, as the user. Invisible means either not there or not
    // theirs; both are `not_found` to them, and neither gets a URL.
    const { data: rec, error: recErr } = await asUser.from(entityType).select("municipality_id").eq("id", entityId).maybeSingle();
    if (recErr) return json({ ok: false, result: "not_permitted", detail: recErr.message }, 403);
    if (!rec) return json({ ok: false, result: "not_found" }, 404);
    const municipalityId = String((rec as { municipality_id: string }).municipality_id);

    const { data: canWrite } = await asUser.rpc("can_write");
    if (canWrite !== true) return json({ ok: false, result: "not_permitted" }, 403);

    // The limits, early, so no bytes move for a file that cannot be recorded.
    const { data: usage, error: usageErr } = await asUser.rpc("evidence_usage");
    if (usageErr || !usage) return json({ ok: false, result: "not_permitted", detail: usageErr?.message }, 403);
    const u = usage as { used_bytes: number; quota_bytes: number; file_limit_bytes: number };
    if (sizeBytes > u.file_limit_bytes) {
      return json({ ok: false, result: "file_too_large", size_bytes: sizeBytes, file_limit_bytes: u.file_limit_bytes }, 413);
    }
    if (u.used_bytes + sizeBytes > u.quota_bytes) {
      return json({ ok: false, result: "quota_exceeded", used_bytes: u.used_bytes, quota_bytes: u.quota_bytes, size_bytes: sizeBytes }, 507);
    }

    const key = `${municipalityId}/${entityType}/${entityId}/${crypto.randomUUID()}-${fileName}`;
    const put = await objectUrl(r2, "PUT", key, UPLOAD_URL_SECONDS);
    return json({ ok: true, key, bucket: r2.bucket, url: put, expires_in: UPLOAD_URL_SECONDS });
  }

  // ── confirm ────────────────────────────────────────────────────────────
  if (action === "confirm") {
    const key = String(body.key ?? "");
    const entityType = String(body.entity_type ?? "");
    const entityId = String(body.entity_id ?? "");
    const fileName = String(body.file_name ?? "").trim().slice(0, 200);
    const mimeType = body.mime_type ? String(body.mime_type).slice(0, 120) : null;
    const sizeBytes = Number(body.size_bytes);
    const originalSizeBytes = Number(body.original_size_bytes);
    const contentKind = String(body.content_kind ?? "");
    if (!ENTITY_TABLES.has(entityType) || !UUID.test(entityId) || !KINDS.has(contentKind) || !fileName) {
      return json({ ok: false, result: "bad_request" }, 400);
    }
    // The key must be one this function would have issued for this record.
    const keyPrefixRe = new RegExp(`^[0-9a-f-]{36}/${entityType}/${entityId}/[0-9a-f-]{36}-`);
    if (!keyPrefixRe.test(key) || key.includes("..")) return json({ ok: false, result: "bad_request" }, 400);

    // Is the object there, and is it the size that was declared? The
    // browser's word for the size is not taken: Content-Length from R2 is.
    const head = await fetch(await objectUrl(r2, "HEAD", key, 60), { method: "HEAD" });
    if (head.status === 404) return json({ ok: false, result: "object_missing" }, 409);
    if (!head.ok) return json({ ok: false, result: "store_unreachable", status: head.status }, 502);
    const actual = Number(head.headers.get("content-length"));
    if (!Number.isInteger(actual) || actual !== sizeBytes) {
      await deleteObject(r2, key);
      return json({ ok: false, result: "size_mismatch", declared: sizeBytes, stored: actual }, 409);
    }

    // The row, as the user. Everything the database refuses comes back here
    // with its own words; the object is removed again in every such case.
    const { data: row, error } = await asUser
      .from("attachment")
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        bucket: r2.bucket,
        object_key: key,
        file_name: fileName,
        mime_type: mimeType,
        size_bytes: actual,
        original_size_bytes: Number.isInteger(originalSizeBytes) && originalSizeBytes > 0 ? originalSizeBytes : actual,
        content_kind: contentKind,
      })
      .select("id")
      .maybeSingle();
    if (error || !row) {
      const deleted = await deleteObject(r2, key);
      const code = error?.code ?? "";
      const msg = error?.message ?? "";
      const result =
        code === "53100" ? "quota_exceeded"
        : /attachment_size_within_limit/.test(msg) ? "file_too_large"
        : code === "42501" || /row-level security/i.test(msg) ? "not_permitted"
        : !error ? "not_permitted" // RLS filtered the insert: zero rows, no error
        : "insert_refused";
      return json({ ok: false, result, code, message: msg, object_deleted: deleted }, result === "not_permitted" ? 403 : 409);
    }
    return json({ ok: true, id: (row as { id: string }).id, key, size_bytes: actual });
  }

  // ── download ───────────────────────────────────────────────────────────
  if (action === "download") {
    const id = String(body.attachment_id ?? "");
    if (!UUID.test(id)) return json({ ok: false, result: "bad_request" }, 400);
    const { data: a, error } = await asUser
      .from("attachment")
      .select("bucket, object_key, file_name, mime_type")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) return json({ ok: false, result: "not_permitted", detail: error.message }, 403);
    if (!a) return json({ ok: false, result: "not_found" }, 404);
    const att = a as { bucket: string; object_key: string; file_name: string; mime_type: string | null };
    if (att.bucket !== r2.bucket) return json({ ok: false, result: "bucket_mismatch", bucket: att.bucket }, 409);
    // The name and type ride on the signed query so the browser opens the
    // file as what it is rather than as the uuid-prefixed key.
    const disposition = `inline; filename*=UTF-8''${encodeURIComponent(att.file_name)}`;
    const get = await objectUrl(r2, "GET", att.object_key, DOWNLOAD_URL_SECONDS, {
      "response-content-disposition": disposition,
      ...(att.mime_type ? { "response-content-type": att.mime_type } : {}),
    });
    return json({ ok: true, url: get, expires_in: DOWNLOAD_URL_SECONDS, file_name: att.file_name, mime_type: att.mime_type });
  }

  // ── remove ─────────────────────────────────────────────────────────────
  if (action === "remove") {
    const id = String(body.attachment_id ?? "");
    if (!UUID.test(id)) return json({ ok: false, result: "bad_request" }, 400);
    // A soft delete as the user: op_update admits staff of the municipality
    // and guard_soft_delete admits a coordinator. RLS filters rather than
    // refuses, so the rows that came back are counted (CLAUDE.md, the
    // seventh failure): zero rows is a refusal or an absence, told apart by
    // a plain read.
    const { data: rows, error } = await asUser
      .from("attachment")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .is("deleted_at", null)
      .select("bucket, object_key");
    if (error) {
      const msg = error.message;
      return json({ ok: false, result: /coordinator/i.test(msg) ? "coordinator_only" : "not_permitted", message: msg }, 403);
    }
    if (!rows || rows.length !== 1) {
      const { data: seen } = await asUser.from("attachment").select("id").eq("id", id).is("deleted_at", null).maybeSingle();
      return json({ ok: false, result: seen ? "not_permitted" : "not_found" }, seen ? 403 : 404);
    }
    const att = rows[0] as { bucket: string; object_key: string };
    // The row is gone from every list and from the quota already. If the
    // object cannot be removed now it is reported, not hidden: a leaked
    // object costs storage, and the settings screen's figure is the row
    // total, so it would go unnoticed otherwise.
    const objectDeleted = att.bucket === r2.bucket ? await deleteObject(r2, att.object_key) : false;
    return json({ ok: true, object_deleted: objectDeleted });
  }

  return json({ ok: false, result: "unknown_action" }, 400);
});
