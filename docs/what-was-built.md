# What Was Built

## Backend architecture

- Modular Node.js + TypeScript backend with tenant-aware request context.
- Separation by modules (auth, comanda, billing, subscriptions, integrations).

## Retry system

- Push attempts are tracked and monitored.
- Failed attempts can be retried with queue-based reliability.

## Multi-tenant SaaS

- Tenant-scoped data and API access.
- Tenant onboarding flow with API key management.

## RBAC

- Role-based access with OWNER, ADMIN, MODERATOR, USER.
- Protected actions for sensitive operations like settings and role updates.

## Billing (Stripe)

- Subscription-ready billing flow and checkout support.
- Plan and status visibility in dashboard billing page.

## Dashboard

- Overview, Orders, Push Attempts, Settings, Users & Roles, Billing, Onboarding.
- Polished UI with loading states, empty states, badges, and toasts.

## Demo mode

- Frontend demo mode uses realistic mock data without requiring live marketplace integrations.
- Allows complete end-to-end client presentation flow.
