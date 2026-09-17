# Cognisafe-Q

Cognisafe-Q is an Expo mobile safety companion that monitors active trips, detects abnormal motion, and escalates to a driver's emergency response circle when they cannot check in.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/cognisafe-q/app/` — Expo Router screens for Home, live trip, history, contacts, and settings.
- `artifacts/cognisafe-q/components/TripContext.tsx` — shared trip state, sensor/location capture, escalation flow, and AsyncStorage persistence.
- `artifacts/cognisafe-q/components/AppPrimitives.tsx` — shared mobile UI primitives.
- `artifacts/cognisafe-q/constants/colors.ts` — Cognisafe-Q semantic palette.

## Architecture decisions

- The first mobile build is local-first: contacts and completed trips persist with AsyncStorage so the core experience is usable before a gateway URL is configured.
- Native accelerometer, gyroscope, and foreground location are used during active trips; the web preview keeps the UI functional without pretending browser sensor access is available.
- Prediction and alert calls are isolated behind an optional `EXPO_PUBLIC_API_GATEWAY_URL`; local motion thresholds still provide a fail-safe alert path when the network is unavailable.
- The response countdown is part of the shared trip state so Home, the live screen, and history stay consistent.

## Product

- Glanceable safety status and start/stop trip monitoring.
- Live trip speed, elapsed time, distance, manual SOS, and check-in countdown.
- Local trip history with event timelines and safety summaries.
- Trusted emergency contacts with add, edit, and remove flows.
- Emergency-services preference, countdown timing, and device-permission status.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `expo-sensors` is required for native motion monitoring and is pinned to the Expo SDK 57 line.
- `EXPO_PUBLIC_API_GATEWAY_URL` is optional for the local-first MVP; when present it should point at the existing `/predict`, `/alert`, and `/contacts` backend routes.
- Expo preview is managed by the `artifacts/cognisafe-q: expo` workflow; do not start Metro with a bare root command.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
