# Arriendo Facil

**Marketplace de arriendos sin intermediarios para Colombia con Risk Score AI**

[![Status](https://img.shields.io/badge/Frontend-Complete-success)](/)
[![Status](https://img.shields.io/badge/Backend-Pending-yellow)](/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

---

## Vision

Propietarios toman decisiones informadas sobre inquilinos en minutos, no dias, con explicabilidad total del scoring AI.

---

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Status

### Frontend: Complete (MVP Ready)

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Foundation & Design System | ✅ Complete |
| 2 | Property Catalog | ✅ Complete |
| 3 | Application Wizard | ✅ Complete |
| 4 | Risk Score Display | ✅ Complete |
| 5 | Landlord Dashboard | ✅ Complete |
| 6 | Tenant Tracking | ✅ Complete |
| 7 | UX Polish | ✅ Complete |
| 8 | Authentication UI | ✅ Complete |
| 9 | Interactive Map | ✅ Complete |
| 10 | Post-Approval Flow | ✅ Complete |
| 11 | UI/UX Improvements | ✅ Complete |

### Backend: Pending Development

See [docs/BACKEND-INTEGRATION.md](docs/BACKEND-INTEGRATION.md) for complete API specifications.

---

## Features

### For Tenants (Inquilinos)
- 🏠 Browse property catalog with AI-powered search
- 🗺️ Interactive map with Airbnb-style price markers
- 📝 6-step application wizard with autosave
- 📊 Application tracking with timeline
- 💳 Payment management
- 📄 Document storage

### For Landlords (Propietarios)
- 📋 9-step property publishing wizard
- 🎯 AI-powered candidate scoring (A/B/C/D levels)
- 📈 Dashboard with property stats
- ✅ Candidate approval workflow
- 📄 Digital contract generation (Ley 527/1999)
- 💰 Lease and payment management
- 📊 Subscription plans (Free/Pro/Business)

### Technical Highlights
- 🎨 Premium UI with Framer Motion animations
- 🗺️ Mapbox GL integration with clustering
- 🔒 Protected routes with role-based access
- 📱 Fully responsive (mobile-first)
- ♿ WCAG AA accessibility compliance
- 🎉 Celebration effects (confetti on success)

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS + shadcn/ui
- **Animations:** Framer Motion
- **Maps:** Mapbox GL + react-map-gl
- **State:** React Context + localStorage (mock)
- **Forms:** react-hook-form + Zod

---

## Project Structure

```
src/
├── app/              # Next.js pages
│   ├── propiedades/  # Property catalog
│   ├── publicar/     # Property publishing
│   ├── aplicar/      # Application wizard
│   ├── panel/        # Landlord portal
│   └── inquilino/    # Tenant portal
├── components/       # React components
│   ├── ui/           # Base components (shadcn)
│   ├── property/     # Property components
│   ├── landlord/     # Landlord components
│   ├── tenant/       # Tenant components
│   └── score/        # Risk score display
└── lib/
    ├── types/        # TypeScript interfaces
    ├── data/         # Mock data
    ├── context/      # React contexts
    └── hooks/        # Custom hooks
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [docs/BACKEND-INTEGRATION.md](docs/BACKEND-INTEGRATION.md) | API contract for backend development |
| [docs/FRONTEND-ARCHITECTURE.md](docs/FRONTEND-ARCHITECTURE.md) | Frontend structure and patterns |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | All changes by phase |
| [.planning/STATE.md](.planning/STATE.md) | Current project state |
| [.planning/PROJECT.md](.planning/PROJECT.md) | Project definition |

---

## Key User Flows

### 1. Property Publishing (9 steps)
Type → Location → Details → Amenities → Photos → Pricing → Description → **Plan** → Review

### 2. Tenant Application (6 steps)
Personal → Employment → Income → References → Documents → Review

### 3. Candidate Approval
Review → Pre-approve/Reject → Approve → Generate Contract → Sign → Active Lease

---

## Environment Variables

```env
# Required
NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxxxx

# Optional (for backend integration)
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

---

## Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
npm run typecheck  # Run TypeScript check
```

---

## Mock Data

All frontend data is mocked in `src/lib/data/`:
- 16 Colombian properties with coordinates
- 12 candidates with risk scores
- 6 tenant applications
- 4 active leases
- 3 contract templates
- 11 coupon codes

---

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## License

Private - All rights reserved

---

*Last updated: 2026-01-29*
