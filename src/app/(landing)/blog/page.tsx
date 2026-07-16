import { BlogListing } from '@/components/landing/blog/BlogListing'

/**
 * Thin route shell (landing-react-port SLICE 6). This route lives inside
 * the `(landing)` group so it inherits scoped fonts + `<LandingHeader>`/
 * `<LandingFooter>` from `(landing)/layout.tsx` for free — matching the
 * standalone's "header lives on all internals" rule without duplicating
 * font loading or the header/footer markup. SEO-bearing metadata (title
 * template, description, keywords, OG) stays in `blog/layout.tsx`,
 * UNTOUCHED (design §2) — the blog remains real, indexable content
 * throughout the landing port's staging period, unlike the noindex-gated
 * `(landing)` routes.
 */
export default function BlogPage() {
  return <BlogListing />
}
