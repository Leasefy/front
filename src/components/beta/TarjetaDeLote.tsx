'use client';

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Collapse, Progress, RadioGroup, RadioGroupItem, StatusBadge, type SemanticTone } from '@leasefy/cadence';
import { CaretDown, CheckCircle, HourglassMedium, Info, MinusCircle, WarningCircle, XCircle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useBetaChatContext } from '@/lib/context/BetaChatContext';
import { useI18n } from '@/lib/i18n';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { respuestaDelLote, type ElegidoDelLote } from '@/lib/chat/acciones-del-hilo';
import { faltanDatos } from '@/lib/chat/plan-del-chat';
import { terminados, type EstadoDelItem, type EstadoDelLote, type ItemDelLote, type TarjetaDeLote as Lote } from '@/lib/chat/lote-del-chat';
import type { BotonDeLaTarjeta } from '@/lib/chat/tarjetas-de-ejecucion';
import type { ChatMessage } from '@/lib/types/beta-chat';
import { CajaDelChat } from './CajaDelChat';
import { CamposEnElChat, datosDeLosCampos, valoresIniciales } from './CamposEnElChat';
import { Estado, Pie, RiesgosDeLaAccion, useMandar } from './TarjetaDeEjecucion';

/**
 * TarjetaDeLote — la MISMA acción para varios, con UNA confirmación (Nico,
 * 29-10-2026: «si se le dice que le cobre a 3 o 4 o 100, lo haga»).
 *
 *   Propuesto  — el título con la cifra, la lista (las primeras a la vista y
 *                el resto en «Ver los N que faltan», dentro de la caja), cada
 *                una con su casilla para quitarla, los nombres que hay que
 *                escoger, lo que no entra y por qué, el riesgo y un solo
 *                «Sí, hazlo con N».
 *   Corriendo  — la MISMA tarjeta en la respuesta, con la barra «N de M»; se
 *                pone al día sola (`refrescarLote`) mientras el micro lo hace en
 *                segundo plano, y «Detener».
 *   Después    — «Hecho con 96 de 100; 3 fallaron (…)», lo que no se pudo,
 *                agrupado, y «Reintentar los que fallaron».
 *
 * Reglas de Nico que esto no puede romper:
 *   · Todo dentro del chat: cada botón es un MENSAJE DE LA PERSONA con la
 *     intención que trajo la tarjeta (`hacer_lote`, `cancelar_lote`,
 *     `reintentar_lote`, `seguir_lote`). Nada navega (guardián
 *     `chat-sin-salidas`).
 *   · UNA caja con cabecera, contenido y pie; sin scroll vertical propio
 *     (guardián `chat-sin-scroll-anidado`): lo largo se pliega con `Collapse`.
 *   · Ningún botón se inventa: «Sí, hazlo», «Detener», «Reintentar» y «Seguir»
 *     salen sólo si la tarjeta los trae (el micro ya filtró por permiso).
 */

const VISIBLES = 6;

const TONO_DEL_LOTE: Record<EstadoDelLote | 'contestado', SemanticTone> = {
  propuesto: 'info',
  contestado: 'neutral',
  ejecutando: 'neutral',
  programado: 'info',
  en_pausa: 'warning',
  hecho: 'success',
  cancelado: 'neutral',
  vencido: 'warning',
};

const TONO_DEL_ITEM: Record<EstadoDelItem, SemanticTone> = {
  listo: 'neutral',
  quitado: 'neutral',
  pendiente: 'neutral',
  en_curso: 'info',
  hecho: 'success',
  fallido: 'critical',
  omitido: 'neutral',
};

const ICONO_DEL_ITEM: Partial<Record<EstadoDelItem, ReactNode>> = {
  hecho: <CheckCircle weight="fill" className="size-4 shrink-0 text-success" aria-hidden />,
  fallido: <WarningCircle weight="fill" className="size-4 shrink-0 text-danger" aria-hidden />,
  en_curso: <HourglassMedium weight="duotone" className="size-4 shrink-0 text-fg-muted" aria-hidden />,
  omitido: <MinusCircle weight="duotone" className="size-4 shrink-0 text-fg-muted" aria-hidden />,
  quitado: <XCircle weight="duotone" className="size-4 shrink-0 text-fg-muted" aria-hidden />,
};

/** Cada cuánto se pregunta el avance mientras corre (el micro lo hace en segundo plano). */
const CADA_MS = 2500;

