import Container from '../layout/Container'
import Section from '../layout/Section'
import { PackageIcon, ShieldIcon, TruckIcon } from '../ui/Icons'

/* Each step describes something the platform genuinely does, in the language a
   shopper would use. */
const STEPS = [
  {
    number: '01',
    icon: ShieldIcon,
    title: 'Create an account and sign in',
    body: 'Your session is a signed, short-lived token. Catalog access, orders and payments are all authorized from it — never from the browser alone.',
  },
  {
    number: '02',
    icon: PackageIcon,
    title: 'Build a bag and place the order',
    body: 'Placing an order records it instantly, then reserves your items from live stock before anything is charged.',
  },
  {
    number: '03',
    icon: TruckIcon,
    title: 'Payment settles, then it ships',
    body: 'Your wallet is charged once stock is secured. If either step fails, the order is cancelled and reserved stock goes back automatically.',
  },
]

function HowOrderingWorks() {
  return (
    <Section id="how-ordering-works" surface="canvas" bordered>
      <Container>
        <div className="max-w-2xl">
          <p className="text-eyebrow mb-3">How ordering works</p>
          <h2 className="text-2xl font-semibold text-ink sm:text-3xl">
            No mystery between the click and the delivery
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            Every order moves through the same three steps, in the same order, every time.
          </p>
        </div>

        <ol className="mt-10 grid gap-6 md:grid-cols-3 md:gap-8">
          {STEPS.map((step) => (
            <li key={step.number} className="rounded-xl border border-line bg-surface p-6">
              <div className="flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded-lg bg-canvas text-ink">
                  <step.icon className="size-4.5" />
                </span>
                <span className="font-mono text-xs text-ink-faint">{step.number}</span>
              </div>

              <h3 className="mt-5 text-base font-semibold text-ink">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  )
}

export default HowOrderingWorks
