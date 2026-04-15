import { AppShell } from '@/components/shared/AppShell'

export default function AdminLayout({ children }) {
  return <AppShell role="admin">{children}</AppShell>
}
