import Container from '../layout/Container'
import Section from '../layout/Section'
import { RefreshIcon, ShieldIcon, TruckIcon, WalletIcon } from '../ui/Icons'

const GUARANTEES = [
  {
    icon: ShieldIcon,
    title: 'Secure sessions',
    body: 'Tokens are issued by the user service and verified for every request by each service.',
  },
  {
    icon: TruckIcon,
    title: 'Stock you can trust',
    body: 'Availability is read from the inventory service, and reservations are atomic.',
  },
  {
    icon: WalletIcon,
    title: 'Wallet checkout',
    body: 'Payments are processed by a dedicated payment service — no card data touches the storefront.',
  },
  {
    icon: RefreshIcon,
    title: 'Honest order status',
    body: 'Orders report what actually happened: processing, paid, shipped, delivered or cancelled.',
  },
]

function AssuranceSection() {
  return (
    <Section id="assurance">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div className="max-w-sm">
            <p className="text-eyebrow mb-3">Why Aureum</p>
            <h2 className="text-2xl font-semibold text-ink sm:text-3xl">
              Built on systems that behave
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              The storefront you are using is the front of a distributed commerce platform. That
              shows up as fewer surprises: accurate stock, traceable orders and payments that either
              succeed or roll back cleanly.
            </p>
          </div>

          <dl className="grid gap-6 sm:grid-cols-2 sm:gap-8">
            {GUARANTEES.map((item) => (
              <div key={item.title}>
                <dt className="flex items-center gap-2.5 text-sm font-semibold text-ink">
                  <item.icon className="size-4 text-ink-muted" />
                  {item.title}
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-ink-muted">{item.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Container>
    </Section>
  )
}

export default AssuranceSection
