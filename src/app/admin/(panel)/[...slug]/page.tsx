import { Placeholder } from '@/components/admin/Placeholder'

/**
 * Catch-all for gated admin routes not yet built (Fase 1+). Explicit route
 * folders (added per screen) take precedence over this, so it disappears
 * screen-by-screen as the real pages land. Keeps the whole nav walkable now.
 */
export default function AdminCatchAllPage() {
  return <Placeholder />
}
