'use client';

/**
 * «Links de pago (Cobri)» — el estado del link de cada cuota del mes.
 *
 * Vive en dos pantallas: en Cartera › Cobros emitidos (con su propio mes,
 * porque la tabla de cobros es de DOCUMENTOS y no trae la cuota) y en
 * «Agente de pagos», donde el mes lo comparte con la frase del resumen. Por eso
 * el mes puede venir de afuera (`mes` + `onCambiarMes`) o llevarlo la sección.
 *
 * El mes, el estado, la tabla y el pie son UNA tarjeta: la barra de arriba
 * gobierna lo que tiene debajo (Nico, 21-09: «el mes y la tabla deberían ser
 * una sola cosa»). Sin botón «Enviar link»: los links los manda el cron.
 */

import { useId, useState, type ReactNode } from 'react';
import { CaretLeft, CaretRight, LinkSimple } from '@phosphor-icons/react';
import { IconButton } from '@leasefy/cadence';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla';
import { SinDatos } from '@/components/estado/SinDatos';
import { TablePagination } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatCurrency, formatDate } from '@/lib/format';
import { useLinksDePago } from '@/lib/hooks/use-payu';
import { useI18n } from '@/lib/i18n';
import { mesTopeDeLosLinks } from '@/lib/payu/links-de-pago';
import { mesActual, sumarMeses } from '@/lib/recaudo/meses';
import { mesEnTitulo, nombreDelMes } from '@/lib/utils/mes';
import {
  ESTADOS_DEL_LINK_DE_PAGO,
  type EstadoDelLinkDePago,
  type LinkDePagoDeCuota,
} from '@/lib/types/payu';

import { EstadoDelLink } from './EstadoDelLink';

const P = 'inmobiliaria.cobros.linksDePago';

/** 20 es el tamaño por defecto del back (`payu-api-front.md`). */
export const TAMANOS_DE_PAGINA = [10, 20, 50];
const TAMANO_POR_DEFECTO = 20;
const TODOS = 'todos';

export interface LinksDePagoProps {
  /** El mes `YYYY-MM`. Sin él, la sección lleva el suyo (arranca en el corriente). */
  mes?: string;
  onCambiarMes?: (mes: string) => void;
  /** Lo que va entre la barra y la tabla: en «Agente de pagos», la frase del mes. */
  resumen?: ReactNode;
}

