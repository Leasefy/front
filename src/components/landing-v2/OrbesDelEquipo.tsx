"use client";

import { AgentOrb, type AgentOrbPaletteName } from "@leasefy/cadence";
import { ORBE_DEL_ORQUESTADOR } from "@/lib/agentes/nombre-del-orquestador";

/**
 * Ori y su equipo, en fila: los mismos orbes del producto (paletas y semillas
 * del registro, `src/lib/agentes/equipo.ts`). Para «Plataforma completa».
 */
const EQUIPO: readonly { nombre: string; paleta: AgentOrbPaletteName; semilla: string; orquestador?: boolean }[] = [
  { nombre: "Ori", paleta: ORBE_DEL_ORQUESTADOR.paleta, semilla: ORBE_DEL_ORQUESTADOR.semilla, orquestador: true },
  { nombre: "Mori", paleta: "coral", semilla: "cobranza" },
  { nombre: "Cobri", paleta: "jade", semilla: "pagos" },
  { nombre: "Niti", paleta: "marigold", semilla: "calidad" },
  { nombre: "Fixi", paleta: "tangerine", semilla: "mantenimiento" },
];

export function OrbesDelEquipo() {
  return (
    <div className="mod-orbes" aria-label="Ori, Mori, Cobri, Niti y Fixi">
      <span className="mod-orbes-fila" aria-hidden="true">
        {EQUIPO.map((a) => (
          <span key={a.nombre} className="mod-orbe" title={a.nombre}>
            <AgentOrb palette={a.paleta} seed={a.semilla} variant={a.orquestador ? "orchestrator" : "agent"} state="working" size={a.orquestador ? 40 : 30} label={null} />
          </span>
        ))}
      </span>
      <span className="mod-orbes-texto">Ori y su equipo</span>
    </div>
  );
}
