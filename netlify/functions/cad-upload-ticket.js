const crypto = require("node:crypto");

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  },
  body: JSON.stringify(body),
});

const ALLOWED_TARGETS = new Set(["R12", "R2000", "R2007", "R2010", "R2013", "R2018"]);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { status: "ERROR", code: "METHOD_NOT_ALLOWED" });

  const siteOrigin = process.env.CAD_SITE_ORIGIN || "https://bauhaus.com.tw";
  if (event.headers.origin !== siteOrigin) return json(403, { status: "ERROR", code: "ORIGIN_DENIED" });

  const gatewayToken = process.env.CAD_INTAKE_GATEWAY_TOKEN || "";
  const intakeOrigin = (process.env.CAD_INTAKE_ORIGIN || "").replace(/\/$/, "");
  const clientSecret = process.env.CAD_CLIENT_KEY_SECRET || "";
  const localIntakeAllowed = process.env.CAD_ALLOW_LOCAL_INTAKE === "1"
    && /^http:\/\/127\.0\.0\.1:\d+\/cad-intake$/.test(intakeOrigin);
  if (
    gatewayToken.length < 32
    || clientSecret.length < 32
    || (!intakeOrigin.startsWith("https://") && !localIntakeAllowed)
  ) {
    return json(503, { status: "ERROR", code: "TEST_SERVICE_UNAVAILABLE" });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { status: "ERROR", code: "REQUEST_INVALID" });
  }
  const filename = String(payload.filename || "");
  const target = String(payload.target || "");
  const idempotencyKey = String(payload.idempotency_key || "");
  if (
    !ALLOWED_TARGETS.has(target)
    || !/^[^\\/\x00-\x1f]{1,255}\.(dwg|zip)$/i.test(filename)
    || idempotencyKey.length < 16
    || Buffer.byteLength(idempotencyKey, "utf8") > 128
  ) {
    return json(400, { status: "ERROR", code: "REQUEST_INVALID" });
  }

  const sourceAddress = String(
    event.headers["x-nf-client-connection-ip"]
      || event.headers["x-forwarded-for"]?.split(",")[0]
      || "unknown",
  ).trim();
  const clientKey = crypto.createHmac("sha256", clientSecret).update(sourceAddress).digest("hex");
  try {
    const response = await fetch(`${intakeOrigin}/v1/upload-tickets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${gatewayToken}`,
        "Content-Type": "application/json",
        Origin: siteOrigin,
      },
      body: JSON.stringify({
        filename,
        target,
        idempotency_key: idempotencyKey,
        client_key: clientKey,
      }),
      signal: AbortSignal.timeout(10000),
    });
    const result = await response.json().catch(() => ({ status: "ERROR", code: "UPSTREAM_INVALID" }));
    if (!response.ok) return json(response.status, result);
    return json(201, {
      status: "UPLOAD_TICKET_ISSUED",
      upload_ticket: result.upload_ticket,
      upload_url: `${intakeOrigin}/v1/jobs`,
      expires_at: result.expires_at,
      max_bytes: result.max_bytes,
    });
  } catch {
    return json(503, { status: "ERROR", code: "TEST_SERVICE_UNAVAILABLE" });
  }
};
