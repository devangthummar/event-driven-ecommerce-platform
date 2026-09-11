# Event-Driven E-Commerce Platform

A microservices-based e-commerce platform built with Spring Boot, Apache Kafka, PostgreSQL, and Redis. Orders flow through an event-driven Saga pattern: **Order → Inventory → Payment → Order**, with independent notification consumption.

## Architecture

```
Client
  ↓ HTTP (JWT)
User Service (8006)
  ↓ Issues RS256 JWT
Client
  ↓ HTTP (JWT) + idempotency key
Order Service (8082)
  ↓ HTTP (product price lookup)
Product Service (8081)
  ↓ Kafka: order-events
Inventory Service (8084)
  ↓ Kafka: inventory-events
Order Service (8082)
  ↓ Kafka: payment-commands
Payment Service (8085)
  ↓ Kafka: payment-success-events / payment-failed-events
Order Service (8082)
  ↓ Kafka: order-cancelled-events (compensation)
Inventory Service (8084)

Notification Service (8086) ← Kafka: order-events (independent consumer)
```

## Microservices

| Service | Port | Database | Responsibility |
|---------|------|----------|---------------|
| user-service | 8006 | user_service_db | Registration, login, JWT generation (RS256) |
| product-service | 8081 | product_service_db | Product CRUD, Redis cache, ADMIN-only mutations |
| order-service | 8082 | order_service_db | Order creation, Saga orchestration, state machine |
| inventory-service | 8084 | inventory_db | Stock reservation, compensation, FOR UPDATE locking |
| payment-service | 8085 | payment_db | Wallet debit, payment idempotency, REQUIRES_NEW tx |
| notification-service | 8086 | (none) | Order confirmation emails via Kafka events |
| frontend | 3000 (80) | (none) | React/Vite SPA served by Nginx with API reverse proxy |

## Technology Stack

- **Java 17** / **Spring Boot 3.3.4**
- **Spring Data JPA** / Hibernate
- **PostgreSQL 15** — per-service databases
- **Apache Kafka** — event-driven inter-service communication
- **Redis 7** — product cache (product-service only)
- **Docker / Docker Compose** — containerized deployment
- **Maven** — build tool with Maven Wrapper per service
- **JWT (RS256)** — asymmetric authentication (private key signs, public key validates)

## Kafka Event Flow

```
Topics:
  order-events           → Inventory, Notification (consumers)
  inventory-events       → Order (consumer)
  payment-commands       → Payment (consumer)
  payment-success-events → Order (consumer)
  payment-failed-events  → Order (consumer)
  order-cancelled-events → Inventory (consumer)
```

### Event Types

| Event | Producer | Consumer(s) | Purpose |
|-------|----------|------------|---------|
| OrderCreatedEvent | Order | Inventory, Notification | Start saga |
| StockReservedEvent | Inventory | Order | Stock OK → trigger payment |
| StockReservationFailedEvent | Inventory | Order | Stock fail → cancel order |
| PaymentRequestEvent | Order | Payment | Request payment processing |
| PaymentSuccessEvent | Payment | Order | Payment OK → mark PAID |
| PaymentFailedEvent | Payment | Order | Payment fail → cancel + compensate |
| OrderCancelledEvent | Order | Inventory | Compensate: release reserved stock |

## Saga Flow

### Happy Path
1. **Order Created** → PENDING status → Kafka `order-events`
2. **Inventory** reserves stock for each item → Kafka `inventory-events`
3. **Order** receives StockReserved → stays PENDING → Kafka `payment-commands`
4. **Payment** debits wallet → Kafka `payment-success-events`
5. **Order** receives PaymentSuccess → PAID

### Failure: Insufficient Stock
1. Order Created → Kafka `order-events`
2. **Inventory** fails to reserve → Kafka `inventory-events` (failed)
3. **Order** receives failure → CANCELLED → Kafka `order-cancelled-events`
4. **Inventory** releases any previously reserved items (compensation)

### Failure: Insufficient Wallet Balance
1. Order Created → stock reserved → Kafka `payment-commands`
2. **Payment** wallet debit fails → FAILED status → Kafka `payment-failed-events`
3. **Order** receives failure → CANCELLED → Kafka `order-cancelled-events`
4. **Inventory** releases reserved stock (compensation)

## Authentication Architecture

