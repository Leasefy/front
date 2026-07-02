"use client";

// REMOVABLE SCAFFOLD — visual verification of the §39/§51/§52/§17E/§40/§17G
// components built in cadence v1.0.47→v1.0.51. Open http://localhost:3000/cadence-audit-preview.
// Delete this folder when done (one rebuild).

import * as React from "react";
import {
  House,
  WarningCircle,
  Folder,
  Bank,
  User,
  Trash,
} from "@phosphor-icons/react";
import {
  // §39 Skeletons
  SkeletonListItem,
  SkeletonMediaCard,
  SkeletonStat,
  SkeletonProfileHeader,
  SkeletonParagraph,
  SkeletonTableRows,
  // §51 Time Picker
  TimeWheelPicker,
  TimeStepper,
  TimeRangePicker,
  TimeSlots,
  TimePicker,
  type TimeStepperValue,
  // §52 Notifications
  NotificationCenter,
  NotificationBell,
  NotificationGroup,
  NotificationItem,
  NotificationEmpty,
  // §17E Kanban
  PipelineBoard,
  type PipelineColumnData,
  // §40 Modals
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogIconTitle,
  DialogBody,
  DialogFooter,
  ConfirmDialog,
  Button,
  // §17G Mention
  MentionChip,
  MentionMenu,
  // §42 / §17K / §17J / §17H (re-audit)
  Stepper,
  Heatmap,
  Gauge,
  ContractTimeline,
} from "@leasefy/cadence";

const KANBAN: PipelineColumnData[] = [
  {
    id: "nuevos",
    title: "Nuevos",
    count: 4,
    dotColor: "#7E7A72",
    cards: [
      { id: "juan", name: "Juan Pérez", zone: "Polanco", tag: { label: "Lead", tone: "info" }, price: "$18,500", comments: 2, avatar: "linear-gradient(140deg,#1A40FF,#2BB5E8)" },
      { id: "ana", name: "Ana Gómez", zone: "Condesa", price: "$24,000", avatar: "linear-gradient(140deg,#E8618C,#F0A24E)" },
    ],
  },
  {
    id: "revision",
    title: "En revisión",
    count: 3,
    dotColor: "#2A6FB0",
    cards: [
      { id: "luis", name: "Luis Soto", zone: "Roma Norte", tag: { label: "Screening", tone: "warning" }, price: "$15,800", comments: 5, avatar: "linear-gradient(140deg,#3F8A53,#6FC08A)" },
    ],
  },
  {
    id: "aprobados",
    title: "Aprobados",
    count: 6,
    dotColor: "#3F8A53",
    cards: [
      { id: "rob", name: "M. Robledo", zone: "Nápoles", tag: { label: "Aprobado", tone: "success" }, price: "$32,000", avatar: "linear-gradient(140deg,#1A40FF,#2BB5E8)" },
      { id: "carla", name: "Carla Díaz", zone: "Del Valle", tag: { label: "Aprobado", tone: "success" }, price: "$21,000", comments: 1, avatar: "linear-gradient(140deg,#8B5CF6,#E8618C)" },
    ],
  },
  {
    id: "firmados",
    title: "Firmados",
    count: 9,
    dotColor: "#1A40FF",
    cards: [{ id: "pedro", name: "Pedro Lara", zone: "Coyoacán", tag: { label: "Contrato", tone: "info" }, price: "$19,500" }],
  },
];

const MENTION_OPTIONS = [
  { id: "inq", name: "Estudio de inquilino", handle: "@inquilino", avatar: "linear-gradient(140deg,#1A40FF,#2BB5E8)" },
  { id: "cob", name: "Cobranza", handle: "@cobranza", avatar: "linear-gradient(140deg,#1F8A5B,#7DE08A)" },
  { id: "sofia", name: "Sofía Ramírez", handle: "@sofia", avatar: "linear-gradient(140deg,#8E7BF0,#F5A878)" },
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-14">
      <h2 className="mb-5 font-mono text-[13px] uppercase tracking-[0.08em] text-[#726E68]">{title}</h2>
      <div className="flex flex-col gap-8">{children}</div>
    </section>
  );
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[16px] border border-[#E5E2DC] bg-white p-6">
      <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.06em] text-[#B3AEA5]">{label}</div>
      {children}
    </div>
  );
}

