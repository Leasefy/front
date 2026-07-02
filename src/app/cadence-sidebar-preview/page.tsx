'use client';

/**
 * TEMP verification route — composes the cadence Sidebar primitives into the
 * §Navigation anatomy (Image #6): workspace switcher + dropdown, search, nav
 * with a "New" badge, Pinned section, "More tools" chevron row, and the footer
 * invite card + upgrade button. Leasefy sample data. Safe to delete.
 */

import {
  Sidebar,
  SidebarWorkspaceSwitcher,
  SidebarSearch,
  SidebarItem,
  SidebarSection,
  SidebarInviteCard,
  SidebarUpgradeButton,
} from '@leasefy/cadence';
import {
  HouseLine,
  Buildings,
  Coins,
  UsersThree,
  FileText,
  ChartBar,
  Wrench,
  Receipt,
  DotsThree,
} from '@phosphor-icons/react';

const WORKSPACES = [
  {
    id: 'mayexpro',
    name: 'Mayexpro',
    description: 'Administra arriendos con IA',
    gradient: 'linear-gradient(140deg,#1A40FF,#2BB5E8)',
    active: true,
  },
  {
    id: 'agentes',
    name: 'Agentes Leasefy',
    description: 'Despliega y monitorea agentes',
    gradient: 'linear-gradient(140deg,#1F8A5B,#7DE08A)',
  },
  {
    id: 'api',
    name: 'Leasefy API',
    description: 'Construye con nuestros modelos',
    gradient: 'linear-gradient(140deg,#7C4DFF,#F5A878)',
  },
];

export default function CadenceSidebarPreviewPage() {
  return (
    <div className="flex min-h-screen items-start gap-8 bg-bg p-10">
      <Sidebar variant="card">
        {/* Workspace switcher (with dropdown) */}
        <SidebarWorkspaceSwitcher name="Mayexpro" workspaces={WORKSPACES} />

        {/* Search */}
        <SidebarSearch placeholder="Buscar" />

        {/* Main nav */}
        <nav className="flex flex-col">
          <SidebarItem icon={<HouseLine />} label="Home" active />
          <SidebarItem icon={<Buildings />} label="Propiedades" />
          <SidebarItem icon={<Coins />} label="Cobros" />
          <SidebarItem icon={<UsersThree />} label="Candidatos" badge="New" />
          <SidebarItem icon={<FileText />} label="Contratos" />
        </nav>

        {/* Pinned */}
        <SidebarSection label="Fijados">
          <SidebarItem icon={<ChartBar />} label="Reportes" />
          <SidebarItem icon={<Wrench />} label="Mantenimiento" />
          <SidebarItem icon={<Receipt />} label="Conciliación" />
          <SidebarItem icon={<DotsThree />} label="Más herramientas" trailingChevron />
        </SidebarSection>

        {/* Footer */}
        <div className="mt-auto flex flex-col gap-2.5 pt-3.5">
          <SidebarInviteCard />
          <SidebarUpgradeButton label="Upgrade" />
        </div>
      </Sidebar>

      <div className="pt-2 font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
        cadence §Navigation sidebar · primitivo (v1.0.38)
      </div>
    </div>
  );
}
