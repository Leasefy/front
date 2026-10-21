'use client';

/**
 * La plata del propietario de inmobiliaria, en una franja (GLOW UP, 21-10-2026).
 *
 * Responde lo que viene a preguntar: ¿ya me giraron?, ¿cuándo es el próximo y de
 * cuánto?, ¿cuánto me deben todavía? Cada cifra sale de lo que el back ya manda,
 * con su misma definición:
 *   · Último giro → `GET /portal/propietario/giros` (el mes más reciente).
 *   · Próximo giro → `doc.proximaCuota` (P-16: la suma del próximo mes de todos
 *     sus contratos, con la fecha). `null` = nada por vencer; ausente = back
 *     anterior, y la cifra no se pinta.
 *   · Por girar → `doc.porGirar` (hasta el mes en curso, neto de deducciones).
 *     Sin el campo (back anterior) no se pinta: el estado de cuenta lo explica.
 *   · Contratos vigentes → los del lado PROPIETARIO del mismo documento.
 *   · Te han girado en el año → la suma de los giros girados (o vueltos a girar)
 *     de este año, de la misma lista de giros (tablero, Nico 21-10-2026).
 * Si los giros no responden, esa cifra dice «—» y las demás siguen.
 */

import { useEffect, useState } from 'react';
import { Cifra, FranjaDeCifras } from '@leasefy/cadence';

import { estadoDe } from '@/lib/estado-de-cuenta/sello-del-contrato';
import { formatCurrency } from '@/lib/format';
import { fechaCorta, hoyEnColombia } from '@/lib/fechas/fecha-de-la-casa';
import { giradoEnElAnio } from '@/lib/propietario/el-mes-del-contrato';
import { nombreDelMes } from '@/lib/recaudo/meses';
import { portalDelPropietarioApi, type GiroDelPropietario } from '@/lib/api/portal-del-propietario.service';
import type { EstadoDeCuenta } from '@/lib/types/estado-de-cuenta';

type Giros =
  | { estado: 'cargando' }
  | { estado: 'listo'; ultimo: GiroDelPropietario | null; todos: GiroDelPropietario[] }
  | { estado: 'fallo' };

function estadoDelGiro(g: GiroDelPropietario): { texto: string; tono?: 'exito' | 'aviso' | 'peligro' } {
  switch (g.estado) {
    case 'GIRADO':
      return { texto: g.giradoEl ? `Girado el ${fechaCorta(g.giradoEl)}` : 'Girado', tono: 'exito' };
    case 'EN_CAMINO':
      return { texto: 'En camino' };
    case 'DEVUELTO':
      return { texto: 'Devuelto por el banco', tono: 'peligro' };
    case 'REGIRADO':
      return { texto: 'Devuelto y vuelto a girar', tono: 'aviso' };
    default:
      return { texto: '' };
  }
}

export function TusGiros({ doc }: { doc: EstadoDeCuenta }) {
  const [giros, setGiros] = useState<Giros>({ estado: 'cargando' });

  useEffect(() => {
    let vivo = true;
    portalDelPropietarioApi
      .giros()
      .then((r) => {
        const lista = Array.isArray(r?.giros) ? [...r.giros] : [];
        lista.sort((a, b) => b.mes.localeCompare(a.mes));
        if (vivo) setGiros({ estado: 'listo', ultimo: lista[0] ?? null, todos: lista });
      })
      .catch(() => {
        if (vivo) setGiros({ estado: 'fallo' });
      });
    return () => {
      vivo = false;
    };
  }, []);

  const vigentes = doc.contratos.filter((c) => estadoDe(c) === 'VIGENTE').length;
  const ultimo = giros.estado === 'listo' ? giros.ultimo : null;
  const sello = ultimo ? estadoDelGiro(ultimo) : null;

  // Tablero (Nico, 21-10): «cuánto he generado» = lo que la inmobiliaria ya le giró este año.
  const hoy = hoyEnColombia();
  return (
    <FranjaDeCifras fila="lg" data-testid="tus-giros">
      <Cifra
        etiqueta={`Te han girado en ${hoy.slice(0, 4)}`}
        valor={
          giros.estado === 'cargando' ? '…' : giros.estado === 'listo' ? formatCurrency(giradoEnElAnio(giros.todos, hoy)) : '—'
        }
        detalle={giros.estado === 'fallo' ? 'No se pudo consultar ahora' : 'Lo que ya llegó a tu cuenta'}
        data-testid="cifra-girado-en-el-anio"
      />
      <Cifra
        etiqueta="Último giro"
        valor={giros.estado === 'cargando' ? '…' : ultimo ? formatCurrency(ultimo.valorCop) : '—'}
        tono={sello?.tono}
        detalle={
          ultimo && sello
            ? `${nombreDelMes(ultimo.mes)} · ${sello.texto}`
            : giros.estado === 'listo'
              ? 'Todavía no te han girado'
              : giros.estado === 'fallo'
                ? 'No se pudo consultar ahora'
                : undefined
        }
        data-testid="cifra-ultimo-giro"
      />
      {doc.proximaCuota !== undefined ? (
        <Cifra
          etiqueta="Próximo giro"
          valor={doc.proximaCuota ? formatCurrency(doc.proximaCuota.monto) : '—'}
          detalle={doc.proximaCuota ? `El ${fechaCorta(doc.proximaCuota.fecha)}` : 'Nada por vencer'}
          data-testid="cifra-proximo-giro"
        />
      ) : null}
      {doc.porGirar ? (
        <Cifra
          etiqueta="Por girar"
          valor={formatCurrency(doc.porGirar.porGirarCop)}
          tono={doc.porGirar.porGirarCop > 0 ? 'aviso' : undefined}
          detalle={
            doc.porGirar.deduccionesCop > 0
              ? `Con ${formatCurrency(doc.porGirar.deduccionesCop)} descontados`
              : `Hasta ${nombreDelMes(doc.porGirar.hastaMes)}`
          }
          data-testid="cifra-por-girar"
        />
      ) : null}
      <Cifra
        etiqueta="Contratos vigentes"
        valor={vigentes}
        detalle={doc.contratos.length === 1 ? 'De 1 contrato' : `De ${doc.contratos.length} contratos`}
        data-testid="cifra-contratos-vigentes"
      />
    </FranjaDeCifras>
  );
}
