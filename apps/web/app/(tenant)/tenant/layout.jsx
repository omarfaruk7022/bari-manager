import { AppShell } from '@/components/shared/AppShell'

export default function TenantLayout({ children }) {
  return <AppShell role="tenant">{children}</AppShell>
}
