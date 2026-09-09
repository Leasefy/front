'use client';

/**
 * «A N inquilinos no les llegó su invitación» — el aviso y el cajón que la manda.
 *
 * ── Por qué esta pantalla existe ────────────────────────────────────────────
 *
 * Una cuenta creada por la migración existe pero su dueño no puede entrar:
 * nunca eligió una contraseña. Lo único que la vuelve utilizable es el correo
 * con el enlace. El 8 de septiembre de 2026 se crearon 1.470 cuentas de
 * inquilino y salieron 24 correos, y no había forma de enterarse: la lista de
 * inquilinos los mostraba igual, como si estuvieran adentro.
 *
 * ── Dos decisiones ──────────────────────────────────────────────────────────
 *
 * 1. **El aviso sólo aparece cuando hay pendientes.** No es una sección del
 *    menú: es una deuda que se salda y desaparece. Una pantalla vacía
 *    permanente enseña a ignorarla.
 * 2. **Se manda por tandas y se dice cuánto falta.** El back manda de a 100
 *    por llamada; acá el botón sigue llamando mientras `restantes > 0` y la
 *    barra dice el número real. Mandar 100 sobre 1.500 y decir «listo» es
 *    volver a dejar a 1.400 personas afuera creyendo lo contrario.
 */

import { useCallback, useEffect, useState } from 'react';
import { EnvelopeSimple, PaperPlaneTilt, Warning } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import {
  Cajon,
  CajonCabecera,
  CajonCuerpo,
  CajonPie,
} from '@/components/ui/cajon';
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import {
  invitacionesApi,
  type PersonaPendiente,
} from '@/lib/api/invitaciones.service';

/** Cuántas filas se listan en el cajón. El total real va en la cabecera. */
const A_LA_VISTA = 50;

function comoFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
  });
}

