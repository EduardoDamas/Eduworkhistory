# Integration Testing Setup (iFood + Twilio Sandbox)

This guide prepares local integration testing for marketplace flows using iFood credentials and Twilio WhatsApp Sandbox.

## Required local services

- PostgreSQL
- Redis
- Backend API (`npm run dev`)
- Worker (`npm run dev:worker`)
- Frontend (`cd frontend && npm run dev`)

## Boot sequence

```bash
npm install
npx prisma migrate deploy
npm run dev
npm run dev:worker
cd frontend && npm run dev
```

## Environment setup

1. Copy `.env.example` to `.env`.
2. Fill iFood and Twilio values in `.env` only.
3. Keep all secrets local and never commit `.env`.

### Feature flags

- `IFOOD_ENABLED=true|false`
- `TWILIO_ENABLED=true|false`
- `MARKETPLACE_TEST_MODE=true|false`

## Twilio WhatsApp Sandbox

Each tenant should configure its own Twilio credentials using `/whatsapp/accounts`:

```bash
curl -sS -X POST http://localhost:3000/whatsapp/accounts \
  -H "content-type: application/json" \
  -H "x-api-key: API_KEY" \
  -d '{
    "accountSid":"ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "authToken":"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "whatsappFrom":"whatsapp:+5511999999999",
    "sandboxJoinCode":"burn-apart",
    "isActive":true
  }'
```

Tenant credentials are used first. Global `TWILIO_*` env vars are fallback for local/dev only.

1. From the tester WhatsApp number, send:
   - `join burn-apart`
2. Send this message to Twilio sandbox number:
   - `+1 415 523 8886`
3. Configure Twilio inbound webhook URL:
   - `POST https://<public-domain>/webhooks/twilio/whatsapp`

### Public HTTPS requirement

Twilio cannot hit `localhost` directly. Use a public HTTPS tunnel (for example ngrok) to expose your local backend.

## iFood testing

iFood live validation requires official OAuth/API access and approved app credentials from iFood.

Use:

```bash
npm run test:ifood-auth
```

If no official OAuth token URL is configured, the command prints:

`iFood credentials are configured, but official OAuth endpoint/base URL must be confirmed before live validation.`

## Utility commands

Twilio outbound test message:

```bash
npm run test:twilio-whatsapp
```

iFood auth check:

```bash
npm run test:ifood-auth
```

## Security note

- Do not hardcode secrets in source code.
- Do not commit `.env`.
- Rotate all client-provided test tokens/secrets before production go-live.
