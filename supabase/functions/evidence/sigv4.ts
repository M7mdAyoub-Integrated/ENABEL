// AWS Signature Version 4, query-string ("presigned URL") form, for an
// S3-compatible store. Cloudflare R2 speaks S3 with region `auto`.
//
// Hand-written rather than an SDK because the whole of it is forty lines of
// hashing, and a dependency that pulls the AWS SDK into an Edge Function for
// four calls (PUT, HEAD, GET, DELETE) is not worth its cold start. It is
// tested against the vector AWS publishes for exactly this form — see
// supabase/functions/evidence/sigv4.test.mjs — so the arithmetic is checked,
// not trusted.
//
// Only `host` is signed. The browser sets Content-Type on its PUT and R2
// accepts it unsigned; the size is verified afterwards from the store (see
// index.ts, storedSize), which is the check that matters.

const enc = new TextEncoder();

async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", enc.encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmac(key: ArrayBuffer | Uint8Array, s: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey("raw", key as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", k, enc.encode(s));
}

/** RFC 3986 encoding, which is what SigV4 wants and what encodeURIComponent almost is. */
export function rfc3986(s: string): string {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

/** A path, segment by segment, with the slashes kept. */
export function canonicalPath(path: string): string {
  return path.split("/").map(rfc3986).join("/");
}

export type PresignInput = {
  method: "GET" | "PUT" | "HEAD" | "DELETE";
  host: string;
  /** The raw (unencoded) path, starting with `/`. Encoded here. */
  path: string;
  region: string;
  service?: string;
  accessKeyId: string;
  secretAccessKey: string;
  expiresSeconds: number;
  /** Extra query parameters, unencoded; encoded and sorted here. */
  query?: Record<string, string>;
  /** Injectable for the test vector. Defaults to now. */
  now?: Date;
  scheme?: "https" | "http";
};

export async function presign(input: PresignInput): Promise<string> {
  const service = input.service ?? "s3";
  const now = input.now ?? new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z"); // 20130524T000000Z
  const date = amzDate.slice(0, 8);
  const scope = `${date}/${input.region}/${service}/aws4_request`;

  const params: Record<string, string> = {
    ...(input.query ?? {}),
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${input.accessKeyId}/${scope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(input.expiresSeconds),
    "X-Amz-SignedHeaders": "host",
  };
  const canonicalQuery = Object.keys(params)
    .map((k) => [rfc3986(k), rfc3986(params[k]!)] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  const canonicalRequest = [
    input.method,
    canonicalPath(input.path),
    canonicalQuery,
    `host:${input.host}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, await sha256Hex(canonicalRequest)].join("\n");

  let key: ArrayBuffer = await hmac(enc.encode("AWS4" + input.secretAccessKey), date);
  key = await hmac(key, input.region);
  key = await hmac(key, service);
  key = await hmac(key, "aws4_request");
  const sig = [...new Uint8Array(await hmac(key, stringToSign))].map((b) => b.toString(16).padStart(2, "0")).join("");

  return `${input.scheme ?? "https"}://${input.host}${canonicalPath(input.path)}?${canonicalQuery}&X-Amz-Signature=${sig}`;
}
