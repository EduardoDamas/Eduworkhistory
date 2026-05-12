import "dotenv/config";
import https from "node:https";
import { URL } from "node:url";

const IPV4_AGENT = new https.Agent({ family: 4 });

const MAX_ERROR_BODY_CHARS = 2000;

function configured(): {
  clientId: string;
  clientSecret: string;
  merchantId: string;
  tokenUrl: string;
} {
  return {
    clientId: process.env.IFOOD_CLIENT_ID ?? "",
    clientSecret: process.env.IFOOD_CLIENT_SECRET ?? "",
    merchantId: process.env.IFOOD_MERCHANT_ID ?? "",
    tokenUrl: process.env.IFOOD_OAUTH_TOKEN_URL ?? "",
  };
}

function postFormHttps(
  tokenUrl: string,
  formBody: string,
): Promise<{ statusCode: number; rawBody: string }> {
  const url = new URL(tokenUrl);
  if (url.protocol !== "https:") {
    return Promise.reject(new Error("IFOOD_OAUTH_TOKEN_URL must use https"));
  }

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method: "POST",
        agent: IPV4_AGENT,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0",
          "Content-Length": Buffer.byteLength(formBody, "utf8"),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        res.on("end", () => {
          const rawBody = Buffer.concat(chunks).toString("utf8");
          resolve({ statusCode: res.statusCode ?? 0, rawBody });
        });
      },
    );

    req.on("error", reject);
    req.setTimeout(60_000, () => {
      req.destroy();
      reject(new Error("ETIMEDOUT"));
    });
    req.write(formBody);
    req.end();
  });
}

function safeBodySnippet(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length <= MAX_ERROR_BODY_CHARS) return trimmed;
  return `${trimmed.slice(0, MAX_ERROR_BODY_CHARS)}… (truncated)`;
}

function main(): void {
  const cfg = configured();
  const missingCore = [
    ["IFOOD_CLIENT_ID", cfg.clientId],
    ["IFOOD_CLIENT_SECRET", cfg.clientSecret],
    ["IFOOD_MERCHANT_ID", cfg.merchantId],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingCore.length > 0) {
    console.error(`iFood auth test failed: missing required env vars: ${missingCore.join(", ")}`);
    process.exitCode = 1;
    return;
  }

  if (!cfg.tokenUrl) {
    console.log(
      "iFood credentials are configured, but official OAuth endpoint/base URL must be confirmed before live validation.",
    );
    return;
  }

  const formBody = new URLSearchParams({
    grantType: "client_credentials",
    clientId: cfg.clientId,
    clientSecret: cfg.clientSecret,
  }).toString();

  void postFormHttps(cfg.tokenUrl, formBody)
    .then(({ statusCode, rawBody }) => {
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(rawBody) as Record<string, unknown>;
      } catch {
        // non-JSON response
      }

      const accessToken =
        (typeof parsed.accessToken === "string" && parsed.accessToken) ||
        (typeof parsed.access_token === "string" && parsed.access_token) ||
        "";

      if (statusCode === 400 || statusCode === 401 || statusCode === 403) {
        console.error(`iFood auth validation failed: HTTP ${statusCode}`);
        console.error(safeBodySnippet(rawBody));
        process.exitCode = 1;
        return;
      }

      if (statusCode < 200 || statusCode >= 300) {
        console.error(`iFood auth validation failed: HTTP ${statusCode}`);
        console.error(safeBodySnippet(rawBody));
        process.exitCode = 1;
        return;
      }

      if (!accessToken) {
        console.log("iFood endpoint responded, but no accessToken was returned. Validate payload/contract with iFood.");
        console.error(safeBodySnippet(rawBody));
        process.exitCode = 1;
        return;
      }

      const tokenType =
        (typeof parsed.tokenType === "string" && parsed.tokenType) ||
        (typeof parsed.token_type === "string" && parsed.token_type) ||
        "(unknown)";
      const expiresIn =
        typeof parsed.expiresIn === "number"
          ? parsed.expiresIn
          : typeof parsed.expires_in === "number"
            ? parsed.expires_in
            : "(unknown)";

      console.log("iFood auth validation succeeded");
      console.log(`token type: ${tokenType}`);
      console.log(`expiresIn: ${expiresIn}`);
      console.log("accessTokenConfigured: true");
    })
    .catch((err: unknown) => {
      const code = err && typeof err === "object" && "code" in err ? String((err as { code?: string }).code) : "";
      const message = err instanceof Error ? err.message : String(err);

      if (code === "ETIMEDOUT" || message === "ETIMEDOUT") {
        console.error(
          "Network timeout reaching iFood. Try forcing IPv4 or testing from another network.",
        );
        process.exitCode = 1;
        return;
      }

      console.error(`iFood auth test failed: ${message}`);
      process.exitCode = 1;
    });
}

main();
