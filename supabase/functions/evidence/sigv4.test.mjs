// The presigner against the vector AWS publishes for the query-string form
// of Signature Version 4 ("Authenticating Requests: Using Query Parameters",
// the GET /test.txt example). If the arithmetic is right, the signature is
// the documented one; nothing else can pass this.
//
//   node supabase/functions/evidence/sigv4.test.mjs
//
// Plain Node (24+, which strips the types itself), no Deno: sigv4.ts uses
// only WebCrypto and TextEncoder, which both runtimes have.
const { presign } = await import("./sigv4.ts");

const url = await presign({
  method: "GET",
  host: "examplebucket.s3.amazonaws.com",
  path: "/test.txt",
  region: "us-east-1",
  accessKeyId: "AKIAIOSFODNN7EXAMPLE",
  secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  expiresSeconds: 86400,
  now: new Date("2013-05-24T00:00:00Z"),
});

const expected =
  "https://examplebucket.s3.amazonaws.com/test.txt?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20130524T000000Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host&X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404";

if (url !== expected) {
  console.error("sigv4: FAIL\n  got      " + url + "\n  expected " + expected);
  process.exit(1);
}

// A key with a space, a parenthesis and Arabic, as an evidence file name can
// have: every segment must be RFC 3986 encoded and the slashes kept.
const url2 = await presign({
  method: "PUT",
  host: "acct.r2.cloudflarestorage.com",
  path: "/bucket/00000000-0000-4000-8000-0000000000a1/rmth_event/x/كشف (1).jpg",
  region: "auto",
  accessKeyId: "k",
  secretAccessKey: "s",
  expiresSeconds: 600,
  now: new Date("2026-09-14T10:00:00Z"),
});
const path2 = new URL(url2).pathname;
if (path2 !== "/bucket/00000000-0000-4000-8000-0000000000a1/rmth_event/x/%D9%83%D8%B4%D9%81%20%281%29.jpg") {
  console.error("sigv4: FAIL — path encoding: " + path2);
  process.exit(1);
}
console.log("sigv4: OK — AWS query-string vector reproduced; path segments RFC 3986 encoded");