export function TarjetaDeLote({
  lote: p,
  message,
  posteriores,
}: {
  lote: Lote;
  message: Pick<ChatMessage, 'id' | 'ensayo'>;
  posteriores: ChatMessage[];
}) {
  const { t } = useI18n();
  const { mandar, ocupado } = useMandar();
  const { refrescarLote } = useBetaChatContext();
  const idBase = useId();
  const respuesta = respuestaDelLote(p.loteId, posteriores);
  const enEnsayo = message.ensayo === true || p.ensayo;
  const vencido = p.estado === 'propuesto' && !respuesta && p.venceEn !== null && Date.parse(p.venceEn) < Date.now();
  const esperando = p.estado === 'propuesto' && !respuesta && !vencido && !enEnsayo;

  // Lo que la persona decide ANTES de confirmar: a quién quita, entre homónimos a cuál, y lo de todos.
  const [quitados, setQuitados] = useState<ReadonlySet<number>>(() => new Set());
  const [elegidos, setElegidos] = useState<Record<number, string>>({});
  const [valores, setValores] = useState<Record<string, string>>(() => valoresIniciales(p.campos));
  const faltan = faltanDatos(p.campos, valores);
  const listos = p.items.filter((i) => i.estado === 'listo' && !quitados.has(i.n)).length;
  const conElegidos = listos + Object.values(elegidos).filter((v) => v && v !== 'ninguno').length;

  // Mientras corre en segundo plano: el avance, en SU mensaje (el micro lo hace; acá sólo se pregunta).
  const refrescar = useRef(refrescarLote);
  refrescar.current = refrescarLote;
  useEffect(() => {
    if (enEnsayo || respuesta) return;
    const enMarcha = p.estado === 'ejecutando';
    // En pausa o programado: UNA pregunta al volver (si ya se puede, el micro sigue solo).
    if (!enMarcha && p.estado !== 'en_pausa' && p.estado !== 'programado') return;
    let vivo = true;
    let reloj: ReturnType<typeof setTimeout> | undefined;
    const preguntar = async () => {
      try {
        await refrescar.current(message.id, p.loteId);
      } catch {
        // Sin respuesta esta vez: se vuelve a preguntar en el próximo turno del reloj.
      }
      if (vivo && enMarcha) reloj = setTimeout(preguntar, CADA_MS);
    };
    reloj = setTimeout(preguntar, enMarcha ? CADA_MS : 0);
    return () => {
      vivo = false;
      if (reloj) clearTimeout(reloj);
    };
  }, [p.estado, p.loteId, message.id, enEnsayo, respuesta]);

  const tocar = (b: BotonDeLaTarjeta, texto: string) => {
    if (!('loteId' in b.intencion)) return mandar(texto, b.intencion);
    const datos = datosDeLosCampos(p.campos, valores);
    const elegidosDelLote: ElegidoDelLote[] = Object.entries(elegidos).flatMap(([i, v]) => {
      if (!v || v === 'ninguno') return [];
      const [tipo, ...resto] = v.split(':');
      return [{ i: Number(i), tipo: tipo!, id: resto.join(':') }];
    });
    mandar(texto, {
      ...b.intencion,
      ...(quitados.size ? { quitar: [...quitados] } : {}),
      ...(elegidosDelLote.length ? { elegidos: elegidosDelLote } : {}),
      ...(Object.keys(datos).length ? { datos } : {}),
    });
  };

  const estado: EstadoDelLote | 'contestado' = p.estado === 'propuesto' && respuesta ? 'contestado' : vencido ? 'vencido' : p.estado;
  const hecho = terminados(p.progreso);

  const pie: ReactNode = esperando ? (
    <Pie>
      {p.hacer && (
        <Button size="sm" hideArrow disabled={ocupado || faltan || conElegidos === 0} onClick={() => tocar(p.hacer!, t('beta.enElChat.lote.mensaje.hacer', { n: formatNumber(conElegidos) }))}>
          {t('beta.enElChat.lote.hacer', { n: formatNumber(conElegidos) })}
        </Button>
      )}
      {p.cancelar && (
        <Button size="sm" variant="outline" hideArrow disabled={ocupado} onClick={() => mandar(t('beta.enElChat.lote.mensaje.no'), p.cancelar!.intencion)}>
          {t('beta.enElChat.lote.no')}
        </Button>
      )}
      {faltan && <p className="font-body text-[14px] text-fg-muted">{t('beta.enElChat.lote.llenaLoQueFalta')}</p>}
    </Pie>
  ) : !respuesta && !enEnsayo && (p.cancelar || p.reintentar || p.seguir) ? (
    <Pie>
      {p.seguir && (
        <Button size="sm" hideArrow disabled={ocupado} onClick={() => mandar(t('beta.enElChat.lote.mensaje.seguir'), p.seguir!.intencion)}>
          {p.seguir.etiqueta}
        </Button>
      )}
      {p.reintentar && (
        <Button size="sm" hideArrow disabled={ocupado} onClick={() => mandar(t('beta.enElChat.lote.mensaje.reintentar'), p.reintentar!.intencion)}>
          {p.reintentar.etiqueta}
        </Button>
      )}
      {p.cancelar && (
        <Button
          size="sm"
          variant="outline"
          hideArrow
          disabled={ocupado}
          onClick={() => mandar(t(p.estado === 'ejecutando' ? 'beta.enElChat.lote.mensaje.detener' : 'beta.enElChat.lote.mensaje.noSeguir'), p.cancelar!.intencion)}
        >
          {p.cancelar.etiqueta}
        </Button>
      )}
    </Pie>
  ) : respuesta ? (
    <Pie>
      <p className="font-body text-[14px] text-fg-muted">{t(`beta.enElChat.lote.yaRespondiste.${respuesta}`)}</p>
    </Pie>
  ) : vencido ? (
    <Pie>
      <p className="font-body text-[14px] text-fg-muted">{t('beta.enElChat.lote.vencido')}</p>
    </Pie>
  ) : undefined;

  return (
    <CajaDelChat
      role="region"
      aria-label={p.titulo || t('beta.enElChat.lote.lista')}
      data-testid="tarjeta-de-lote"
      data-estado={estado}
      titulo={p.verbo || t('beta.enElChat.lote.lista')}
      conteo={<Estado tono={TONO_DEL_LOTE[estado]} pulso={estado === 'ejecutando'} texto={t(`beta.enElChat.lote.estado.${estado}`)} ensayo={enEnsayo} />}
      pie={pie}
    >
      <p className="font-body text-[17px] leading-snug text-fg" data-testid="titulo-del-lote">
        {p.titulo}
      </p>
      {p.cita && <p className="mt-1 font-body text-[14px] leading-snug text-fg-muted">{t('beta.enElChat.lote.loQuePediste', { cita: p.cita })}</p>}
      {esperando && p.porQue && (
        <p className="mt-2 font-body text-[15px] leading-relaxed text-fg">
          {p.porQue} <strong className="font-medium">{p.pregunta}</strong>
        </p>
      )}

      {p.estado !== 'propuesto' && p.progreso.total > 0 && (
        <div className="mt-3" data-testid="avance-del-lote">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">{t('beta.enElChat.lote.avance')}</span>
            <span className="font-mono text-[13px] tabular-nums text-fg-muted">
              {t('beta.enElChat.lote.progreso', { hechos: formatNumber(hecho), total: formatNumber(p.progreso.total) })}
            </span>
          </div>
          <Progress className="mt-1.5" size="sm" value={hecho} max={p.progreso.total} label={t('beta.enElChat.lote.avance')} />
          {(p.resumen || p.espera) && <p className="mt-2 font-body text-[15px] leading-snug text-fg">{p.resumen ?? p.espera?.porQue}</p>}
        </div>
      )}

      <RiesgosDeLaAccion riesgo={p.riesgo} />

      {esperando && p.campos.length > 0 && (
        <div className="mt-4" data-testid="datos-del-lote">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">{t('beta.enElChat.lote.paraTodos')}</p>
          <CamposEnElChat campos={p.campos} valores={valores} onCambiar={(clave, v) => setValores((x) => ({ ...x, [clave]: v }))} idBase={`${idBase}-datos`} />
        </div>
      )}

      <ListaDelLote
        items={p.items}
        quitables={esperando}
        quitados={quitados}
        alternar={(n) =>
          setQuitados((x) => {
            const nuevo = new Set(x);
            if (nuevo.has(n)) nuevo.delete(n);
            else nuevo.add(n);
            return nuevo;
          })
        }
      />

      {p.porResolver.length > 0 && (
        <PorResolver lote={p} activo={esperando} elegidos={elegidos} elegir={(i, v) => setElegidos((x) => ({ ...x, [i]: v }))} idBase={idBase} />
      )}

      {p.noEntran.length > 0 && <Plegable titulo={t('beta.enElChat.lote.noEntran', { n: formatNumber(p.noEntran.reduce((s, g) => s + g.cuantos, 0)) })} grupos={p.noEntran} testId="no-entran" />}
      {p.fallas.length > 0 && p.estado !== 'propuesto' && (
        <Plegable titulo={t('beta.enElChat.lote.fallas', { n: formatNumber(p.progreso.fallidos) })} grupos={p.fallas.map((f) => ({ ...f, quienes: [] }))} testId="fallas-del-lote" abierto />
      )}

      {esperando && p.items.some((i) => !i.revisado) && (
        <Nota>{t('beta.enElChat.lote.revisarAlHacerlo', { n: formatNumber(p.items.filter((i) => !i.revisado).length) })}</Nota>
      )}
      {p.quedan > 0 && <Nota>{t('beta.enElChat.lote.quedan', { tope: formatNumber(p.tope), n: formatNumber(p.quedan) })}</Nota>}
      {enEnsayo && <Nota>{t('beta.enElChat.lote.ensayo')}</Nota>}
    </CajaDelChat>
  );
}

