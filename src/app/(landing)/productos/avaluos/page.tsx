import type { Metadata } from 'next'
import { ProductPage } from '@/components/landing/product/ProductPage'
import { PRODUCTS } from '@/lib/landing/products'
import { landingRobots } from '@/lib/landing/landing-stage'

const product = PRODUCTS.avaluos

// Thin route shell (landing-react-port SLICE 5, T5.3). See
// crm/page.tsx for the shared rationale.
export const metadata: Metadata = {
  title: product.name,
  description: product.lead,
  robots: landingRobots(),
}

export default function AvaluosPage() {
  return <ProductPage slug="avaluos" />
}