export default function CadenceAuditPreview() {
  const [time, setTime] = React.useState("09:15 AM");
  const [stepper, setStepper] = React.useState<TimeStepperValue>({ hour: 9, minute: 15, meridiem: "AM" });
  const [slot, setSlot] = React.useState("10:00");
  const [tpVal, setTpVal] = React.useState("09:15");
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [mention, setMention] = React.useState("inq");

  return (
    <div className="min-h-screen bg-[#FBFAF9] px-6 py-10 md:px-12">
      <h1 className="mb-2 text-[28px] font-semibold text-[#14130F]">Cadence — audit preview</h1>
      <p className="mb-10 text-[14px] text-[#6E6A63]">
        Componentes construidos v1.0.47→v1.0.51 · §39 §51 §52 §17E §40 §17G. Scaffold removible.
      </p>

      {/* ── §39 Skeletons ── */}
      <Section id="skel" title="§39 · Skeletons">
        <Card label="Item de lista · avatar + 2 líneas"><SkeletonListItem rows={3} /></Card>
        <Card label="Card · media + título + texto + acción"><SkeletonMediaCard count={3} /></Card>
        <Card label="KPI / stat"><SkeletonStat count={3} /></Card>
        <Card label="Header de perfil"><SkeletonProfileHeader /></Card>
        <Card label="Párrafo"><SkeletonParagraph lines={5} /></Card>
        <Card label="Filas de tabla"><SkeletonTableRows rows={3} /></Card>
      </Section>

      {/* ── §51 Time Picker ── */}
      <Section id="time" title="§51 · Time Picker">
        <Card label="Dropdown · ruedas (12h + AM/PM + Ahora/Aplicar)">
          <TimeWheelPicker value={time} onChange={setTime} />
        </Card>
        <Card label="Stepper · flechas">
          <TimeStepper value={stepper} onChange={setStepper} />
        </Card>
        <Card label="Rango de horas">
          <TimeRangePicker start="09:00 AM" end="11:30 AM" />
        </Card>
        <Card label="Slots rápidos">
          <TimeSlots slots={["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "Tarde"]} value={slot} onSelect={setSlot} />
        </Card>
        <Card label="Estados (default / filled / error)">
          <div className="flex flex-wrap items-center gap-4">
            <TimePicker />
            <TimePicker value={tpVal} onChange={setTpVal} />
            <TimePicker value="99:99" error />
          </div>
        </Card>
      </Section>

      {/* ── §52 Notifications ── */}
      <Section id="notif" title="§52 · Notifications">
        <Card label="Trigger · campana (contador / punto / limpio)">
          <div className="flex items-center gap-7">
            <NotificationBell count={3} />
            <NotificationBell dot />
            <NotificationBell />
          </div>
        </Card>
        <Card label="Notification Center (panel)">
          <NotificationCenter count={3} onMarkAllRead={() => {}}>
            <NotificationGroup label="Hoy">
              <NotificationItem
                tone="success"
                icon={<Bank />}
                title={<><strong>Pago recibido</strong> de Juan Pérez por $18,500 (AR-1023).</>}
                unread
                timestamp="hace 8 min"
                actions={[{ label: "Ver recibo" }, { label: "Conciliar", variant: "secondary" }]}
              />
              <NotificationItem
                tone="warning"
                icon={<WarningCircle />}
                title={<><strong>Contrato vence</strong> AR-0987 vence en 5 días.</>}
                unread
                timestamp="hace 40 min"
                actions={[{ label: "Renovar" }, { label: "Recordar", variant: "secondary" }]}
              />
              <NotificationItem
                tone="info"
                icon={<User />}
                title={<><strong>Nuevo solicitante</strong> María L. completó el estudio de inquilino.</>}
                unread
                timestamp="hace 1 h"
              />
            </NotificationGroup>
          </NotificationCenter>
        </Card>
        <Card label="Estado vacío">
          <div className="max-w-[420px] rounded-[16px] border border-[#E5E2DC]">
            <NotificationEmpty description="Cuando haya pagos o solicitudes, aparecerán aquí." />
          </div>
        </Card>
      </Section>

      {/* ── §17E Kanban ── */}
      <Section id="kanban" title="§17E · Kanban">
        <Card label="Pipeline (dots + tags coloreados + drop-zone)">
          <PipelineBoard columns={KANBAN} showDropZone />
        </Card>
      </Section>

      {/* ── §40 Modals ── */}
      <Section id="modals" title="§40 · Modals">
        <Card label="Form modal (icon-tile header) + Confirmación danger">
          <div className="flex flex-wrap gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button>Abrir form modal</Button>
              </DialogTrigger>
              <DialogContent size="md">
                <DialogIconTitle icon={<House weight="fill" />} title="Datos del inmueble" />
                <DialogBody>
                  <p className="text-[14px] text-[#6E6A63]">Header con icon-tile 40×40 (§40). El × lo pone DialogContent.</p>
                </DialogBody>
                <DialogFooter>
                  <Button variant="secondary">Atrás</Button>
                  <Button>Guardar inmueble</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button variant="destructive" onClick={() => setConfirmOpen(true)}>Eliminar contrato</Button>
            <ConfirmDialog
              open={confirmOpen}
              onOpenChange={setConfirmOpen}
              icon={<WarningCircle weight="fill" />}
              iconTone="danger"
              title="Eliminar contrato"
              description="Vas a eliminar el contrato AR-1023. Esta acción no se puede deshacer y se perderá el historial de pagos."
              actionLabel="Eliminar"
            />

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary">Guardar en carpeta</Button>
              </DialogTrigger>
              <DialogContent size="sm">
                <DialogIconTitle icon={<Folder weight="fill" />} title="Guardar en carpeta" />
                <DialogBody>
                  <p className="text-[14px] text-[#6E6A63]">Selector (composición: Dialog + búsqueda + tree).</p>
                </DialogBody>
                <DialogFooter>
                  <Button variant="secondary">Cancelar</Button>
                  <Button>Guardar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </Card>
      </Section>

      {/* ── §17G Mention ── */}
      <Section id="mention" title="§17G · Mención · @ en composer">
        <Card label="Chip + menú @">
          <div className="mb-5 rounded-[14px] border border-[#E5E2DC] p-[14px] text-[14px] leading-[1.6] text-[#14130F]">
            Hola <MentionChip>@Laura</MentionChip>, ¿puedes revisar el contrato de <MentionChip>@</MentionChip>
          </div>
          <MentionMenu options={MENTION_OPTIONS} value={mention} onSelectOption={(o) => setMention(o.id)} />
        </Card>
      </Section>

      {/* ── §42 Stepper vertical (re-audit) ── */}
      <Section id="stepper" title="§42 · Stepper vertical (re-audit)">
        <Card label="Vertical · con descripción + error">
          <Stepper
            orientation="vertical"
            activeIndex={2}
            steps={[
              { id: "datos", label: "Datos del inmueble", description: "Loft Polanco · Reforma 312" },
              { id: "docs", label: "Documentos", description: "Contrato y póliza cargados" },
              { id: "avaluo", label: "Avalúo con IA", description: "Estimando rango de canon…" },
              { id: "verif", label: "Verificación", description: "Falta extracto bancario", error: true },
              { id: "pub", label: "Publicar", description: "Listo para publicar" },
            ]}
          />
        </Card>
      </Section>

      {/* ── §17K Heatmap (re-audit) ── */}
      <Section id="heatmap" title="§17K · Heatmap (re-audit)">
        <Card label="Ocupación · zona × mes">
          <Heatmap
            columns={["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]}
            legendCaption="Ocupación %"
            formatValue={(v) => `${v}`}
            rows={[
              { label: "Polanco", values: [72, 75, 78, 80, 82, 88, 90, 86, 84, 80, 79, 83] },
              { label: "Condesa", values: [64, 66, 70, 72, 74, 80, 82, 78, 76, 72, 70, 73] },
              { label: "Roma Norte", values: [58, 60, 62, 66, 70, 74, 76, 72, 70, 66, 64, 68] },
              { label: "Coyoacán", values: [41, 42, 45, 48, 52, 58, 60, 55, 52, 48, 46, 50] },
            ]}
          />
        </Card>
      </Section>

      {/* ── §17J Gauge (re-audit: tri-zona danger) ── */}
      <Section id="gauge" title="§17J · Gauge (re-audit: tri-zona)">
        <Card label="Asequibilidad — warning (30–40%) vs danger (>40%)">
          <div className="flex flex-wrap gap-12">
            <Gauge value={35.6} max={60} threshold={30} dangerThreshold={40} caption="renta / ingreso" minLabel="0%" maxLabel="60%" />
            <Gauge value={48} max={60} threshold={30} dangerThreshold={40} caption="renta / ingreso" minLabel="0%" maxLabel="60%" />
          </div>
        </Card>
      </Section>

      {/* ── §17H ContractTimeline (re-audit) ── */}
      <Section id="contract" title="§17H · Contract Timeline (re-audit)">
        <Card label="Vertical · con estado 'Por vencer' (warning)">
          <ContractTimeline
            milestones={[
              { title: "Firma", description: "Contrato firmado por ambas partes", date: "01 abr 2026", status: "done" },
              { title: "Depósito", description: "Depósito recibido", date: "03 abr 2026", status: "done" },
              { title: "Pagos", description: "Canon al día", date: "en curso", status: "current" },
              { title: "Renovación", description: "Vence en 20 días", date: "01 abr 2027", status: "warning" },
              { title: "Cierre", description: "Fin de contrato", status: "pending" },
            ]}
          />
        </Card>
        <Card label="Horizontal · compacto">
          <ContractTimeline
            orientation="horizontal"
            milestones={[
              { title: "Firma", date: "01 abr", status: "done" },
              { title: "Depósito", date: "03 abr", status: "done" },
              { title: "Pagos", date: "hoy", status: "current" },
              { title: "Renovación", date: "abr 27", status: "warning" },
              { title: "Cierre", date: "—", status: "pending" },
            ]}
          />
        </Card>
      </Section>

      <div className="h-20" />
    </div>
  );
}
