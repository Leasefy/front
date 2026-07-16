import type { Metadata } from 'next'
import { ProductPage } from '@/components/landing/product/ProductPage'
import { PRODUCTS } from '@/lib/landing/products'
import { landingRobots } from '@/lib/landing/landing-stage'

const product = PRODUCTS.inquilino

// Thin route shell (landing-react-port SLICE 5, T5.2). See
// crm/page.tsx for the shared rationale.
export const metadata: Metadata = {
  title: product.name,
  description: product.lead,
  robots: landingRobots(),
}

export default function InquilinoPage() {
  return <ProductPage slug="inquilino" />
}
