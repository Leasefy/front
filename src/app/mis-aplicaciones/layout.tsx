import { TenantApplicationProvider } from '@/lib/context/TenantApplicationContext';

export default function MisAplicacionesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TenantApplicationProvider>{children}</TenantApplicationProvider>;
}
