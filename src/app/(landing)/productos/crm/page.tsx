import type { Metadata } from 'next'
import { ProductPage } from '@/components/landing/product/ProductPage'
import { PRODUCTS } from '@/lib/landing/products'
import { landingRobots } from '@/lib/landing/landing-stage'

const product = PRODUCTS.crm

// Thin route shell (landing-react-port SLICE 5, T5.1). New path — no
// conflict with the live site — so it ships at its final URL from day
// one, gated `noindex` via `landingRobots()` until the SLICE 9 flip.
export const metadata: Metadata = {
  title: product.name,
  description: product.lead,
  robots: landingRobots(),
}

export default function CrmPage() {
  return <ProductPage slug="crm" />
}
