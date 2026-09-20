'use client';

/**
 * Las condiciones del contrato que se deciden por contrato (Nico, 17-09):
 *
 *   · D9 · ¿pacta gastos de cobranza? Si no, la regla de gastos no se le cobra.
 *   · Seguro opcional que paga el inquilino: sólo con aceptación expresa (fecha
 *     y quién). Entra a su cuota como concepto aparte del canon. 🔴 Es un % DEL
 *     CANON (Nico, 17-09), no un valor fijo: el % lo pone la inmobiliaria por
 *     plan y la prima sube con el canon.
 *   · Póliza o afianzadora del contrato: se registra; no le cobra al inquilino.
 *   · Administración de la copropiedad: incluida en el canon, la paga el
 *     propietario, o la paga la inmobiliaria y se la descuenta al propietario.
 *     🔴 Un contrato MIGRADO que cobra administración y no eligió ninguna se
 *     lee como «la paga la inmobiliaria» (respaldo del 17-09): la pantalla lo
 *     dice, y elegir cualquier otra la reemplaza.
 *
 * Todo lo decide y lo cuenta el back (`/contracts/:id/condiciones`).
 */

import { useCallback, useEffect, useState } from 'react';
import { AunNoDisponible } from './AunNoDisponible';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { clasificarFallo } from '@/lib/errores/clasificar';
import {
  copropiedadesApi,
  nitLegible,
  type Copropiedad,
} from '@/lib/api/copropiedades.service';
import {
  cicloDeVidaApi,
  type CondicionesDelContrato as Condiciones,
  type ModalidadDeAdministracion,
} from '@/lib/api/ciclo-de-vida.service';
import { mensajeDelFallo } from '@/lib/contratos/fallo-de-accion';

const PESOS = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const MODALIDADES: { valor: ModalidadDeAdministracion | ''; nombre: string; ayuda: string }[] = [
  { valor: '', nombre: 'Como hoy', ayuda: 'La administración del mandato, si tiene, se le cobra al inquilino aparte del canon.' },
  { valor: 'INCLUIDA_EN_CANON', nombre: 'Incluida en el canon', ayuda: 'El inquilino paga sólo el canon.' },
  {
    valor: 'LA_PAGA_EL_PROPIETARIO',
    nombre: 'La paga el propietario',
    ayuda: 'Se le gira el canon completo (menos la comisión) y él paga la administración.',
  },
  {
    valor: 'LA_PAGA_LA_INMOBILIARIA',
    nombre: 'La paga la inmobiliaria',
    ayuda:
      'La inmobiliaria paga la administración y se la descuenta al propietario cada mes, después de la comisión. Si pasa lo que se le gira, se gira $0 y el resto sigue al mes siguiente.',
  },
];

function hoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function CondicionesDelContrato({ contractId, puedeEditar }: { contractId: string; puedeEditar: boolean }) {
  const [datos, setDatos] = useState<Condiciones | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setDatos(await cicloDeVidaApi.condiciones(contractId));
    } catch (e) {
      setError(e);
    }
  }, [contractId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const hacer = async (op: () => Promise<Condiciones>, exito: string) => {
    setOcupado(true);
    try {
      setDatos(await op());
      toast.success(exito);
    } catch (e) {
      toast.error('No se pudo guardar.', { description: mensajeDelFallo(e, 'Intenta de nuevo.') });
    } finally {
      setOcupado(false);
    }
  };

  if (error) {
    return (
      <section className="rounded-lg border border-border bg-card p-5" data-testid="condiciones-del-contrato">
        <FalloDeCarga error={error} queEs="las condiciones del contrato" onReintentar={cargar} enmarcado={false} />
      </section>
    );
  }
  if (!datos) return null;

  return (
    <section className="space-y-5 rounded-lg border border-border bg-card p-5" data-testid="condiciones-del-contrato">
      <h3 className="text-base font-semibold">Condiciones del contrato</h3>
      <GastosDeCobranza datos={datos} editable={puedeEditar && !ocupado} onCambiar={(pacta) =>
        void hacer(() => cicloDeVidaApi.fijarGastosDeCobranza(contractId, pacta), 'Gastos de cobranza guardados.')
      } />
      <SeguroOpcional
        datos={datos}
        editable={puedeEditar && !ocupado}
        onAceptar={(body) =>
          void hacer(
            () => cicloDeVidaApi.aceptarSeguroOpcional(contractId, body),
            'Seguro opcional aceptado: entra a las cuotas del inquilino.',
          )
        }
        onRetirar={() =>
          void hacer(() => cicloDeVidaApi.retirarSeguroOpcional(contractId), 'Seguro opcional retirado.')
        }
      />
      <Poliza
        datos={datos}
        editable={puedeEditar && !ocupado}
        onGuardar={(body) => void hacer(() => cicloDeVidaApi.registrarPoliza(contractId, body), 'Póliza guardada.')}
      />
      <Administracion
        datos={datos}
        editable={puedeEditar && !ocupado}
        onGuardar={(body) =>
          void hacer(
            () => cicloDeVidaApi.fijarAdministracionDeLaCopropiedad(contractId, body),
            'Administración guardada. Las cuotas se recalculan.',
          )
        }
      />
    </section>
  );
}