- **User Service** signs RS256 JWTs using a private RSA key (`jwt-private.pem`)
- **All downstream services** validate JWTs using the public RSA key (`jwt-public.pem`)
- JWT carries: `sub` (email), `iss` (user-service), `role` (ROLE_USER / ROLE_ADMIN)
- **Kafka communication** is independent of HTTP JWT security
- **Order → Product HTTP** calls propagate the caller's JWT via `AuthorizationPropagationInterceptor`

### Role-Based Access
- `GET /api/products/**` — Any authenticated user (ROLE_USER or ROLE_ADMIN)
- `POST/PUT/DELETE /api/products/**` — ADMIN only (enforced by Spring Security)

## Redis Usage

- **product-service** uses Redis as a read-through cache for `getProductById`
- Cache TTL: 30 minutes
- Cache is evicted on `updateProduct` and `deleteProduct`
- Serialization: Jackson JSON with JavaTimeModule

## Database Overview

| Service | Key Tables | Notable Constraints |
|---------|-----------|-------------------|
| user-service | users | UNIQUE(email), UNIQUE(phoneNumber) |
| product-service | products | PK(id) |
| order-service | orders, order_items | UNIQUE(user_id, idempotency_key), UNIQUE(order_number) |
| inventory-service | inventory, reservations | UNIQUE(product_id) on inventory |
| payment-service | payments, wallets | UNIQUE(order_id), UNIQUE(user_id), UNIQUE(transaction_id) |

## Idempotency

### Order Creation
- Client sends optional `idempotencyKey` (max 64 chars)
- Same `(userId, idempotencyKey)` → returns existing order, no duplicate
- Same key across different users → independent orders (unique constraint is per-user)
- Concurrent duplicates: DataIntegrityViolationException → re-resolve winner's committed order
- Without idempotency key: legacy behavior, duplicates allowed (documented)

### Payment Processing
- `UNIQUE(order_id)` constraint prevents duplicate payments
- SUCCESS/FAILED payments are returned immediately (idempotent)
- Concurrent identical events: one wins the insert, loser re-resolves winner's state
- No false PaymentFailedEvent is ever emitted for a committed SUCCESS

### Inventory Reservation
- `existsByOrderIdAndProductId` idempotency guard prevents double-decrement
- Pessimistic FOR UPDATE lock serializes concurrent reservations of the same product
- Duplicate OrderCreatedEvent redeliveries are safely skipped

## Concurrency Protection

| Mechanism | Where | Purpose |
|-----------|-------|---------|
| PESSIMISTIC_WRITE (FOR UPDATE) | Order `findByIdForUpdate` | Serialize status transitions |
| PESSIMISTIC_WRITE (FOR UPDATE) | Inventory `findByProductIdForUpdate` | Serialize stock reservations |
| PESSIMISTIC_WRITE (FOR UPDATE) | Payment `findByTransactionIdForUpdate` | Serialize payment processing |
| Atomic SQL UPDATE WHERE balance >= | Wallet `deductBalanceIfSufficient` | Prevent double-spend |
| Atomic SQL UPDATE | Wallet `addBalanceAtomically` | Prevent lost updates |
| @Version (optimistic) | Inventory entity | Secondary safety net |
| UNIQUE constraints | All services | Prevent duplicate entities |

## Docker Setup

### Native Development vs Docker Deployment

- **Native Development**:
  - Run frontend dev server: `cd frontend && npm run dev` (accessible at `http://localhost:5173`)
  - Run microservices: `$env:JAVA_HOME="C:\Program Files\Java\jdk-25"; cd backend\user-service && .\mvnw.cmd spring-boot:run`
- **Docker Compose (Full Platform)**:
  - Start full stack: `docker compose up -d` (accessible at `http://localhost:3000`)
  - Start infrastructure only: `docker compose up -d postgres kafka zookeeper redis`
  - Rebuild images: `docker compose build`
  - View service logs: `docker compose logs -f order-service`

### Docker Compose Infrastructure & Services

- **postgres:15-alpine** — PostgreSQL 15 hosting per-service databases (init script `init-databases.sql`)
- **zookeeper** + **kafka** (wurstmeister) — Kafka event broker on internal port 9093 & external port 9092
- **redis:7-alpine** — Product Service cache
- **user-service**, **product-service**, **order-service**, **inventory-service**, **payment-service**, **notification-service** — Spring Boot microservices
- **frontend** — Multi-stage React/Vite production build served via Nginx with SPA routing fallback (`try_files $uri /index.html`) and API proxying (`/api/users`, `/api/products`, `/api/v1/orders`)

### Security & Key Mounting

