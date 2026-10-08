import {
  Building2,
  ContactRound,
  FileText,
  Gauge,
  KanbanSquare,
  LifeBuoy,
  Settings,
  ShieldCheck,
  UsersRound,
} from 'lucide-react'

const icons = [
  { test: /dashboard|inicio|panel/i, icon: Gauge },
  { test: /organizacion|unidad/i, icon: Building2 },
  { test: /empresa|cliente/i, icon: Building2 },
  { test: /contact/i, icon: ContactRound },
  { test: /pipeline|oportunidad/i, icon: KanbanSquare },
  { test: /contrato|documento/i, icon: FileText },
  { test: /caso|post/i, icon: LifeBuoy },
  { test: /mantene|admin|config/i, icon: Settings },
  { test: /auditor|seguridad/i, icon: ShieldCheck },
]

export function getAreaIcon(label) {
  return icons.find((item) => item.test.test(label || ''))?.icon || UsersRound
}
