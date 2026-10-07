import { Bolt, ClipboardCheck, CreditCard, Headset, Settings, ShieldCheck, Snowflake, Truck, Wrench, type LucideProps } from 'lucide-react'

const map = {
  delivery: Truck,
  shield: ShieldCheck,
  headset: Headset,
  snowflake: Snowflake,
  gear: Settings,
  wrench: Wrench,
  bolt: Bolt,
  clipboard: ClipboardCheck,
  card: CreditCard,
}

export type IconName = keyof typeof map

export default function Icon({ name, ...props }: { name: string } & LucideProps) {
  const C = map[name as IconName] ?? ShieldCheck
  return <C aria-hidden="true" {...props} />
}