- **User Service** receives `keys/jwt-private.pem` (signing only) mounted read-only (`:ro`)
- **Downstream Services** receive `keys/jwt-public.pem` (validation only) mounted read-only (`:ro`)
- RSA private key is never baked into images or exposed to downstream services or frontend JavaScript

## Environment Variables

| Variable | Service(s) | Description |
|----------|-----------|-------------|
| JWT_PRIVATE_KEY_PATH | user-service | Path to RSA private key PEM |
| JWT_PUBLIC_KEY_PATH | all except user | Path to RSA public key PEM |
| JWT_ISSUER | all except user | Expected JWT issuer (default: user-service) |
| SPRING_DATASOURCE_URL | all | JDBC URL |
| SPRING_DATASOURCE_USERNAME | all | PostgreSQL username |
| SPRING_DATASOURCE_PASSWORD | all | PostgreSQL password |
| SPRING_KAFKA_BOOTSTRAP_SERVERS | order, inventory, payment, notification | Kafka broker |
| PRODUCT_SERVICE_URL | order-service | Product Service base URL |
| PRODUCT_SERVICE_CONNECT_TIMEOUT_MS | order-service | HTTP connect timeout (default: 2000) |
| PRODUCT_SERVICE_READ_TIMEOUT_MS | order-service | HTTP read timeout (default: 5000) |
| MAIL_USERNAME | notification-service | SMTP username |
| MAIL_PASSWORD | notification-service | SMTP password |

## Testing

```bash
# Run tests for a specific service
cd order-service && ./mvnw test

# Run all tests across all services (from backend/)
for svc in user-service product-service order-service inventory-service payment-service notification-service; do
  cd $svc && ./mvnw test && cd ..
done
```

### Test Categories

| Type | Description | Count |
|------|-------------|-------|
| Unit tests | Mocked dependencies, pure logic | 76 |
| MVC/Web layer tests | @WebMvcTest, JWT security, role matrix | 16 |
| Context loading tests | SpringBootTest (one per service that has one) | 5 |
| Genuine concurrency tests | ExecutorService + CyclicBarrier + real DB | 17 |
| **Total** | | **114** |

### Genuine Concurrency Tests (17 total)
- `PaymentConcurrencyIntegrationTest` (8 tests) — double-spend prevention, concurrent wallet operations
- `OrderIdempotencyConcurrencyIntegrationTest` (5 tests) — concurrent duplicate order creation
- `InventoryConcurrencyIntegrationTest` (4 tests) — oversell prevention, concurrent reservations

All concurrency tests use `ExecutorService` + `CyclicBarrier` to release threads simultaneously against a real PostgreSQL instance. They gracefully skip (via `TestAbortedException`) when PostgreSQL is unavailable.

## Known Limitations

1. **No Outbox Pattern**: Database commit and Kafka publish are **not atomic**. A failure between DB commit and Kafka publish can cause saga/event inconsistency. This is a known architectural limitation.

2. **Notification deduplication is in-memory**: Uses a `ConcurrentHashMap.newKeySet()` bounded at 50,000 entries. After consumer restart, deduplication state is lost — a rare duplicate email is possible.

3. **No service discovery**: Services communicate via hardcoded Docker network hostnames or localhost URLs.

4. **Nginx Reverse Proxy / Gateway Rate Limiting**: Nginx provides reverse proxy routing and endpoint protection with rate limiting (`auth_limit` 5 req/s for login/register, `order_limit` 10 req/s for orders, `api_limit` 30 req/s for general APIs, returning HTTP 429 on overflow).

5. **No distributed tracing framework**: Correlation IDs (`X-Correlation-Id`) are propagated via HTTP headers and MDC logging across services, but full distributed tracing (OpenTelemetry/Zipkin) is omitted to avoid unnecessary infrastructure bloat.

6. **Admin state override**: The order state machine intentionally allows PENDING → SHIPPED and PENDING → DELIVERED transitions for administrative use via the REST `PUT /api/v1/orders/{id}/status` endpoint.

7. **Default credentials in development**: PostgreSQL password `password` is used in application.properties for local development. Docker Compose and production configurations override this with environment variables (`POSTGRES_PASSWORD`).

## Future Improvements

- Implement Outbox Pattern for DB-Kafka atomicity
- Add distributed tracing (OpenTelemetry / Zipkin)
- Add service discovery (Eureka / Consul)
- Implement Kubernetes deployment manifests
- Integrate Debezium for CDC
- Persistent notification deduplication (database-backed)
- Add circuit breakers (Resilience4j) for HTTP calls
- Implement event sourcing for order state history
