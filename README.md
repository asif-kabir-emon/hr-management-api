# HR Management API

Production-oriented NestJS backend for a modern HR management platform.

## Core design

- PostgreSQL stores transactional HR data such as employees, departments, attendance, leave, and access control.
- MongoDB stores audit logs and future event/activity streams that benefit from flexible document storage.
- JWT authentication and dynamic permission-based authorization are included as the security baseline.
- Global validation, Zod-based configuration validation, versioned APIs, and Swagger are enabled for production readiness.

## Documentation

- API reference: [`docs/api-reference.md`](./docs/api-reference.md)
- Auth internals: [`docs/auth-service.md`](./docs/auth-service.md)
- Docs index: [`docs/README.md`](./docs/README.md)

## Initial domain modules

- `auth`: user registration, login, and per-user permission claims
- `departments`: team structure and ownership
- `employees`: employee profiles and employment metadata
- `attendance`: clock-in and clock-out records
- `leave`: leave requests and approval flow
- `audit`: immutable audit/event log documents in MongoDB

## Suggested roadmap

1. Add migrations and seeders.
2. Add refresh tokens and password reset flows.
3. Move permissions to dedicated role and policy tables with admin-managed assignments.
4. Add payroll, recruitment, asset management, performance reviews, and document storage.
5. Add background jobs, notifications, reporting, tenant isolation, automated tests, and CI/CD.

## Local setup

```bash
npm install
cp .env.example .env
npm run start:dev
```

## Recommended next production steps

- Replace `synchronize: true` with migrations before deploying.
- Store secrets in a secret manager.
- Add request logging, tracing, and audit enrichment from authenticated user context.
- Introduce Redis for caching, queues, and distributed locks where required.
