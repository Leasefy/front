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

import { CifraHeroe } from '@/components/pantalla/CifraHeroe';
import { useEffect, useState } from 'react';

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
  const girado = giros.estado === 'listo' ? giradoEnElAnio(giros.todos, hoy) : 0;
  // Revisora r25: «Por girar» sólo cuando hay algo por girar (antes salía en $ 0), y entonces la barra
  // dice cuánto ya llegó y cuánto falta por girar.
  const porGirarCop = doc.porGirar?.porGirarCop ?? 0;
  const conBarra = giros.estado === 'listo' && porGirarCop > 0 && girado > 0;
  return (
    // QA 21-10 (390 px): de a dos por fila «$ 1.803.830,09» se cortaba y las etiquetas
    // quedaban en «Te han girado en…». Con plata larga, una por fila en el celular.
    // GLOW UP 22-10 (UX, al nivel de Deuda del mes): LA RESPUESTA —cuánto te han girado este año— en una
    // cifra grande, y debajo, cada una con su punto, el último giro, el próximo, lo que está por girar y los
    // contratos vigentes. Antes, cinco cifras del mismo peso.
    <div className="rounded-lg border border-border bg-surface p-5" data-testid="tus-giros">
      <CifraHeroe
        rotulo={`Te han girado en ${hoy.slice(0, 4)}`}
        cifra={
          <span data-testid="cifra-girado-en-el-anio">
            {giros.estado === 'cargando' ? '…' : giros.estado === 'listo' ? formatCurrency(girado) : '—'}
          </span>
        }
        contexto={giros.estado === 'fallo' ? 'No se pudo consultar ahora' : 'Lo que ya llegó a tu cuenta'}
        tramos={[
          ...(conBarra
            ? [{ clave: 'girado', etiqueta: 'Ya girado', monto: girado, tono: 'exito' as const }]
            : []),
          {
            clave: 'ultimo',
            etiqueta: 'Último giro',
            monto: 0,
            tono: sello?.tono === 'exito' ? 'exito' : sello?.tono === 'aviso' ? 'aviso' : sello?.tono === 'peligro' ? 'critico' : 'neutro',
            siempre: true,
            cifra: giros.estado === 'cargando' ? '…' : ultimo ? formatCurrency(ultimo.valorCop) : '—',
            extra: (
              <p className="text-caption text-fg-muted">
                {ultimo && sello
                  ? `${nombreDelMes(ultimo.mes)} · ${sello.texto}`
                  : giros.estado === 'listo'
                    ? 'Todavía no te han girado'
                    : giros.estado === 'fallo'
                      ? 'No se pudo consultar ahora'
                      : null}
              </p>
            ),
            'data-testid': 'cifra-ultimo-giro',
          },
          ...(doc.proximaCuota !== undefined
            ? [
                {
                  clave: 'proximo',
                  etiqueta: 'Próximo giro',
                  monto: 0,
                  tono: 'neutro' as const,
                  siempre: true,
                  cifra: doc.proximaCuota ? formatCurrency(doc.proximaCuota.monto) : '—',
                  extra: <p className="text-caption text-fg-muted">{doc.proximaCuota ? `El ${fechaCorta(doc.proximaCuota.fecha)}` : 'Nada por vencer'}</p>,
                  'data-testid': 'cifra-proximo-giro',
                },
              ]
            : []),
          ...(doc.porGirar && porGirarCop > 0
            ? [
                {
                  clave: 'por-girar',
                  etiqueta: 'Por girar',
                  monto: conBarra ? porGirarCop : 0,
                  tono: 'aviso' as const,
                  siempre: true,
                  cifra: formatCurrency(doc.porGirar.porGirarCop),
                  extra: (
                    <p className="text-caption text-fg-muted">
                      {doc.porGirar.deduccionesCop > 0
                        ? `Con ${formatCurrency(doc.porGirar.deduccionesCop)} descontados`
                        : `Hasta ${nombreDelMes(doc.porGirar.hastaMes)}`}
                    </p>
                  ),
                  'data-testid': 'cifra-por-girar',
                },
              ]
            : []),
        ]}
        /* Revisora r25: los contratos no se cuentan otra vez como una cifra (la lista de abajo ya los
           muestra): aquí sólo se dice de cuántos sale lo girado. */
        pie={
          <span data-testid="cifra-contratos-vigentes">
            {doc.contratos.length === 1 ? 'De 1 contrato' : `De ${doc.contratos.length} contratos`},{' '}
            {vigentes === 1 ? '1 vigente' : `${vigentes} vigentes`}
          </span>
        }
      />
    </div>
  );
}
