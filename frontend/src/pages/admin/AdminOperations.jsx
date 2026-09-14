import { useEffect, useState } from 'react'
import { OUTBOX_SERVICES, getOutboxMessages, getServiceHealth, retryFailedOutbox } from '../../api/admin'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import {
  ActivityIcon,
  AlertIcon,
  CheckIcon,
  DatabaseIcon,
  InboxIcon,
  LayersIcon,
  RefreshIcon,
  ShieldIcon,
  ZapIcon,
} from '../../components/ui/Icons'
import { useToast } from '../../contexts/useToast'
import { formatDateTime } from '../../lib/format'

const SERVICES = [
  { id: 'user', name: 'User Service', port: 8006, db: 'user_service_db', role: 'Authentication & JWT RS256' },
  { id: 'product', name: 'Product Service', port: 8081, db: 'product_service_db', role: 'Catalog & Redis Cache' },
  { id: 'order', name: 'Order Service', port: 8082, db: 'order_service_db', role: 'Saga Coordinator & Outbox' },
  { id: 'inventory', name: 'Inventory Service', port: 8084, db: 'inventory_db', role: 'Concurrency & Reservations' },
  { id: 'payment', name: 'Payment Service', port: 8085, db: 'payment_db', role: 'Wallet Ledger & Debit' },
  { id: 'notification', name: 'Notification Service', port: 8083, db: 'None (Event Consumer)', role: 'Async Email Alerts' },
]