function GastosDeCobranza({
  datos,
  editable,
  onCambiar,
}: {
  datos: Condiciones;
  editable: boolean;
  onCambiar: (pacta: boolean | null) => void;
}) {
  const g = datos.gastosDeCobranza;
  const valor = g.delContrato === true ? 'SI' : g.delContrato === false ? 'NO' : 'HEREDA';
  const deLaAgencia =
    g.deLaAgencia === true ? 'sí los pacta' : g.deLaAgencia === false ? 'no los pacta' : 'no dice (se cobran como hoy)';
  return (
    <fieldset className="space-y-1 text-sm" disabled={!editable || !g.disponible} data-testid="gastos-de-cobranza">
      <legend className="font-medium">¿Pacta gastos de cobranza?</legend>
      <p className="text-xs text-muted-foreground">
        Si no los pacta, la regla de gastos de cobranza no se le cobra (el interés de mora sí). Tu inmobiliaria, por
        defecto, {deLaAgencia}.
      </p>
      <div className="flex flex-wrap gap-3 text-xs">
        {(
          [
            ['SI', true, 'Sí los pacta'],
            ['NO', false, 'No los pacta'],
            ['HEREDA', null, 'Lo que diga la inmobiliaria'],
          ] as const
        ).map(([clave, pacta, nombre]) => (
          <label key={clave} className="flex items-center gap-1">
            <input
              type="radio"
              name="pacta-gastos"
              checked={valor === clave}
              onChange={() => onCambiar(pacta)}
              data-testid={`pacta-gastos-${clave}`}
            />
            {nombre}
          </label>
        ))}
      </div>
      {g.resuelto === false && (
        <p className="text-xs text-plan-status-yellow" data-testid="gastos-no-pactados">
          Este contrato no causa gastos de cobranza.
        </p>
      )}
      {!g.disponible && (
        <AunNoDisponible
          testId="gastos-sin-migracion"
          queNoSePuede="cambiar esto desde el contrato"
          mientrasTanto="Se sigue haciendo lo que diga tu inmobiliaria en su configuración."
        />
      )}
    </fieldset>
  );
}