export function InvitacionesPendientes() {
  const [total, setTotal] = useState<number | null>(null);
  const [personas, setPersonas] = useState<PersonaPendiente[]>([]);
  const [cargando, setCargando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [mandando, setMandando] = useState(false);
  /** Cuántas salieron en la corrida actual, para la línea de progreso. */
  const [yaSalieron, setYaSalieron] = useState(0);
  const [reenviando, setReenviando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await invitacionesApi.pendientes({ limite: A_LA_VISTA });
      setTotal(r.total);
      setPersonas(r.personas);
    } catch {
      /* Sin permiso o sin red: el aviso simplemente no se pinta. Un error
         rojo permanente sobre algo que nadie pidió es ruido. */
      setTotal(0);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /**
   * Manda hasta agotar, llamando por tandas.
   *
   * 🔴 El corte por vueltas no es una optimización: sin él, un fallo que deja
   * la fila pendiente para siempre convierte esto en un bucle infinito que
   * manda correos sin parar.
   */
  const mandarTodas = useCallback(async () => {
    setMandando(true);
    setYaSalieron(0);
    let salieron = 0;
    let quedan = total ?? 0;
    try {
      for (let vuelta = 0; vuelta < 40; vuelta += 1) {
        const r = await invitacionesApi.enviar({});
        salieron += r.enviadas;
        quedan = r.restantes;
        setYaSalieron(salieron);
        setTotal(r.restantes);
        // Ninguna salió en esta vuelta: seguir sería repetir la misma tanda.
        if (r.enviadas === 0 || r.restantes === 0) break;
      }
      if (salieron > 0) {
        toast.success(
          salieron === 1
            ? 'Salió 1 invitación'
            : `Salieron ${salieron} invitaciones`,
          {
            description:
              quedan > 0
                ? `Quedan ${quedan} por mandar. Vuelve a intentarlo.`
                : 'Ya no queda ninguna pendiente.',
          },
        );
      } else {
        toast.error('No salió ninguna invitación', {
          description:
            'Revisa que el correo del servidor esté configurado y vuelve a intentarlo.',
        });
      }
    } catch {
      toast.error('No se pudieron mandar las invitaciones');
    } finally {
      setMandando(false);
      void cargar();
    }
  }, [total, cargar]);

  const reenviarUna = useCallback(
    async (persona: PersonaPendiente) => {
      setReenviando(persona.id);
      try {
        const r = await invitacionesApi.enviar({ userIds: [persona.id] });
        if (r.enviadas === 1) {
          toast.success(`Invitación enviada a ${persona.correo}`);
        } else {
          toast.error(`No salió la invitación a ${persona.correo}`, {
            description: r.resultados[0]?.motivo,
          });
        }
      } catch {
        toast.error(`No salió la invitación a ${persona.correo}`);
      } finally {
        setReenviando(null);
        void cargar();
      }
    },
    [cargar],
  );

  // Nada pendiente (o todavía sin saberlo): no hay nada que decir.
  if (total === null || total === 0) return null;

  return (
    <>
      <div
        data-testid="invitaciones-pendientes"
        className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-border bg-surface-muted p-4"
      >
        <div className="flex min-w-0 items-start gap-3">
          <Warning
            className="mt-0.5 h-5 w-5 flex-shrink-0 text-fg-muted"
            weight="duotone"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-fg">
              {total === 1
                ? 'A 1 inquilino no le ha llegado su invitación al portal'
                : `A ${total} inquilinos no les ha llegado su invitación al portal`}
            </p>
            <p className="mt-0.5 text-sm text-fg-muted">
              Su cuenta está creada, pero sin ese correo no pueden poner su
              contraseña ni entrar a ver su contrato.
            </p>
          </div>
        </div>
        <Button
          hideArrow
          variant="outline"
          className="shrink-0 gap-2"
          onClick={() => setAbierto(true)}
          data-testid="ver-invitaciones-pendientes"
        >
          <EnvelopeSimple className="h-4 w-4" weight="bold" aria-hidden="true" />
          Ver y enviar
        </Button>
      </div>

      <Cajon
        abierto={abierto}
        onOpenChange={setAbierto}
        ancho="sm:max-w-2xl"
        data-testid="cajon-invitaciones"
      >
        <CajonCabecera
          titulo="Invitaciones al portal"
          descripcion={
            total === 1
              ? '1 inquilino con la cuenta creada y sin invitación entregada.'
              : `${total} inquilinos con la cuenta creada y sin invitación entregada.`
          }
        />

        <CajonCuerpo>
          {cargando ? (
            <EsqueletoTabla columnas={3} filas={6} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Persona</TableHead>
                  <TableHead>Cuenta creada</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {personas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-sm text-fg-muted">
                      No queda ninguna pendiente.
                    </TableCell>
                  </TableRow>
                ) : (
                  personas.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <span className="block text-sm font-medium text-fg">
                          {p.nombre ?? p.correo}
                        </span>
                        {p.nombre ? (
                          <span className="block text-xs text-fg-muted">{p.correo}</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm text-fg-muted">
                        {comoFecha(p.creada)}
                        {/* Que ya haya salido una y siga pendiente significa
                            que esa no llegó: decirlo evita que alguien crea
                            que el botón no hizo nada. */}
                        {p.ultimoEnvio ? (
                          <span className="block text-xs">
                            Se intentó el {comoFecha(p.ultimoEnvio)}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          hideArrow
                          variant="ghost"
                          size="sm"
                          className="gap-1.5"
                          disabled={reenviando === p.id || mandando}
                          onClick={() => void reenviarUna(p)}
                        >
                          <PaperPlaneTilt className="h-4 w-4" aria-hidden="true" />
                          {reenviando === p.id ? 'Enviando…' : 'Enviar'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {total > personas.length ? (
            <p className="mt-3 text-xs text-fg-muted">
              Se listan las {personas.length} más recientes. «Enviar a todos»
              las cubre todas, incluidas las {total - personas.length} que no
              están en pantalla.
            </p>
          ) : null}
        </CajonCuerpo>

        <CajonPie
          ayuda={
            mandando
              ? `Enviando… ${yaSalieron} de ${yaSalieron + (total ?? 0)}`
              : 'Cada persona recibe un enlace para poner su contraseña. Vence en 24 horas.'
          }
        >
          <Button variant="outline" hideArrow onClick={() => setAbierto(false)}>
            Cerrar
          </Button>
          <Button
            hideArrow
            className="gap-2"
            disabled={mandando || total === 0}
            onClick={() => void mandarTodas()}
            data-testid="enviar-todas-las-invitaciones"
          >
            <PaperPlaneTilt className="h-4 w-4" weight="bold" aria-hidden="true" />
            {mandando ? 'Enviando…' : `Enviar a todos (${total})`}
          </Button>
        </CajonPie>
      </Cajon>
    </>
  );
}
