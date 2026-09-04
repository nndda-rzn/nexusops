# NexusOps

> Enterprise Integrated Operations Platform untuk Konglomerat Logistik Multimoda

NexusOps adalah platform operasi terintegrasi untuk mengelola transportasi multimoda, shipment, container, terminal, yard, warehouse, fleet, maintenance, workforce, serta planning dan optimization dalam satu sistem.

Dirancang untuk konglomerat logistik yang menaungi banyak entitas moda (pelayaran, kereta, penerbangan, trucking, warehouse) dengan satu Holding sebagai pusat koordinasi operasional.

---

## Tech Stack

| Layer | Stack |
|---|---|
| Frontend | SvelteKit, Svelte 5, TypeScript, Bun, Tailwind CSS, MapLibre GL JS |
| Backend | ElysiaJS, TypeScript, Bun, Drizzle ORM |
| Database | PostgreSQL, PostGIS |
| Async & Realtime | Redis, Redis Streams |
| Storage | MinIO (dev), S3-compatible (prod) |
| Compute | Python, OR-Tools, NetworkX, Pandas, GeoPandas |
| Observability | OpenTelemetry, Prometheus, Grafana |
| Infrastructure | Docker, Docker Compose, Nginx |

---

## Monorepo Structure

```
nexusops/
├── apps/
│   ├── web/        ← SvelteKit frontend
│   ├── api/        ← ElysiaJS backend
│   └── compute/    ← Python compute engine
├── packages/
│   ├── ui/             ← shared UI components
│   ├── api-contracts/  ← shared REST + realtime types
│   ├── design-tokens/  ← design system tokens
│   └── tooling/        ← shared ESLint, TypeScript config
├── infrastructure/
│   ├── docker/
│   ├── postgres/
│   ├── redis/
│   ├── minio/
│   ├── nginx/
│   └── observability/
├── compose.yaml
└── package.json
```

---

## Prerequisites

```
Bun >= 1.1.0
Docker >= 24.0
Docker Compose >= 2.0
Python >= 3.12
Git >= 2.40
```

## Quick Start

```bash
# Install dependencies
bun install

# Setup environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/compute/.env.example apps/compute/.env

# Start infrastructure
docker compose up -d postgres redis minio

# Apply migrations
bun run db:migrate

# Start development
bun run dev
```

## Access

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4000 |
| API Docs | http://localhost:4000/swagger |
| MinIO Console | http://localhost:9001 |

---

## Development

```bash
bun run dev          # start semua apps
bun run test         # run semua tests
bun run lint         # lint semua
bun run typecheck    # type check semua
bun run db:migrate   # apply migrations
bun run db:studio    # open Drizzle Studio
```

---

*NexusOps — Built with Bun, ElysiaJS, SvelteKit, PostgreSQL, Redis, Python*
