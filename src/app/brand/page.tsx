import {
  LeasefyMark,
  LeasefyLogo,
  BrandMotif,
  BrandContour,
  Eyebrow,
} from '@/components/brand';
import { StatesDemo } from './StatesDemo';

export const metadata = {
  title: 'Leasefy — Sistema de marca',
  robots: { index: false, follow: false },
};

function Panel({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className={`relative h-44 flex items-center justify-center overflow-hidden ${className}`}>
        {children}
      </div>
      <div className="px-4 py-2.5 border-t border-border">
        <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-fg-subtle">{label}</span>
      </div>
    </div>
  );
}

export default function BrandPage() {
  return (
    <main className="min-h-screen bg-surface-muted">
      <div className="max-w-[1100px] mx-auto px-8 py-14">
        <Eyebrow>Sistema de marca</Eyebrow>
        <h1 className="mt-3 font-heading text-[26px] font-medium text-foreground tracking-tight">Leasefy — identidad</h1>
        <p className="mt-1.5 text-[15px] text-fg-subtle">Símbolo, lockups, tipografía y motivo gráfico oficiales.</p>

        {/* Símbolo */}
        <h2 className="mt-12 mb-4 font-heading text-[15px] font-medium text-foreground">Símbolo</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Panel label="Tile · sobre claro"><LeasefyMark variant="tile" size={64} /></Panel>
          <Panel label="Bare · azul" className="bg-white"><LeasefyMark variant="bare" size={84} className="text-[#1A40FF]" /></Panel>
          <Panel label="Bare · blanco" className="bg-[#1A40FF]"><LeasefyMark variant="bare" size={84} className="text-white" /></Panel>
          <Panel label="Bare · sobre navy" className="bg-[#14130f]"><LeasefyMark variant="bare" size={84} className="text-white" /></Panel>
        </div>

        {/* Lockups */}
        <h2 className="mt-12 mb-4 font-heading text-[15px] font-medium text-foreground">Lockups</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Panel label="Horizontal · auto"><LeasefyLogo orientation="horizontal" size={34} tone="auto" /></Panel>
          <Panel label="Brand · sobre claro"><LeasefyLogo orientation="horizontal" size={34} tone="brand" /></Panel>
          <Panel label="White · sobre azul" className="bg-[#1A40FF]"><LeasefyLogo orientation="stacked" size={40} tone="white" /></Panel>
        </div>

        {/* Motivo — pinstripe field */}
        <h2 className="mt-12 mb-1 font-heading text-[15px] font-medium text-foreground">Motivo — campo de estrías</h2>
        <p className="mb-4 text-[13px] text-fg-subtle max-w-2xl">
          Estrías verticales uniformes; las formas (arco, domo, círculo) emergen por <strong className="font-medium text-fg-muted">inversión de tono</strong> dentro
          del campo — nunca como barras de altura variable.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Panel label="Arch · sobre navy (hero)" className="bg-[#14130f] p-0">
            <BrandMotif tone="on-navy" shape="arch" />
          </Panel>
          <Panel label="Valley · sobre azul (señalética)" className="bg-[#1A40FF] p-0">
            <BrandMotif tone="on-blue" shape="valley" />
          </Panel>
          <Panel label="Rings · sobre navy (póster)" className="bg-[#14130f] p-0">
            <BrandMotif tone="on-navy" shape="rings" />
            <LeasefyMark variant="bare" size={56} className="relative text-[#14130f]" />
          </Panel>
          <Panel label="Dome · hairline sobre claro (brochure)" className="bg-white p-0">
            <BrandMotif tone="on-light" shape="dome" />
          </Panel>
          <Panel label="Field · sobre azul" className="bg-[#1A40FF] p-0">
            <BrandMotif tone="on-blue" shape="field" />
          </Panel>
          <Panel label="Contour · hairline (badge)" className="bg-[#14130f] p-0">
            <div className="absolute inset-x-0 top-[30%] h-[44%] text-white/25">
              <BrandContour />
            </div>
          </Panel>
        </div>

        {/* Aplicación */}
        <h2 className="mt-12 mb-4 font-heading text-[15px] font-medium text-foreground">Aplicación</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Hero panel — exhibition-wall grammar */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="relative h-72 bg-[#14130f] overflow-hidden">
              <div className="absolute inset-y-0 -right-[6%] w-[64%]">
                <BrandMotif tone="on-navy" shape="arch" fade="left" />
              </div>
              <div className="relative h-full flex flex-col justify-between p-7">
                <LeasefyLogo size={20} tone="white" />
                <div>
                  <p className="font-heading text-[22px] font-medium leading-[1.15] tracking-[-0.02em] text-white">
                    Arriendo moderno,
                    <br />
                    <span className="text-[#4E6BFF]">sin esfuerzo.</span>
                  </p>
                  <p className="mt-2 text-[12px] text-white/55 max-w-[240px]">
                    Tecnología para inmobiliarias y propietarios modernos.
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 text-[12px] text-white/60">leasefy.com ↗</div>
              </div>
            </div>
            <div className="px-4 py-2.5 border-t border-border">
              <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-fg-subtle">Hero · headline blanco + azul</span>
            </div>
          </div>

          {/* Badge / KPI card — contour grammar */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="relative h-72 bg-[#f8f8f8] flex items-center justify-center">
              <div
                className="relative w-64 rounded-xl p-5 overflow-hidden"
                style={{ background: 'linear-gradient(150deg, #14130f 58%, #2a2824 135%)', boxShadow: '0 10px 30px -6px rgba(26,64,255,0.30)' }}
              >
                <div className="absolute -inset-x-1 top-[34%] h-[44%] text-white/[0.14]">
                  <BrandContour />
                </div>
                <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-white/55">Recaudo del mes</span>
                <p className="mt-3 font-heading text-[26px] font-semibold text-white tabular-nums tracking-tight leading-none">$48.2M</p>
                <p className="mt-1.5 text-[11.5px] text-white/60">+12% vs. mes anterior</p>
              </div>
            </div>
            <div className="px-4 py-2.5 border-t border-border">
              <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-fg-subtle">Hero KPI · contour (grammar de badge)</span>
            </div>
          </div>
        </div>

        {/* Botones */}
        <h2 className="mt-12 mb-1 font-heading text-[15px] font-medium text-foreground">Botones</h2>
        <p className="mb-4 text-[13px] text-fg-subtle max-w-2xl">
          Satoshi Medium, sentence case. El mono UPPERCASE queda reservado para eyebrows/labels/badges — <strong className="font-medium text-fg-muted">nunca en acciones</strong>.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Panel label="Correcto · sentence case">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[#1A40FF] text-white text-sm font-medium">Iniciar sesión ↗</span>
              <span className="inline-flex items-center h-10 px-5 rounded-xl border border-border text-sm font-medium text-foreground">Crear cuenta</span>
            </div>
          </Panel>
          <Panel label="Incorrecto · mono uppercase">
            <div className="flex items-center gap-3 opacity-60">
              <span className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[#1A40FF] text-white text-[12px] font-mono uppercase tracking-wide line-through decoration-white/70">Iniciar sesión</span>
              <span className="text-[18px]">✕</span>
            </div>
          </Panel>
        </div>

        {/* Estados: splash + empty state */}
        <h2 className="mt-12 mb-4 font-heading text-[15px] font-medium text-foreground">Estados</h2>
        <StatesDemo />
      </div>
    </main>
  );
}
