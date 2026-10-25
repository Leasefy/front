'use client';

/**
 * «Para facturar te faltan N pasos» — GLOW UP de Facturación (Nico, 20-10-2026).
 *
 * Lo que la inmobiliaria tiene que dejar listo UNA vez para poder facturar el
 * mes vivía en cuatro lugares: el aviso de la resolución salía tres veces (un
 * banner en «Por facturar», una frase roja en el pie y otro banner en
 * «Resolución»), el del documento del propietario arriba de todo, el de la DIAN
 * sólo en «Ventas» y el de los correos al fondo de «Mandato y correos». Nadie
 * sabía qué hacer primero.
 *
 * Aquí van juntos y en orden, cada uno con SU botón:
 *   1. la resolución de la DIAN (sin ella no se numera nada) → abre el cajón de
 *      carga ahí mismo (Nico, 21-09: «eso debería ser un CTA»);
 *   2. el documento de los propietarios que frena su factura por mandato (sólo
 *      si el back dice que hay; un fallo no se pinta como «listo»);
 *   3. la transmisión a la DIAN (los pasos están en Configuración);
 *   4. el correo de los terceros: no frena la factura, pero sin él no le llega.
 *
 * Cada requisito sale de lo que el back respondió. Lo que no se pudo leer va
 * como «No se pudo revisar» y no cuenta.
 */

import Link from 'next/link';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ListaParaEmpezar, type Requisito } from '@/components/pantalla/ListaParaEmpezar';
import { useEstadoAnteLaDian } from '@/components/facturacion/EstadoAnteLaDian';
import { useAvisoTipoDeDocumento } from '@/lib/hooks/use-aviso-tipo-de-documento';
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext';
import {
  facturacionPorMesService,
  type ResolucionesDeLaAgencia,
} from '@/lib/api/facturacion-por-mes.service';
import {
  facturacionElectronicaService,
  seTransmiteDeVerdad,
} from '@/lib/api/facturacion-electronica.service';
import { sinLaRutaDeFacturacion } from '@/lib/facturacion/por-facturar';
import { localeDeLasCifras } from '@/lib/i18n/idioma-de-las-cifras';
import { useTr } from '@/lib/i18n/use-tr';

/** Los dos tipos que se facturan todos los meses: sin su numeración, el mes no sale. */
const TIPOS_DEL_MES = ['CANON_INQUILINO', 'COMISION_PROPIETARIO'] as const;

export interface LoQueNecesitasParaFacturarProps {
  /** Abre el cajón para cargar la resolución. */
  onCargarResolucion: () => void;
  /** Muestra las resoluciones cargadas (la vista de Resolución y numeración). */
  onVerResoluciones: () => void;
  /** Abre la lista de a quién le falta el correo. */
  onVerCorreos: () => void;
  /** Súbelo para volver a leer (después de cargar una resolución). */
  version?: number;
}

