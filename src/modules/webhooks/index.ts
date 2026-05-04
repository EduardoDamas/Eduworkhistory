/**
 * Webhook handlers (future phase) must:
 * 1) validate signature / payload shape
 * 2) persist raw inbound_events (idempotent unique keys)
 * 3) enqueue BullMQ job
 * 4) return <500ms (no heavy processing in-controller)
 */
export const webhooks = {};
