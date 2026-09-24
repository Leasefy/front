"use client";

/**
 * Vitrina del sidebar — el componente REAL (`SidebarContent` de PlanSidebar),
 * no una maqueta. Hasta el 2026-09-22 esta página era un boceto aparte («Handle
 * style») que ya no se parecía al panel; ahora muestra las variantes de las
 * secciones plegables (pedido de Nico, 22-09) una al lado de la otra:
 *
 *   1. Inmobiliaria, con contadores y la página actual dentro de «Operación».
 *   2. Inmobiliaria con secciones cerradas: la cabecera resume lo de adentro.
 *   3. El riel plegado (sólo íconos, grupos separados por una raya).
 *   4. Propietario: filas sueltas + UNA sección.
 *   5. Inquilino: ninguna sección.
 *
 * Las cinco comparten el almacenamiento de secciones (es la misma persona):
 * plegar una sección en una columna se ve en las otras al recargar.
 *
 * En producción devuelve 404: nadie enlaza esta ruta.
 */

import { notFound } from "next/navigation";
import {
  AirTrafficControl,
  Bank,
  Buildings,
  Calculator,
  CalendarBlank,
  Chat,
  ChatCircleText,
  ChatsCircle,
  ChartLine,
  ChartLineUp,
  ClipboardText,
  CreditCard,
  CurrencyDollar,
  FilePlus,
  FileText,
  GitMerge,
  Handshake,
  HandCoins,
  House,
  Kanban,
  Lifebuoy,
  Receipt,
  Scales,
  SquaresFour,
  Toolbox,
  Umbrella,
  UserCircle,
  UsersThree,
  Wallet,
  Wrench,
} from "@phosphor-icons/react";
import { SidebarContent, type NavItem } from "@/components/ui/plan/PlanSidebar";

const P = "/panel/inmobiliaria";
const sec = (key: string, label: string): NavItem => ({ kind: "section", label, href: `#sec-${key}`, icon: SquaresFour });

const INMOBILIARIA: NavItem[] = [
  { label: "Inicio", href: `${P}/piloto`, icon: AirTrafficControl, badge: 4 },
  { label: "Chat", href: P, icon: ChatsCircle, exact: true },
  sec("agentes", "Agentes IA"),
  { label: "Avalúos", href: `${P}/inmuebles/avaluos`, icon: Scales },
  { label: "Matching", href: `${P}/postulaciones/matching`, icon: GitMerge },
  { label: "Asegurabilidad", href: `${P}/postulaciones/asegurabilidad`, icon: Umbrella },
  { label: "Cobranza", href: `${P}/pagos/cobranza`, icon: ChatCircleText },
  { label: "Conciliación", href: `${P}/conciliacion`, icon: Bank },
  { label: "Agente de pagos", href: `${P}/pagos/agente`, icon: HandCoins },
  { label: "Desempeño IA", href: `${P}/reportes/ia`, icon: ChartLineUp },
  sec("captacion", "Captación y arriendo"),
  { label: "Pipeline", href: `${P}/pipeline`, icon: Kanban },
  { label: "Agenda", href: `${P}/agenda`, icon: CalendarBlank },
  { label: "Inmuebles", href: `${P}/inmuebles`, icon: Buildings },
  { label: "Postulaciones", href: `${P}/postulaciones`, icon: ClipboardText, ai: true, badge: 3 },
  sec("operacion", "Operación"),
  { label: "Contratos", href: `${P}/contratos`, icon: FilePlus, badge: 16 },
  { label: "Mantenimientos", href: `${P}/mantenimientos`, icon: Wrench },
  { label: "Proveedores", href: `${P}/mantenimientos/proveedores`, icon: Toolbox },
  { label: "Solicitudes", hint: "PQRS", href: `${P}/solicitudes`, icon: Lifebuoy, ai: true },
  { label: "Mensajes", href: `${P}/mensajes`, icon: Chat },
  sec("dinero", "Dinero"),
  { label: "Pagos", href: `${P}/pagos`, icon: CurrencyDollar },
  { label: "Facturación", href: `${P}/facturacion`, icon: Receipt },
  { label: "Contabilidad", href: `${P}/contabilidad`, icon: Calculator },
  sec("directorio", "Directorio"),
  { label: "Propietarios", href: `${P}/propietarios`, icon: UserCircle },
  { label: "Inquilinos", href: `${P}/inquilinos`, icon: UsersThree },
  { label: "Documentos", href: `${P}/documentos`, icon: FileText, exact: true },
  { label: "Reportes", href: `${P}/reportes`, icon: ChartLine, suelta: true },
];

const PROPIETARIO: NavItem[] = [
  { label: "Inicio", href: "/panel", icon: SquaresFour, exact: true },
  { label: "Mis inmuebles", href: "/panel/inmuebles", icon: House },
  { label: "Estado de cuenta", href: "/panel/estado-de-cuenta", icon: Receipt },
  { label: "Aprobar reparaciones", href: "/panel/aprobaciones", icon: Wrench, badge: 2 },
  { label: "Mensajes", href: "/panel/mensajes", icon: Chat },
  sec("mi-arriendo", "Mi arriendo"),
  { label: "Mi plata", href: "/panel/portafolio", icon: Wallet, tag: "Pronto" },
  { label: "Elegir inquilino", href: "/panel/seleccion", icon: UsersThree, tag: "Pronto" },
];

const INQUILINO: NavItem[] = [
  { label: "Panel", href: "/inquilino", icon: SquaresFour, exact: true },
  { label: "Mi arriendo", href: "/inquilino/arriendo", icon: House },
  { label: "Contratos", href: "/inquilino/contratos", icon: Handshake },
  { label: "Pagos", href: "/inquilino/pagos", icon: CreditCard },
  { label: "Mensajes", href: "/inquilino/mensajes", icon: Chat, badge: 1 },
];

function Columna({ titulo, ancho = 240, children }: { titulo: string; ancho?: number; children: React.ReactNode }) {
  return (
    <section className="flex shrink-0 flex-col gap-2">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.1em] text-fg-subtle">{titulo}</h2>
      <div className="h-[860px] overflow-hidden rounded-lg border border-border bg-bg" style={{ width: ancho }}>
        {children}
      </div>
    </section>
  );
}

export default function SidebarPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  const comun = { onCollapse: () => {}, showCollapseButton: false } as const;

  return (
    <main className="min-h-screen bg-surface-muted p-6">
      <h1 className="text-[22px] font-semibold tracking-[-0.015em] text-fg">Sidebar — secciones plegables</h1>
      <p className="mt-1 max-w-2xl text-[14px] text-fg-muted">
        El componente real, con datos de muestra. Cierra y abre secciones: se recuerda por persona.
      </p>
      <div className="mt-6 flex gap-6 overflow-x-auto pb-4">
        <Columna titulo="Inmobiliaria">
          <SidebarContent {...comun} navItems={INMOBILIARIA} isCollapsed={false} rutaActual={`${P}/contratos`} />
        </Columna>
        <Columna titulo="Riel plegado" ancho={64}>
          <SidebarContent {...comun} navItems={INMOBILIARIA} isCollapsed rutaActual={`${P}/contratos`} />
        </Columna>
        <Columna titulo="Propietario">
          <SidebarContent {...comun} navItems={PROPIETARIO} isCollapsed={false} rutaActual="/panel/aprobaciones" />
        </Columna>
        <Columna titulo="Inquilino">
          <SidebarContent {...comun} navItems={INQUILINO} isCollapsed={false} rutaActual="/inquilino/pagos" />
        </Columna>
      </div>
    </main>
  );
}