export function LinksDePago({ mes: mesDeAfuera, onCambiarMes, resumen }: LinksDePagoProps) {
  const { t, locale } = useI18n();
  const idDelTitulo = useId();
  const esMovil = useIsMobile();

  const [mesPropio, setMesPropio] = useState(() => mesActual());
  const mes = mesDeAfuera ?? mesPropio;
  const cambiarMes = (siguiente: string) =>
    onCambiarMes ? onCambiarMes(siguiente) : setMesPropio(siguiente);

  const [estado, setEstado] = useState<EstadoDelLinkDePago | undefined>(undefined);
  const [limit, setLimit] = useState(TAMANO_POR_DEFECTO);
  /*
   * La página vale sólo para los filtros con que se eligió: cambiar de mes o de
   * estado vuelve a la 1 en el MISMO render, sin pedir antes la página 3 del
   * mes nuevo (que llegaría vacía y se leería como «no hay nada»).
   */
  const alcance = `${mes}|${estado ?? ''}|${limit}`;
  const [pagina, setPagina] = useState({ alcance, n: 1 });
  const page = pagina.alcance === alcance ? pagina.n : 1;

  const { data, cargando, error, recargar } = useLinksDePago({ mes, estado, page, limit });

  const tope = mesTopeDeLosLinks();
  const puedeAvanzar = mes < tope;
  const localeCorto = locale === 'en' ? 'en' : 'es';
  const total = data?.total ?? 0;

  return (
    <section
      aria-labelledby={idDelTitulo}
      className="rounded-lg border border-border bg-surface"
      data-testid="links-de-pago"
    >
      <header className="space-y-1 border-b border-border px-4 py-3">
        <h2 id={idDelTitulo} className="text-subtitle text-fg">
          {t('inmobiliaria.cobros.linksDePago.titulo')}
        </h2>
        <p className="max-w-3xl text-body-sm text-fg-muted">{t('inmobiliaria.cobros.linksDePago.descripcion')}</p>
      </header>

      {/* A 390 px la barra se parte en líneas: mes arriba, conteo y estado abajo. */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3"
        data-testid="barra-de-links-de-pago"
      >
        <div className="flex items-center gap-1">
          <IconButton
            variant="ghost"
            icon={<CaretLeft className="h-4 w-4" />}
            aria-label={t('inmobiliaria.cobros.linksDePago.mesAnterior')}
            onClick={() => cambiarMes(sumarMeses(mes, -1))}
          />
          <span
            className="min-w-[8.5rem] text-center text-sm font-medium tabular-nums text-fg"
            data-testid="mes-de-los-links"
          >
            {mesEnTitulo(mes, localeCorto)}
          </span>
          <IconButton
            variant="ghost"
            icon={<CaretRight className="h-4 w-4" />}
            aria-label={t('inmobiliaria.cobros.linksDePago.mesSiguiente')}
            disabled={!puedeAvanzar}
            title={puedeAvanzar ? undefined : t('inmobiliaria.cobros.linksDePago.mesTope')}
            onClick={() => puedeAvanzar && cambiarMes(sumarMeses(mes, 1))}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {data && (
            <span className="text-caption tabular-nums text-fg-muted" data-testid="conteo-de-links">
              {total === 1 ? t('inmobiliaria.cobros.linksDePago.conteoUno') : t('inmobiliaria.cobros.linksDePago.conteoVarios', { total })}
            </span>
          )}
          <Select
            value={estado ?? TODOS}
            onValueChange={(v) => setEstado(v === TODOS ? undefined : (v as EstadoDelLinkDePago))}
          >
            <SelectTrigger className="w-52" aria-label={t('inmobiliaria.cobros.linksDePago.filtroEstado')} data-testid="filtro-de-estado-del-link">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>{t('inmobiliaria.cobros.linksDePago.todos')}</SelectItem>
              {ESTADOS_DEL_LINK_DE_PAGO.map((e) => (
                <SelectItem key={e} value={e}>
                  {t(`${P}.estado.${e}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {resumen ? <div className="border-b border-border px-4 py-3">{resumen}</div> : null}

      <EstadoDeDatos
        cargando={cargando && !data}
        error={error}
        queEs="los links de pago"
        onReintentar={recargar}
        vacio={Boolean(data) && total === 0}
        esqueleto={<EsqueletoTabla filas={5} columnas={4} />}
        cuandoVacio={
          estado ? (
            <SinDatos queSon="cuotas" hayFiltros onLimpiarFiltros={() => setEstado(undefined)} />
          ) : (
            <SinDatos
              queSon="cuotas"
              icono={LinkSimple}
              titulo={t('inmobiliaria.cobros.linksDePago.vacioTitulo', { mes: nombreDelMes(mes, localeCorto) })}
              descripcion={t('inmobiliaria.cobros.linksDePago.vacioDescripcion')}
            />
          )
        }
      >
        {data &&
          (esMovil ? (
            <ListaDeLinks items={data.items} />
          ) : (
            <TablaDeLinks items={data.items} />
          ))}
      </EstadoDeDatos>

      {data && total > 0 && (
        <div className="border-t border-border px-4 py-3">
          <TablePagination
            total={total}
            page={page}
            pageSize={limit}
            pageSizeOptions={TAMANOS_DE_PAGINA}
            onPageChange={(n) => setPagina({ alcance, n })}
            onPageSizeChange={setLimit}
          />
        </div>
      )}
    </section>
  );
}

function Cuota({ link }: { link: LinkDePagoDeCuota }) {
  const { t } = useI18n();
  return (
    <div className="min-w-0">
      <p className="font-medium text-fg">{link.inquilino}</p>
      <p className="text-caption text-fg-muted">
        {t('inmobiliaria.cobros.linksDePago.contrato', { numero: link.contratoNumero })} · {link.inmueble}
      </p>
    </div>
  );
}

function TablaDeLinks({ items }: { items: LinkDePagoDeCuota[] }) {
  const { t, locale } = useI18n();
  const localeCorto = locale === 'en' ? 'en' : 'es';
  return (
    <Table data-testid="tabla-de-links">
      <TableHeader>
        <TableRow>
          <TableHead>{t('inmobiliaria.cobros.linksDePago.columnas.cuota')}</TableHead>
          <TableHead>{t('inmobiliaria.cobros.linksDePago.columnas.vence')}</TableHead>
          <TableHead className="text-right">{t('inmobiliaria.cobros.linksDePago.columnas.valor')}</TableHead>
          <TableHead>{t('inmobiliaria.cobros.linksDePago.columnas.link')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((l) => (
          <TableRow key={l.cuotaId} data-testid={`link-${l.cuotaId}`}>
            <TableCell className="align-top">
              <Cuota link={l} />
            </TableCell>
            <TableCell className="whitespace-nowrap align-top font-mono tabular-nums">
              {formatDate(l.fechaDeVencimiento, localeCorto)}
            </TableCell>
            <TableCell className="whitespace-nowrap text-right align-top font-mono tabular-nums">
              {formatCurrency(l.montoCop, localeCorto)}
            </TableCell>
            <TableCell className="align-top">
              <EstadoDelLink link={l} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** En el teléfono, una fila por cuota en vez de una tabla que hay que correr. */
function ListaDeLinks({ items }: { items: LinkDePagoDeCuota[] }) {
  const { t, locale } = useI18n();
  const localeCorto = locale === 'en' ? 'en' : 'es';
  return (
    <ul className="divide-y divide-border-faint" data-testid="lista-de-links">
      {items.map((l) => (
        <li key={l.cuotaId} className="space-y-2 px-4 py-3" data-testid={`link-${l.cuotaId}`}>
          <div className="flex items-start justify-between gap-3">
            <Cuota link={l} />
            <p className="whitespace-nowrap font-mono tabular-nums text-fg">
              {formatCurrency(l.montoCop, localeCorto)}
            </p>
          </div>
          <p className="text-caption text-fg-muted">
            {t('inmobiliaria.cobros.linksDePago.columnas.vence')}{' '}
            <span className="font-mono tabular-nums">{formatDate(l.fechaDeVencimiento, localeCorto)}</span>
          </p>
          <EstadoDelLink link={l} />
        </li>
      ))}
    </ul>
  );
}