function Nota({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 flex items-start gap-2 font-body text-[14px] leading-snug text-fg-muted">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      {children}
    </p>
  );
}

/** La lista: las primeras a la vista; el resto, dentro de la misma caja con «Ver los N que faltan». */
function ListaDelLote({
  items,
  quitables,
  quitados,
  alternar,
}: {
  items: ItemDelLote[];
  quitables: boolean;
  quitados: ReadonlySet<number>;
  alternar: (n: number) => void;
}) {
  const { t } = useI18n();
  const [verTodos, setVerTodos] = useState(false);
  const idDelResto = useId();
  const [primeros, resto] = useMemo(() => [items.slice(0, VISIBLES), items.slice(VISIBLES)], [items]);
  if (items.length === 0) return null;
  const fila = (x: ItemDelLote) => <FilaDelLote key={x.n} item={x} quitable={quitables && x.quitable} quitado={quitados.has(x.n)} alternar={alternar} />;
  return (
    <div className="mt-4 border-t border-border-faint pt-3">
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
        {t('beta.enElChat.lote.lista')} · {formatNumber(items.length)}
      </p>
      <ul aria-label={t('beta.enElChat.lote.lista')} data-testid="lista-del-lote" className="mt-2 divide-y divide-border-faint">
        {primeros.map(fila)}
      </ul>
      {resto.length > 0 && (
        <>
          <Collapse id={idDelResto} open={verTodos}>
            <ul aria-label={t('beta.enElChat.lote.elResto')} className="divide-y divide-border-faint border-t border-border-faint">
              {resto.map(fila)}
            </ul>
          </Collapse>
          <Button
            size="sm"
            variant="ghost"
            hideArrow
            className="mt-1 gap-1.5 px-0"
            aria-expanded={verTodos}
            aria-controls={idDelResto}
            onClick={() => setVerTodos((v) => !v)}
          >
            <CaretDown aria-hidden className={cn('size-4 transition-transform duration-fast', verTodos && 'rotate-180')} />
            {verTodos ? t('beta.enElChat.lote.verMenos') : t('beta.enElChat.lote.verTodos', { n: formatNumber(resto.length) })}
          </Button>
        </>
      )}
    </div>
  );
}