function SeguroOpcional({
  datos,
  editable,
  onAceptar,
  onRetirar,
}: {
  datos: Condiciones;
  editable: boolean;
  onAceptar: (body: {
    aceptadoPor: string;
    aceptadoEl: string;
    primaCop?: number | null;
    pct?: number | null;
  }) => void;
  onRetirar: () => void;
}) {
  const s = datos.seguroOpcional;
  const [casilla, setCasilla] = useState(false);
  const [quien, setQuien] = useState('');
  const [cuando, setCuando] = useState(hoy());
  const [prima, setPrima] = useState(s.oferta ? String(s.oferta.primaCop) : '');
  /** 🔴 El % del plan manda: con él la prima la calcula el back sobre el canon. */
  const pctDelPlan = s.oferta?.pct ?? null;
  return (
    <div className="space-y-2 border-t border-border pt-4 text-sm" data-testid="seguro-opcional">
      <p className="font-medium">Seguro opcional del inquilino</p>
      <p className="text-xs text-muted-foreground">
        Lo paga el inquilino, aparte del canon, sólo si lo acepta de forma expresa. No es la póliza del contrato.
      </p>
      {s.aceptado ? (
        <div className="space-y-1">
          <p>
            <strong>{s.aceptado.nombre ?? 'Seguro opcional'}</strong>: {PESOS.format(s.aceptado.primaCop)} al mes
            {s.aceptado.pct !== null ? ` (${s.aceptado.pct} % del canon)` : ''}.
          </p>
          {s.aceptado.pct !== null && (
            <p className="text-xs text-muted-foreground" data-testid="seguro-sigue-al-canon">
              Es un porcentaje del canon: cuando el canon suba en el aniversario, la prima sube con él.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Aceptado por {s.aceptado.aceptadoPor} el {s.aceptado.aceptadoEl}.
          </p>
          {editable && s.disponible && (
            <Button size="sm" variant="ghost" onClick={onRetirar}>
              Retirar el seguro
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs">
            {s.oferta
              ? `Plan ofrecido: ${s.oferta.nombre}, ${PESOS.format(s.oferta.primaCop)} al mes${
                  pctDelPlan !== null ? ` (${pctDelPlan} % del canon de hoy)` : ''
                }. No se cobra mientras el inquilino no lo acepte.`
              : 'El contrato no ofrece un plan de seguro.'}
          </p>
          {s.oferta && pctDelPlan === null && s.porcentajeDisponible && (
            <p className="text-xs text-muted-foreground" data-testid="seguro-sin-porcentaje">
              Tu inmobiliaria no le puso un porcentaje del canon a este plan: se cobraría la prima fija. El porcentaje
              se configura en Configuración → Ciclo de vida del contrato.
            </p>
          )}
          {editable && s.disponible && (
            <>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={casilla} onChange={(e) => setCasilla(e.target.checked)} data-testid="acepta-seguro" />
                El inquilino aceptó expresamente el seguro opcional
              </label>
              {casilla && (
                <div className="flex flex-wrap items-end gap-2">
                  <label className="text-xs">
                    Quién aceptó
                    <Input value={quien} onChange={(e) => setQuien(e.target.value)} className="mt-1 w-56" data-testid="seguro-quien" />
                  </label>
                  <label className="text-xs">
                    Fecha
                    <Input type="date" value={cuando} onChange={(e) => setCuando(e.target.value)} className="mt-1" />
                  </label>
                  {pctDelPlan === null ? (
                    <label className="text-xs">
                      Prima mensual
                      <Input inputMode="numeric" value={prima} onChange={(e) => setPrima(e.target.value)} className="mt-1 w-32" />
                    </label>
                  ) : (
                    <p className="text-xs" data-testid="seguro-prima-por-porcentaje">
                      Prima: <strong>{PESOS.format(s.oferta?.primaCop ?? 0)}</strong> al mes ({pctDelPlan} % del
                      canon). La calcula el sistema y sigue al canon.
                    </p>
                  )}
                  <Button
                    size="sm"
                    disabled={
                      quien.trim().length < 3 ||
                      !cuando ||
                      (pctDelPlan === null && !(Number(prima.replace(/\D/g, '')) > 0))
                    }
                    onClick={() =>
                      onAceptar(
                        pctDelPlan === null
                          ? {
                              aceptadoPor: quien.trim(),
                              aceptadoEl: cuando,
                              primaCop: Number(prima.replace(/\D/g, '')),
                            }
                          : { aceptadoPor: quien.trim(), aceptadoEl: cuando },
                      )
                    }
                    data-testid="guardar-seguro"
                  >
                    Registrar la aceptación
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
      {!s.disponible && (
        <AunNoDisponible
          testId="seguro-sin-migracion"
          queNoSePuede="registrar un plan de seguro para el inquilino"
          mientrasTanto="El contrato sigue sin ofrecerlo, que es como está hoy."
        />
      )}
    </div>
  );
}

function Poliza({
  datos,
  editable,
  onGuardar,
}: {
  datos: Condiciones;
  editable: boolean;
  onGuardar: (body: {
    aseguradora: string | null;
    numero: string | null;
    cobertura: string | null;
    vigenciaDesde: string | null;
    vigenciaHasta: string | null;
  }) => void;
}) {
  const p = datos.poliza;
  const [aseguradora, setAseguradora] = useState(p.aseguradora ?? '');
  const [numero, setNumero] = useState(p.numero ?? '');
  const [cobertura, setCobertura] = useState(p.cobertura ?? '');
  const [desde, setDesde] = useState(p.vigenciaDesde ?? '');
  const [hasta, setHasta] = useState(p.vigenciaHasta ?? '');
  const habil = editable && p.disponible;
  return (
    <div className="space-y-2 border-t border-border pt-4 text-sm" data-testid="poliza-del-contrato">
      <p className="font-medium">Póliza o afianzadora del contrato</p>
      <p className="text-xs text-muted-foreground">
        Su prima la paga la inmobiliaria dentro de su porcentaje de administración: no se le cobra al inquilino.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs">
          Aseguradora
          <Input value={aseguradora} onChange={(e) => setAseguradora(e.target.value)} disabled={!habil} className="mt-1 w-48" />
        </label>
        <label className="text-xs">
          Número
          <Input value={numero} onChange={(e) => setNumero(e.target.value)} disabled={!habil} className="mt-1 w-32" />
        </label>
        <label className="text-xs">
          Desde
          <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} disabled={!habil} className="mt-1" />
        </label>
        <label className="text-xs">
          Hasta
          <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} disabled={!habil} className="mt-1" />
        </label>
      </div>
      <label className="block text-xs">
        Cobertura
        <Input value={cobertura} onChange={(e) => setCobertura(e.target.value)} disabled={!habil} className="mt-1" />
      </label>
      {habil && (
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            onGuardar({
              aseguradora: aseguradora.trim() || null,
              numero: numero.trim() || null,
              cobertura: cobertura.trim() || null,
              vigenciaDesde: desde || null,
              vigenciaHasta: hasta || null,
            })
          }
          data-testid="guardar-poliza"
        >
          Guardar póliza
        </Button>
      )}
    </div>
  );
}

function Administracion({
  datos,
  editable,
  onGuardar,
}: {
  datos: Condiciones;
  editable: boolean;
  onGuardar: (body: { modalidad: ModalidadDeAdministracion | null; valorCop?: number | null }) => void;
}) {
  const a = datos.administracion;
  /*
   * La modalidad RESUELTA, no la guardada: la pantalla muestra lo que de verdad
   * está pasando hoy. Con el respaldo puesto, el aviso de abajo dice que no
   * está escrito y «Guardar» lo deja por escrito con un clic.
   */
  const [modalidad, setModalidad] = useState<ModalidadDeAdministracion | ''>(a.modalidad ?? '');
  const [valor, setValor] = useState(a.valorCop != null ? String(a.valorCop) : '');
  const habil = editable && a.disponible;
  const pagaLaInmobiliaria = modalidad === 'LA_PAGA_LA_INMOBILIARIA';
  const valorNum = Number(valor.replace(/\D/g, ''));
  return (
    <fieldset className="space-y-2 border-t border-border pt-4 text-sm" disabled={!habil} data-testid="administracion-de-la-copropiedad">
      <legend className="font-medium">Administración de la copropiedad</legend>
      {a.delMandatoCop != null && a.delMandatoCop > 0 && (
        <p className="text-xs text-muted-foreground">La administración del mandato es {PESOS.format(a.delMandatoCop)}.</p>
      )}

      {/* 🔴 20-09 · A QUÉ copropiedad. Este bloque decía «la administración de
          la copropiedad» y nunca decía cuál, y sin ese dato la cuota se
          asienta en el libro SIN TERCERO: es lo que tenía a la cuenta 2815 con
          1.241 líneas sin dueño y la exógena trabada por ellas. */}
      <ACualCopropiedad
        consignacionId={a.consignacionId}
        copropiedad={a.copropiedad}
        sePuede={a.sePuedeDeclararLaCopropiedad}
        editable={editable}
      />
      {a.porRespaldo && (
        <p className="text-xs text-plan-status-yellow" data-testid="administracion-por-respaldo">
          Este contrato viene del sistema anterior y cobra administración, así que hoy se trata como{' '}
          <strong>«la paga la inmobiliaria»</strong>: el inquilino no la paga aparte del canon y se le descuenta al
          propietario cada mes. No está guardado: elige una modalidad para dejarlo por escrito.
        </p>
      )}
      <div className="space-y-1">
        {MODALIDADES.map((m) => (
          <label key={m.valor || 'hoy'} className="flex items-start gap-2 text-xs">
            <input
              type="radio"
              name="modalidad-administracion"
              checked={modalidad === m.valor}
              onChange={() => setModalidad(m.valor)}
              className="mt-0.5"
              data-testid={`modalidad-${m.valor || 'HOY'}`}
            />
            <span>
              <strong>{m.nombre}</strong> — {m.ayuda}
            </span>
          </label>
        ))}
      </div>
      {pagaLaInmobiliaria && (
        <label className="block text-xs">
          Valor mensual de la administración
          <Input inputMode="numeric" value={valor} onChange={(e) => setValor(e.target.value)} className="mt-1 w-40" data-testid="valor-administracion" />
        </label>
      )}
      {habil && (
        <Button
          size="sm"
          variant="outline"
          disabled={pagaLaInmobiliaria && !(valorNum > 0)}
          onClick={() =>
            onGuardar({
              modalidad: modalidad === '' ? null : modalidad,
              ...(pagaLaInmobiliaria ? { valorCop: valorNum } : {}),
            })
          }
          data-testid="guardar-administracion"
        >
          Guardar administración
        </Button>
      )}
      {!a.disponible && (
        <AunNoDisponible
          testId="administracion-sin-migracion"
          queNoSePuede="cambiar quién paga la administración"
          mientrasTanto="Se cobra como hoy: aparte del canon, al inquilino."
        />
      )}
    </fieldset>
  );
}


/**
 * A qué copropiedad pertenece el inmueble de este mandato.
 *
 * No es un adorno del bloque de administración: es lo que le permite al libro
 * decir de quién es la cuota. Sin él, el movimiento a la 28150510 queda sin
 * tercero, «Reportes → Terceros» lo cuenta entre los que no se sabe de quién
 * son, y la exógena se traba — a propósito, porque reportarle esa plata a un
 * NIT equivocado es una sanción de la DIAN.
 */
function ACualCopropiedad({
  consignacionId,
  copropiedad,
  sePuede,
  editable,
}: {
  consignacionId: string | null;
  copropiedad: { id: string; nombre: string; nit: string; digitoVerificacion: number | null } | null;
  sePuede: boolean;
  editable: boolean;
}) {
  const [opciones, setOpciones] = useState<Copropiedad[] | null>(null);
  const [elegida, setElegida] = useState(copropiedad?.id ?? '');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setElegida(copropiedad?.id ?? '');
  }, [copropiedad?.id]);

  useEffect(() => {
    if (!sePuede || !editable) return;
    let vivo = true;
    /* `try/catch` alrededor del `await` y no un `.catch()` colgado: si la
       llamada falla ANTES de devolver la promesa, un `.catch()` no la ve y el
       componente se cae con la ficha entera adentro. Que no se pueda listar
       las copropiedades no puede tumbar las condiciones del contrato. */
    void (async () => {
      try {
        const r = await copropiedadesApi.listar();
        if (vivo) setOpciones(r?.copropiedades ?? []);
      } catch {
        if (vivo) setOpciones([]);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [sePuede, editable]);

  if (!sePuede) {
    return (
      <p className="text-xs text-muted-foreground" data-testid="copropiedad-sin-migracion">
        Todavía no se puede decir a qué copropiedad pertenece este inmueble: falta una migración de
        base de datos que aplica Víctor. Mientras tanto la cuota se asienta sin tercero, como hoy.
      </p>
    );
  }

  async function guardar(id: string) {
    if (!consignacionId) return;
    setGuardando(true);
    try {
      await copropiedadesApi.asignarAMandato(consignacionId, id === '' ? null : id);
      setElegida(id);
      toast.success(
        id === ''
          ? 'El inmueble quedó sin copropiedad. Su cuota de administración se va a asentar sin tercero.'
          : 'Listo: de ahora en adelante la cuota de administración de este inmueble se asienta a nombre de esa copropiedad.',
      );
    } catch (e) {
      toast.error(clasificarFallo(e).descripcion);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-1" data-testid="a-cual-copropiedad">
      <label className="block text-xs" htmlFor="copropiedad-del-mandato">
        ¿A qué copropiedad pertenece el inmueble?
      </label>
      <select
        id="copropiedad-del-mandato"
        className="h-9 w-full max-w-sm rounded-md border border-border bg-surface px-2 text-xs text-fg"
        value={elegida}
        disabled={!editable || guardando || !consignacionId}
        onChange={(e) => void guardar(e.target.value)}
        data-testid="elegir-copropiedad"
      >
        <option value="">A ninguna (casa independiente)</option>
        {(opciones ?? (copropiedad ? [copropiedad as Copropiedad] : [])).map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre} — NIT {nitLegible(c)}
          </option>
        ))}
      </select>
      {elegida === '' ? (
        <p className="text-xs text-plan-status-yellow" data-testid="copropiedad-sin-declarar">
          Sin copropiedad, la cuota de administración entra al libro sin decir de quién es, y eso es
          lo que traba la exógena. Las copropiedades se registran en Contabilidad → Copropiedades.
        </p>
      ) : null}
    </div>
  );
}
