import { AppShell } from '@/components/shared/AppShell'

export default function LandlordLayout({ children }) {
  return <AppShell role={['landlord', 'admin']}>{children}</AppShell>
}