function FilaDelLote({
  item: x,
  quitable,
  quitado,
  alternar,
}: {
  item: ItemDelLote;
  quitable: boolean;
  quitado: boolean;
  alternar: (n: number) => void;
}) {
  const { t } = useI18n();
  const id = useId();
  const estado: EstadoDelItem = quitado ? 'quitado' : x.estado;
  return (
    <li data-testid="item-del-lote" data-estado={estado} className="flex items-start gap-3 py-2.5">
      {quitable && (
        <Checkbox
          id={id}
          className="mt-0.5"
          checked={!quitado}
          onCheckedChange={() => alternar(x.n)}
          aria-label={quitado ? t('beta.enElChat.lote.volverAPoner', { nombre: x.etiqueta }) : t('beta.enElChat.lote.quitar', { nombre: x.etiqueta })}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <label htmlFor={quitable ? id : undefined} className={cn('min-w-0 break-words font-body text-[15px] leading-snug text-fg', quitado && 'text-fg-subtle line-through')}>
            {x.etiqueta}
          </label>
          {estado !== 'listo' && (
            <span className="inline-flex items-center gap-1.5">
              {ICONO_DEL_ITEM[estado]}
              {/* El estado nunca sólo con color: ícono + palabra. */}
              <StatusBadge tone={TONO_DEL_ITEM[estado]} pulse={estado === 'en_curso'}>
                {t(`beta.enElChat.lote.item.${estado}`)}
              </StatusBadge>
            </span>
          )}
        </div>
        {x.detalle && <p className="mt-0.5 font-body text-[14px] leading-snug text-fg-muted">{x.detalle}</p>}
        {x.resumen && estado !== 'listo' && estado !== 'quitado' && <p className="mt-1 font-body text-[14px] leading-snug text-fg">{x.resumen}</p>}
      </div>
    </li>
  );
}

/** Los nombres que no se resolvieron solos: entre homónimos se escoge AQUÍ; los demás, con su porqué. */
function PorResolver({
  lote: p,
  activo,
  elegidos,
  elegir,
  idBase,
}: {
  lote: Lote;
  activo: boolean;
  elegidos: Record<number, string>;
  elegir: (i: number, v: string) => void;
  idBase: string;
}) {
  const { t } = useI18n();
  return (
    <div data-testid="por-resolver" className="mt-4 space-y-3 border-t border-border-faint pt-3">
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">{t('beta.enElChat.lote.porResolver.titulo')}</p>
      {p.porResolver.map((x, i) =>
        x.motivo === 'ambiguo' && x.opciones.length > 0 ? (
          <fieldset key={`${x.nombre}-${i}`} className="min-w-0">
            <legend className="font-body text-[15px] leading-snug text-fg">
              {t('beta.enElChat.lote.porResolver.ambiguo', { nombre: x.nombre, n: formatNumber(x.opciones.length) })}
            </legend>
            <RadioGroup
              className="mt-2 gap-2"
              value={elegidos[i] ?? 'ninguno'}
              onValueChange={(v) => elegir(i, v)}
              disabled={!activo}
              aria-label={x.nombre}
            >
              {x.opciones.map((o) => {
                const valor = `${o.entidad.tipo}:${o.entidad.id}`;
                const id = `${idBase}-r${i}-${o.entidad.id}`;
                return (
                  <label key={valor} htmlFor={id} className="flex cursor-pointer items-start gap-2.5">
                    <RadioGroupItem value={valor} id={id} className="mt-0.5" />
                    <span className="min-w-0">
                      <span className="block break-words font-body text-[15px] leading-snug text-fg">{o.etiqueta}</span>
                      {o.detalle && <span className="block font-body text-[14px] leading-snug text-fg-muted">{o.detalle}</span>}
                    </span>
                  </label>
                );
              })}
              <label htmlFor={`${idBase}-r${i}-ninguno`} className="flex cursor-pointer items-start gap-2.5">
                <RadioGroupItem value="ninguno" id={`${idBase}-r${i}-ninguno`} className="mt-0.5" />
                <span className="font-body text-[15px] leading-snug text-fg-muted">{t('beta.enElChat.lote.porResolver.ninguno')}</span>
              </label>
            </RadioGroup>
          </fieldset>
        ) : (
          <p key={`${x.nombre}-${i}`} className="flex items-start gap-2 font-body text-[15px] leading-snug text-fg">
            <WarningCircle weight="duotone" className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
            {t(x.motivo === 'no_aparece' ? 'beta.enElChat.lote.porResolver.noAparece' : 'beta.enElChat.lote.porResolver.noSePudo', { nombre: x.nombre })}
          </p>
        ),
      )}
    </div>
  );
}

/** Lo que no entra (o no se pudo), agrupado por su porqué, plegado dentro de la misma caja. */
function Plegable({
  titulo,
  grupos,
  testId,
  abierto = false,
}: {
  titulo: string;
  grupos: Array<{ porQue: string; cuantos: number; quienes: string[] }>;
  testId: string;
  abierto?: boolean;
}) {
  const [ver, setVer] = useState(abierto);
  const id = useId();
  return (
    <div data-testid={testId} className="mt-4 border-t border-border-faint pt-2">
      <Button size="sm" variant="ghost" hideArrow className="gap-1.5 px-0" aria-expanded={ver} aria-controls={id} onClick={() => setVer((v) => !v)}>
        <CaretDown aria-hidden className={cn('size-4 transition-transform duration-fast', ver && 'rotate-180')} />
        {titulo}
      </Button>
      <Collapse id={id} open={ver} className="space-y-2 pb-1 pt-1">
        {grupos.map((g) => (
          <div key={g.porQue} className="font-body text-[14px] leading-snug">
            <p className="text-fg">
              <span className="font-mono tabular-nums">{formatNumber(g.cuantos)}</span> · {g.porQue}
            </p>
            {g.quienes.length > 0 && <p className="mt-0.5 break-words text-fg-muted">{g.quienes.join(', ')}</p>}
          </div>
        ))}
      </Collapse>
    </div>
  );
}