export function LoQueNecesitasParaFacturar({
  onCargarResolucion,
  onVerResoluciones,
  onVerCorreos,
  version = 0,
}: LoQueNecesitasParaFacturarProps) {
  const tr = useTr();
  const permisos = usePermissionsContextSafe();
  const esAdministrador = permisos?.isAdmin === true;

  const [resoluciones, setResoluciones] = useState<ResolucionesDeLaAgencia | null>(null);
  const [resolucionFallo, setResolucionFallo] = useState(false);
  const [correos, setCorreos] = useState<{ total: number; sinCorreo: number } | null>(null);
  const [correosFallo, setCorreosFallo] = useState(false);
  const dian = useEstadoAnteLaDian();
  const { aviso: avisoDelDocumento } = useAvisoTipoDeDocumento();

  const leer = useCallback(async () => {
    setResolucionFallo(false);
    setCorreosFallo(false);
    const [r, c] = await Promise.allSettled([
      facturacionPorMesService.resoluciones(),
      facturacionElectronicaService.tercerosSinCorreo(),
    ]);
    if (r.status === 'fulfilled') setResoluciones(r.value);
    else setResolucionFallo(true);
    if (c.status === 'fulfilled') setCorreos({ total: c.value.total, sinCorreo: c.value.sinCorreo });
    else setCorreosFallo(true);
  }, []);

  useEffect(() => {
    void leer();
  }, [leer, version]);

  const cifra = (n: number) => n.toLocaleString(localeDeLasCifras());
  const requisitos: Requisito[] = [];

  // 1 · La resolución.
  {
    let estado: Requisito['estado'] = 'cargando';
    let detalle: ReactNode = null;
    if (resolucionFallo) {
      estado = 'desconocido';
      detalle = tr('No pudimos leer tus resoluciones. Recarga la página para volver a revisar.');
    } else if (resoluciones) {
      const porTipo = resoluciones.porTipoDisponible
        ? resoluciones.porTipo.filter((t) => (TIPOS_DEL_MES as readonly string[]).includes(t.tipo))
        : [];
      const faltan = porTipo.filter((t) => !t.puedeNumerar);
      const numera = resoluciones.porTipoDisponible ? faltan.length === 0 : resoluciones.vigente.puedeNumerar;
      if (numera) {
        estado = 'listo';
        const v = resoluciones.vigente;
        detalle =
          v.numero && v.puedeNumerar
            ? tr('Resolución {numero}{prefijo}: quedan {n} números.', {
                numero: v.numero,
                prefijo: v.prefijo ? ` · prefijo ${v.prefijo}` : '',
                n: cifra(v.disponibles),
              })
            : tr('Cada documento del mes tiene con qué numerarse.');
      } else {
        estado = 'falta';
        detalle =
          // Ronda 30 (revisora r27, «se contradice»): con una resolución vigente que ya numera (hay facturas
          // emitidas), lo que falta es la de ESE tipo de documento, no «ninguna factura».
          resoluciones.porTipoDisponible && faltan.length > 0 && (faltan.length < porTipo.length || resoluciones.vigente.puedeNumerar)
            ? tr('Falta la que numera «{tipo}».', { tipo: faltan.map((t) => t.nombre).join('», «') })
            : sinLaRutaDeFacturacion(resoluciones.vigente.explicacion) ||
              tr('Sin ella no se numera ninguna factura. Son los datos del papel que te dio la DIAN.');
      }
    }
    requisitos.push({
      id: 'resolucion',
      titulo: tr('La resolución de facturación de la DIAN'),
      detalle,
      estado,
      accion: (
        <Button size="sm" hideArrow onClick={onCargarResolucion} data-testid="requisito-cargar-resolucion">
          {tr('Cargar la resolución')}
        </Button>
      ),
      accionListo: (
        <Button size="sm" variant="ghost" hideArrow onClick={onVerResoluciones} data-testid="requisito-ver-resoluciones">
          {tr('Ver resoluciones')}
        </Button>
      ),
    });
  }

  // 2 · El documento de los propietarios: sólo si el back dijo que hay alguno.
  if (avisoDelDocumento && avisoDelDocumento.total > 0) {
    const total = avisoDelDocumento.total;
    requisitos.push({
      id: 'documento-del-propietario',
      titulo:
        total === 1
          ? tr('El tipo de documento de 1 propietario')
          : tr('El tipo de documento de {n} propietarios', { n: cifra(total) }),
      // La frase del back: dice si este mes ya frena alguna o todavía no.
      detalle: avisoDelDocumento.detalle || tr('Sin él, su factura por mandato no se emite.'),
      estado: 'falta',
      accion: (
        <Button size="sm" variant="outline" hideArrow asChild data-testid="requisito-completar-propietarios">
          <Link href={avisoDelDocumento.enlace}>
            {total === 1 ? tr('Completar la ficha') : tr('Completar las fichas')}
          </Link>
        </Button>
      ),
    });
  }

  // 3 · La transmisión a la DIAN. Apagada para todos (Leasefy no la prendió) no es un paso de la inmobiliaria.
  if (dian.cargando && !dian.estado) {
    requisitos.push({ id: 'dian', titulo: tr('La factura electrónica ante la DIAN'), estado: 'cargando' });
  } else if (dian.estado && dian.estado.estado !== 'APAGADA') {
    const lista = seTransmiteDeVerdad(dian.estado) || dian.estado.estado === 'LISTA';
    requisitos.push({
      id: 'dian',
      titulo: tr('La factura electrónica ante la DIAN'),
      detalle:
        dian.estado.estado === 'LISTA' && dian.estado.ambiente === 'PRUEBAS'
          ? tr('Transmitiendo en el ambiente de pruebas de la DIAN.')
          : dian.estado.estado === 'FALTA_RESOLUCION'
            ? tr('Se habilita cuando cargues la resolución.')
            : dian.estado.titulo,
      estado: lista ? 'listo' : 'falta',
      accion: esAdministrador ? (
        <Button size="sm" variant="outline" hideArrow asChild data-testid="requisito-pasos-dian">
          <Link href="/panel/inmobiliaria/configuracion/facturacion">{tr('Ver los pasos')}</Link>
        </Button>
      ) : (
        <span className="text-caption text-fg-muted">{tr('Lo habilita el administrador.')}</span>
      ),
    });
  } else if (dian.error) {
    requisitos.push({
      id: 'dian',
      titulo: tr('La factura electrónica ante la DIAN'),
      detalle: tr('No pudimos leer en qué va tu habilitación.'),
      estado: 'desconocido',
    });
  }

  // 4 · El correo de los terceros: no frena la factura, pero sin él no le llega.
  if (correosFallo) {
    requisitos.push({
      id: 'correos',
      titulo: tr('El correo de tus inquilinos y propietarios'),
      detalle: tr('No pudimos revisar a quién le falta.'),
      estado: 'desconocido',
    });
  } else if (!correos) {
    requisitos.push({ id: 'correos', titulo: tr('El correo de tus inquilinos y propietarios'), estado: 'cargando' });
  } else {
    requisitos.push({
      id: 'correos',
      titulo: tr('El correo de tus inquilinos y propietarios'),
      detalle:
        correos.sinCorreo === 0
          ? tr('Todos tienen correo: sus facturas les llegan.')
          : tr('{n} de {total} no tienen correo: sus facturas quedan sin entregar.', {
              n: cifra(correos.sinCorreo),
              total: cifra(correos.total),
            }),
      estado: correos.sinCorreo === 0 ? 'listo' : 'opcional',
      etiqueta: tr('No frena la factura'),
      accion: (
        <Button size="sm" variant="outline" hideArrow onClick={onVerCorreos} data-testid="requisito-ver-correos">
          {tr('Ver a quién le falta')}
        </Button>
      ),
    });
  }

  return (
    <ListaParaEmpezar
      paraQue={tr('facturar')}
      descripcion={tr('Se hace una sola vez. Empieza por el que dice «Sigue».')}
      requisitos={requisitos}
      recordarComo="facturacion"
      // 22-10 (revisión de Dinero): plegada en una línea («Sigue: …»); el trabajo del mes va primero.
      plegadaAlInicio
      data-testid="lo-que-necesitas-para-facturar"
    />
  );
}