export default function AdminOperations() {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('overview')
  const [healthData, setHealthData] = useState({})
  const [healthLoading, setHealthLoading] = useState(false)
  const [outboxData, setOutboxData] = useState({ order: [], inventory: [], payment: [] })
  const [outboxLoading, setOutboxLoading] = useState(false)
  const [retryPending, setRetryPending] = useState(null)
  const [selectedService, setSelectedService] = useState('order')

  const fetchHealth = async () => {
    setHealthLoading(true)
    const results = {}
    for (const service of SERVICES) {
      try {
        const start = performance.now()
        const res = await getServiceHealth(service.id)
        const duration = Math.round(performance.now() - start)
        results[service.id] = { status: res?.status || 'UP', latencyMs: duration, ok: true }
      } catch (err) {
        results[service.id] = { status: 'DOWN', error: err.message, ok: false }
      }
    }
    setHealthData(results)
    setHealthLoading(false)
  }

  const fetchOutbox = async () => {
    setOutboxLoading(true)
    const data = { order: [], inventory: [], payment: [] }
    for (const s of OUTBOX_SERVICES) {
      try {
        const list = await getOutboxMessages(s.id)
        data[s.id] = Array.isArray(list) ? list : []
      } catch {
        data[s.id] = []
      }
    }
    setOutboxData(data)
    setOutboxLoading(false)
  }

  useEffect(() => {
    fetchHealth()
    fetchOutbox()
  }, [])

  const handleRetry = async (serviceId) => {
    setRetryPending(serviceId)
    try {
      const res = await retryFailedOutbox(serviceId)
      toast.success('Outbox re-queued', `${res.retriedCount ?? 0} failed message(s) reset to PENDING.`)
      fetchOutbox()
    } catch (err) {
      toast.error('Recovery failed', err.message)
    } finally {
      setRetryPending(null)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge tone="warning" size="sm" dot>
                Live Production Metrics
              </Badge>
              <span className="text-xs text-ink-faint">Distributed Architecture Showcase</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              System & Operational Telemetry
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              Real-time monitoring of 6 Spring Boot microservices, Kafka event streams, Saga orchestration, and Transactional Outbox tables.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                fetchHealth()
                fetchOutbox()
              }}
              isLoading={healthLoading || outboxLoading}
            >
              <RefreshIcon className="size-4" />
              Refresh Telemetry
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-line-soft pt-4">
          {[
            { id: 'overview', label: 'Architecture Overview', icon: LayersIcon },
            { id: 'health', label: 'Microservice Health', icon: ActivityIcon },
            { id: 'outbox', label: 'Transactional Outbox', icon: InboxIcon },
            { id: 'saga', label: 'Saga Workflow Demo', icon: ZapIcon },
            { id: 'cache', label: 'Redis Cache', icon: DatabaseIcon },
          ].map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`press inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                  active
                    ? 'bg-ink text-white shadow-sm'
                    : 'bg-canvas text-ink-muted hover:bg-canvas-deep hover:text-ink'
                }`}
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* TAB 1: ARCHITECTURE OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-line bg-surface p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-canvas text-ink">
                  <LayersIcon className="size-5" />
                </span>
                <div>
                  <p className="text-xs text-ink-faint">Architecture</p>
                  <p className="text-base font-semibold text-ink">Event-Driven Microservices</p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-ink-muted">
                6 Spring Boot services communicating asynchronously over Apache Kafka with Database-Per-Service isolation.
              </p>
            </div>

            <div className="rounded-xl border border-line bg-surface p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-canvas text-ink">
                  <ShieldIcon className="size-5" />
                </span>
                <div>
                  <p className="text-xs text-ink-faint">Resilience Pattern</p>
                  <p className="text-base font-semibold text-ink">Saga & Outbox Pattern</p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-ink-muted">
                Guarantees dual-write safety via Transactional Outbox and eventual consistency with automated compensations.
              </p>
            </div>

            <div className="rounded-xl border border-line bg-surface p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-canvas text-ink">
                  <DatabaseIcon className="size-5" />
                </span>
                <div>
                  <p className="text-xs text-ink-faint">Data Layer</p>
                  <p className="text-base font-semibold text-ink">PostgreSQL + Redis</p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-ink-muted">
                Dedicated database schemas per domain service plus Redis cache-aside for high-speed product catalog queries.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-6">
            <h2 className="text-base font-semibold text-ink">System Topology & Distributed Data Flow</h2>
            <p className="mt-1 text-xs text-ink-muted">
              How HTTP client requests trigger distributed Saga events across Kafka topics.
            </p>

            <div className="mt-6 grid gap-4 lg:grid-cols-4">
              <div className="rounded-xl border border-line-soft bg-canvas p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Step 1 — Ingestion</span>
                <h3 className="mt-1 text-sm font-semibold text-ink">Order Service</h3>
                <p className="mt-1 text-xs text-ink-muted">POST /api/v1/orders creates PENDING order & writes OrderCreatedEvent to outbox_messages.</p>
                <div className="mt-3 rounded bg-surface px-2.5 py-1.5 font-mono text-[11px] text-ink-soft">
                  Topic: order-events
                </div>
              </div>

              <div className="rounded-xl border border-line-soft bg-canvas p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Step 2 — Reservation</span>
                <h3 className="mt-1 text-sm font-semibold text-ink">Inventory Service</h3>
                <p className="mt-1 text-xs text-ink-muted">Consumes event, locks stock row optimistically, inserts reservation, publishes StockReservedEvent.</p>
                <div className="mt-3 rounded bg-surface px-2.5 py-1.5 font-mono text-[11px] text-ink-soft">
                  Topic: inventory-events
                </div>
              </div>

              <div className="rounded-xl border border-line-soft bg-canvas p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Step 3 — Settlement</span>
                <h3 className="mt-1 text-sm font-semibold text-ink">Payment Service</h3>
                <p className="mt-1 text-xs text-ink-muted">Consumes event, debits wallet balance safely. On success: PaymentSuccessEvent. On failure: PaymentFailedEvent.</p>
                <div className="mt-3 rounded bg-surface px-2.5 py-1.5 font-mono text-[11px] text-ink-soft">
                  Topic: payment-events
                </div>
              </div>

              <div className="rounded-xl border border-line-soft bg-canvas p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Step 4 — Finalization</span>
                <h3 className="mt-1 text-sm font-semibold text-ink">Order & Notification</h3>
                <p className="mt-1 text-xs text-ink-muted">Order transitions to PAID (or CANCELLED with inventory release) & Notification sends email confirmation.</p>
                <div className="mt-3 rounded bg-surface px-2.5 py-1.5 font-mono text-[11px] text-ink-soft">
                  Status: PAID / CANCELLED
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SERVICE HEALTH */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">Actuator Service Health Monitor</h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                Live evidence queried directly from each microservice's Spring Boot Actuator endpoint (/actuator/health).
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={fetchHealth} isLoading={healthLoading}>
              <RefreshIcon className="size-3.5" /> Re-check All
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s) => {
              const info = healthData[s.id]
              const isUp = info?.status === 'UP'
              return (
                <div key={s.id} className="flex flex-col justify-between rounded-xl border border-line bg-surface p-5">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-ink-faint">Port :{s.port}</span>
                      <Badge tone={isUp ? 'success' : 'danger'} size="sm" dot>
                        {isUp ? 'HEALTHY (UP)' : 'UNREACHABLE (DOWN)'}
                      </Badge>
                    </div>
                    <h3 className="mt-3 text-base font-bold text-ink">{s.name}</h3>
                    <p className="mt-1 text-xs text-ink-muted">{s.role}</p>
                  </div>

                  <div className="mt-5 border-t border-line-soft pt-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-ink-faint">Database:</span>
                      <span className="font-mono font-medium text-ink-soft">{s.db}</span>
                    </div>
                    {info?.latencyMs !== undefined && (
                      <div className="mt-1 flex items-center justify-between text-xs">
                        <span className="text-ink-faint">Latency:</span>
                        <span className="font-mono font-medium text-success">{info.latencyMs} ms</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB 3: TRANSACTIONAL OUTBOX */}
      {activeTab === 'outbox' && (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">Transactional Outbox Monitor</h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                Inspect events recorded in outbox_messages tables prior to Kafka publishing.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {OUTBOX_SERVICES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedService(s.id)}
                  className={`press rounded-md px-3 py-1.5 text-xs font-medium ${
                    selectedService === s.id
                      ? 'bg-ink text-white'
                      : 'bg-canvas text-ink-muted hover:text-ink'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-line-soft bg-canvas p-4">
            <div className="flex items-center gap-3">
              <InboxIcon className="size-5 text-ink-muted" />
              <div>
                <p className="text-sm font-semibold text-ink">
                  {OUTBOX_SERVICES.find((s) => s.id === selectedService)?.name} Outbox Table
                </p>
                <p className="text-xs text-ink-muted">
                  Showing recent outbox entries. Failed messages sit in FAILED until re-queued.
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleRetry(selectedService)}
              isLoading={retryPending === selectedService}
            >
              <RefreshIcon className="size-3.5" /> Re-queue Failed Messages
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-canvas text-ink-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Event Type</th>
                  <th className="px-4 py-3 font-semibold">Aggregate ID</th>
                  <th className="px-4 py-3 font-semibold">Kafka Topic</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Retries</th>
                  <th className="px-4 py-3 font-semibold">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {(outboxData[selectedService] || []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-ink-muted">
                      No outbox messages found for {selectedService} service.
                    </td>
                  </tr>
                ) : (
                  (outboxData[selectedService] || []).map((msg) => (
                    <tr key={msg.id} className="hover:bg-canvas-deep/50">
                      <td className="px-4 py-3 font-mono font-medium text-ink">#{msg.id}</td>
                      <td className="px-4 py-3 font-semibold text-ink">{msg.eventType}</td>
                      <td className="px-4 py-3 font-mono text-ink-soft">{msg.aggregateId}</td>
                      <td className="px-4 py-3 font-mono text-ink-faint">{msg.topic}</td>
                      <td className="px-4 py-3">
                        <Badge
                          tone={
                            msg.status === 'PUBLISHED'
                              ? 'success'
                              : msg.status === 'FAILED'
                                ? 'danger'
                                : 'warning'
                          }
                          size="sm"
                        >
                          {msg.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-ink-muted">{msg.retryCount}</td>
                      <td className="px-4 py-3 text-ink-muted">{formatDateTime(msg.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SAGA WORKFLOW DEMO */}
      {activeTab === 'saga' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-line bg-surface p-6">
            <h2 className="text-base font-semibold text-ink">Order Saga Execution Matrix</h2>
            <p className="mt-1 text-xs text-ink-muted">
              Distributed Saga orchestration flow comparing normal order execution vs payment failure compensation.
            </p>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {/* Normal Flow */}
              <div className="rounded-xl border border-success/30 bg-success-soft/20 p-5">
                <div className="flex items-center gap-2 text-success">
                  <CheckIcon className="size-4" />
                  <h3 className="text-sm font-bold uppercase tracking-wide">Normal Saga Flow (Success)</h3>
                </div>
                <ol className="mt-4 space-y-3 text-xs">
                  <li className="flex items-start gap-2 text-ink">
                    <span className="font-bold text-success">1.</span>
                    <span><strong>Order Created:</strong> User submits order → Order status <code>PENDING</code>.</span>
                  </li>
                  <li className="flex items-start gap-2 text-ink">
                    <span className="font-bold text-success">2.</span>
                    <span><strong>Inventory Reservation:</strong> Inventory Service locks stock & emits <code>StockReservedEvent</code>.</span>
                  </li>
                  <li className="flex items-start gap-2 text-ink">
                    <span className="font-bold text-success">3.</span>
                    <span><strong>Payment Debit:</strong> Payment Service debits user wallet & emits <code>PaymentSuccessEvent</code>.</span>
                  </li>
                  <li className="flex items-start gap-2 text-ink">
                    <span className="font-bold text-success">4.</span>
                    <span><strong>Confirmation:</strong> Order Service marks status <code>PAID</code> & Notification sends email.</span>
                  </li>
                </ol>
              </div>

              {/* Failure Flow */}
              <div className="rounded-xl border border-danger/30 bg-danger-soft/20 p-5">
                <div className="flex items-center gap-2 text-danger">
                  <AlertIcon className="size-4" />
                  <h3 className="text-sm font-bold uppercase tracking-wide">Failure & Compensation Flow</h3>
                </div>
                <ol className="mt-4 space-y-3 text-xs">
                  <li className="flex items-start gap-2 text-ink">
                    <span className="font-bold text-danger">1.</span>
                    <span><strong>Order Created:</strong> User submits order → Order status <code>PENDING</code>.</span>
                  </li>
                  <li className="flex items-start gap-2 text-ink">
                    <span className="font-bold text-danger">2.</span>
                    <span><strong>Inventory Reserved:</strong> Stock is locked tentatively in database.</span>
                  </li>
                  <li className="flex items-start gap-2 text-ink">
                    <span className="font-bold text-danger">3.</span>
                    <span><strong>Payment Failed:</strong> Wallet balance insufficient → Payment Service emits <code>PaymentFailedEvent</code>.</span>
                  </li>
                  <li className="flex items-start gap-2 text-ink">
                    <span className="font-bold text-danger">4.</span>
                    <span><strong>Compensation Event:</strong> Order transitions to <code>CANCELLED</code> & publishes <code>OrderCancelledEvent</code>.</span>
                  </li>
                  <li className="flex items-start gap-2 text-ink">
                    <span className="font-bold text-danger">5.</span>
                    <span><strong>Stock Released:</strong> Inventory Service receives cancellation and unlocks reserved stock.</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: REDIS CACHE */}
      {activeTab === 'cache' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-line bg-surface p-6">
            <h2 className="text-base font-semibold text-ink">Redis Cache-Aside Architecture</h2>
            <p className="mt-1 text-xs text-ink-muted">
              Product Service utilizes Spring Cache backed by Redis (`products` cache space).
            </p>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-line-soft bg-canvas p-5">
                <h3 className="text-sm font-semibold text-ink">Cache Read Flow (Get Product)</h3>
                <ol className="mt-3 space-y-2 text-xs text-ink-muted">
                  <li>1. Client requests <code>GET /api/products/{`{id}`}</code></li>
                  <li>2. Check Redis cache key <code>products::{`{id}`}</code></li>
                  <li>3. <strong>Cache HIT:</strong> Return serialized JSON directly from Redis memory (fast).</li>
                  <li>4. <strong>Cache MISS:</strong> Fetch row from PostgreSQL product_service_db, save to Redis, return response.</li>
                </ol>
              </div>

              <div className="rounded-xl border border-line-soft bg-canvas p-5">
                <h3 className="text-sm font-semibold text-ink">Cache Invalidation (Mutations)</h3>
                <ol className="mt-3 space-y-2 text-xs text-ink-muted">
                  <li>1. Admin triggers <code>PUT /api/products/{`{id}`}</code> or <code>DELETE</code></li>
                  <li>2. Database row updated inside Spring <code>@Transactional</code></li>
                  <li>3. <code>@CacheEvict(value = "products", key = "#id")</code> automatically clears Redis key</li>
                  <li>4. Guarantees fresh data on subsequent reads.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
