import "dotenv/config";

type RequiredTwilio = {
  sid: string;
  token: string;
  from: string;
  to: string;
};

function requireTwilioConfig(): RequiredTwilio {
  const sid = process.env.TWILIO_ACCOUNT_SID ?? "";
  const token = process.env.TWILIO_AUTH_TOKEN ?? "";
  const from = process.env.TWILIO_WHATSAPP_FROM ?? "";
  const to = process.env.TWILIO_WHATSAPP_TO ?? "";
  const missing = [
    ["TWILIO_ACCOUNT_SID", sid],
    ["TWILIO_AUTH_TOKEN", token],
    ["TWILIO_WHATSAPP_FROM", from],
    ["TWILIO_WHATSAPP_TO", to],
  ]
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length > 0) {
    throw new Error(`Missing required Twilio env vars: ${missing.join(", ")}`);
  }
  return { sid, token, from, to };
}

function mask(value: string): string {
  if (value.length <= 6) return "***";
  return `${value.slice(0, 4)}...${value.slice(-2)}`;
}

async function main(): Promise<void> {
  try {
    const cfg = requireTwilioConfig();
    const enabled = process.env.TWILIO_ENABLED === "true";
    if (!enabled) {
      console.warn("TWILIO_ENABLED=false. Proceeding because this is an explicit test command.");
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${cfg.sid}/Messages.json`;
    const params = new URLSearchParams({
      From: cfg.from,
      To: cfg.to,
      Body: "OrderFlow integration test message (Twilio WhatsApp Sandbox).",
    });

    console.log(`Sending Twilio WhatsApp test message from ${cfg.from} to ${mask(cfg.to)}...`);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${cfg.sid}:${cfg.token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    const body = (await response.json()) as { sid?: string; message?: string; code?: number };
    if (!response.ok) {
      throw new Error(`Twilio API error (${response.status}): ${body.message ?? "unknown error"}`);
    }

    console.log(`Twilio test message queued successfully. Message SID: ${body.sid ?? "unknown"}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error(`Twilio WhatsApp test failed: ${message}`);
    process.exitCode = 1;
  }
}

void main();
