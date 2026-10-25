'use client';

/**
 * «Mis giros» del propietario de inmobiliaria (Nico, 11-10-2026).
 *
 *   · Su cuenta de giro (enmascarada), el aviso si el banco le devolvió el giro
 *     y el cambio de cuenta desde aquí: certificación + confirmación por correo +
 *     aprobación de un administrador (el control que ya existe).
 *   · Lo que le giraron, mes por mes, con el extracto en PDF de cada mes.
 *
 * QA 11-10: el banco había devuelto el giro de Paula y lo retenido no se le
 * decía en ninguna parte del portal; sólo veía «Giro atrasado · 58 días».
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado';
import { TablePagination } from '@/components/ui/pagination';
import { useTablePagination, PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination';
import { Bank, FileArrowDown, Warning } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { CifraHeroe } from '@/components/pantalla/CifraHeroe';
import { StatusBadge } from '@leasefy/cadence';
import { giradoEnElAnio } from '@/lib/propietario/el-mes-del-contrato';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { SelectorDeArchivo } from '@/components/ui/selector-de-archivo';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { formatCurrency } from '@/lib/format';
import { fechaCorta, fechaLarga, hoyEnColombia } from '@/lib/fechas/fecha-de-la-casa';
import { nombreDelMes } from '@/lib/recaudo/meses';
import { COLOMBIAN_BANKS } from '@/lib/types/payment-accounts';
import {
  portalDelPropietarioApi,
  type CuentaDeGiro,
  type EstadoDelGiro,
  type GiroDelPropietario,
} from '@/lib/api/portal-del-propietario.service';

// Glow up 22-10: el estado con su punto y su palabra (StatusBadge), no una pastilla teñida.
const ESTADO: Record<EstadoDelGiro, { texto: string; tono: 'success' | 'neutral' | 'critical' | 'warning' }> = {
  GIRADO: { texto: 'Girado', tono: 'success' },
  EN_CAMINO: { texto: 'En camino', tono: 'neutral' },
  DEVUELTO: { texto: 'Devuelto por el banco', tono: 'critical' },
  REGIRADO: { texto: 'Devuelto y vuelto a girar', tono: 'warning' },
};

function CambiarCuenta({ ficha, onListo }: { ficha: CuentaDeGiro; onListo: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [banco, setBanco] = useState('');
  const [tipo, setTipo] = useState('');
  const [numero, setNumero] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    if (!banco || !tipo || numero.replace(/\D/g, '').length < 4 || !archivo) {
      setError('Elige el banco y el tipo, escribe el número de la cuenta y sube la certificación bancaria.');
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      const f = new FormData();
      f.append('bankName', banco);
      f.append('bankAccountType', tipo);
      f.append('bankAccountNumber', numero.replace(/\s+/g, ''));
      f.append('certificacion', archivo);
      await portalDelPropietarioApi.pedirCambioDeCuenta(ficha.propietarioId, f);
      toast.success('Te mandamos un correo para confirmar el cambio. Después tu inmobiliaria lo aprueba.');
      setAbierto(false);
      onListo();
    } catch (e) {
      setError(mensajeParaLaPersona(e, { porDefecto: 'No pudimos pedir el cambio.', accion: 'pedir el cambio de cuenta' }));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <Button size="sm" variant={ficha.giroDevuelto ? 'default' : 'outline'} hideArrow onClick={() => setAbierto(true)} data-testid="cambiar-cuenta">
        Cambiar mi cuenta
      </Button>
      <Dialog open={abierto} onOpenChange={(a) => !enviando && setAbierto(a)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Cambiar la cuenta donde te giran</DialogTitle>
            <DialogDescription>
              Por tu seguridad, te mandamos un correo para confirmarlo y un administrador de {ficha.inmobiliaria} lo aprueba
              con tu certificación bancaria. Hasta entonces te seguimos girando a la cuenta de hoy.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cuenta-banco">Banco</Label>
              <Select value={banco || undefined} onValueChange={setBanco} disabled={enviando}>
                <SelectTrigger id="cuenta-banco">
                  <SelectValue placeholder="Elige el banco" />
                </SelectTrigger>
                <SelectContent>
                  {COLOMBIAN_BANKS.map((b) => (
                    <SelectItem key={b.code} value={b.name}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cuenta-tipo">Tipo de cuenta</Label>
                <Select value={tipo || undefined} onValueChange={setTipo} disabled={enviando}>
                  <SelectTrigger id="cuenta-tipo">
                    <SelectValue placeholder="Ahorros o corriente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AHORROS">Ahorros</SelectItem>
                    <SelectItem value="CORRIENTE">Corriente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cuenta-numero">Número</Label>
                <Input id="cuenta-numero" inputMode="numeric" value={numero} onChange={(e) => setNumero(e.target.value)} disabled={enviando} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="certificacion-bancaria">Certificación bancaria</Label>
              <SelectorDeArchivo
                id="certificacion-bancaria"
                archivo={archivo}
                onElegir={setArchivo}
                accept="application/pdf,image/jpeg,image/png,image/webp"
                deshabilitado={enviando}
                testid="certificacion-bancaria"
              />
              <p className="text-caption text-fg-muted">PDF o foto, de no más de un mes, a tu nombre.</p>
            </div>
            <ErrorDelCampo id="cambiar-cuenta-error" mensaje={error} />
          </div>
          <DialogFooter>
            <Button variant="outline" hideArrow onClick={() => setAbierto(false)} disabled={enviando}>
              Cancelar
            </Button>
            <Button hideArrow isLoading={enviando} onClick={() => void enviar()} data-testid="enviar-cambio-de-cuenta">
              Pedir el cambio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TarjetaDeLaCuenta({ ficha, onCambio }: { ficha: CuentaDeGiro; onCambio: () => void }) {
  return (
    <section className="space-y-4 rounded-lg border border-border bg-surface p-5" data-testid={`cuenta-de-giro-${ficha.propietarioId}`}>
      {ficha.giroDevuelto && (
        <div className="flex gap-3 rounded-md border border-danger/30 bg-danger-soft p-4" role="alert" data-testid="giro-devuelto">
          <Warning className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-body-sm font-medium text-fg">
              El banco devolvió tu giro de {formatCurrency(ficha.giroDevuelto.valorCop)}
            </p>
            <p className="text-body-sm text-fg-muted">
              {ficha.giroDevuelto.motivo}
              {ficha.giroDevuelto.fecha ? ` (${fechaLarga(ficha.giroDevuelto.fecha)})` : ''}. La plata está guardada: te la
              giramos apenas cambies la cuenta y tu inmobiliaria la apruebe.
            </p>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-muted">
            <Bank className="h-5 w-5 text-fg-muted" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-caption text-fg-muted">Te gira {ficha.inmobiliaria} a</p>
            {ficha.cuenta ? (
              <>
                <p className="text-subtitle text-fg">
                  {ficha.cuenta.banco ?? 'Banco sin registrar'} · {ficha.cuenta.tipo ?? 'Cuenta'}{' '}
                  <span className="font-mono">{ficha.cuenta.numero}</span>
                </p>
                <p className="text-body-sm text-fg-muted">A nombre de {ficha.cuenta.titular}</p>
              </>
            ) : (
              <p className="text-subtitle text-fg">Todavía no hay una cuenta registrada</p>
            )}
          </div>
        </div>
        {!ficha.cambioEnCurso && <CambiarCuenta ficha={ficha} onListo={onCambio} />}
      </div>
      {ficha.cambioEnCurso && (
        <p className="rounded-md bg-surface-muted p-3 text-body-sm text-fg-muted" data-testid="cambio-en-curso">
          {ficha.cambioEnCurso.estado === 'PENDIENTE_CONFIRMACION'
            ? `Pediste cambiarla a ${ficha.cambioEnCurso.banco ?? 'otra cuenta'} ${ficha.cambioEnCurso.numero ?? ''}: confírmalo con el enlace que te llegó al correo.`
            : `Confirmaste el cambio a ${ficha.cambioEnCurso.banco ?? 'otra cuenta'} ${ficha.cambioEnCurso.numero ?? ''}: falta que tu inmobiliaria lo apruebe.`}
        </p>
      )}
    </section>
  );
}

function FilaDelGiro({ g }: { g: GiroDelPropietario }) {
  const [bajando, setBajando] = useState(false);
  const e = ESTADO[g.estado];
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3" data-testid={`giro-${g.id}`}>
      <div className="min-w-0">
        <p className="text-body-sm font-medium text-fg">
          {nombreDelMes(g.mes)} · <span className="font-mono tabular-nums">{formatCurrency(g.valorCop)}</span>
        </p>
        <p className="text-caption text-fg-muted">
          {g.giradoEl ? `Girado el ${fechaCorta(g.giradoEl)}` : 'Sin fecha de giro'}
          {g.cuenta ? ` · ${g.banco ?? ''} ${g.cuenta}` : ''}
          {g.referencia ? ` · Ref. ${g.referencia}` : ''}
          {g.devolucion ? ` · ${g.devolucion.motivo}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge tone={e.tono}>{e.texto}</StatusBadge>
        <Button
          variant="outline"
          size="sm"
          hideArrow
          isLoading={bajando}
          data-testid={`bajar-extracto-${g.id}`}
          onClick={async () => {
            setBajando(true);
            try {
              await portalDelPropietarioApi.bajarExtracto(g);
            } catch (err) {
              toast.error(mensajeParaLaPersona(err, { porDefecto: 'No pudimos bajar el extracto.', accion: 'bajar el extracto' }));
            } finally {
              setBajando(false);
            }
          }}
        >
          <FileArrowDown className="h-4 w-4" aria-hidden="true" />
          Extracto
        </Button>
      </div>
    </li>
  );
}

export default function MisGirosPage() {
  const [cuentas, setCuentas] = useState<CuentaDeGiro[] | null>(null);
  // Revisora r27 (regla de Nico: listas con filtro y paginación): los giros por año, de a una página.
  const [anioElegido, setAnioElegido] = useState<string | null>(null);
  const [giros, setGiros] = useState<GiroDelPropietario[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<unknown>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setFallo(null);
    try {
      const [c, g] = await Promise.all([portalDelPropietarioApi.cuentaDeGiro(), portalDelPropietarioApi.giros()]);
      setCuentas(c.fichas);
      setGiros(g.giros);
    } catch (e) {
      setFallo(e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const anios = useMemo(
    () => [...new Set((giros ?? []).map((g) => g.mes.slice(0, 4)))].sort((a, b) => b.localeCompare(a)),
    [giros],
  );
  const anio = anioElegido && anios.includes(anioElegido) ? anioElegido : (anios[0] ?? null);
  const delAnio = useMemo(() => (giros ?? []).filter((g) => !anio || g.mes.startsWith(anio)), [giros, anio]);
  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } = useTablePagination(delAnio, {
    resetKey: anio ?? '',
  });

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <EncabezadoDePantalla
        seccion="Mi plata"
        // Revisora r25: el título es el de la pestaña y la descripción va en el orden de la pantalla (la cuenta, al final).
        titulo="Giros"
        descripcion="Lo que ya te giraron mes por mes, el extracto de cada mes y a qué cuenta te giran."
      />
      <EstadoDeDatos cargando={cargando} error={fallo} queEs="tus giros" onReintentar={cargar}>
        <div className="space-y-6">
          {/* Un giro devuelto es lo único urgente: su cuenta va primero (con el aviso y «Cambiar cuenta»). */}
          {(cuentas ?? [])
            .filter((f) => f.giroDevuelto)
            .map((f) => (
              <TarjetaDeLaCuenta key={f.propietarioId} ficha={f} onCambio={cargar} />
            ))}
          {/* LA RESPUESTA (glow up 22-10): cuánto te han girado este año, en grande; la lista, debajo. */}
          <section className="space-y-5 rounded-lg border border-border bg-surface p-5" data-testid="lo-que-te-giraron">
            {giros && giros.length > 0 && (
              <CifraHeroe
                rotulo={`Te han girado en ${hoyEnColombia().slice(0, 4)}`}
                cifra={<span data-testid="girado-en-el-anio">{formatCurrency(giradoEnElAnio(giros, hoyEnColombia()))}</span>}
                contexto={(() => {
                  const anio = hoyEnColombia().slice(0, 4);
                  // Los mismos que suma la cifra: girados (o vueltos a girar) de este año.
                  const n = giros.filter((g) => g.mes.startsWith(anio) && (g.estado === 'GIRADO' || g.estado === 'REGIRADO')).length;
                  return n === 0 ? 'Todavía no te han girado este año' : n === 1 ? 'en 1 giro' : `en ${n} giros`;
                })()}
              />
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-subtitle text-fg">Mes por mes</h2>
              {anios.length > 1 ? (
                <PestanasDeEstado<string>
                  etiqueta="Ver los giros de un año"
                  valor={anio ?? ''}
                  onCambio={setAnioElegido}
                  pestanas={anios.map((a) => ({
                    valor: a,
                    etiqueta: a,
                    cuantos: (giros ?? []).filter((g) => g.mes.startsWith(a)).length,
                    fija: true,
                  }))}
                />
              ) : null}
            </div>
            {giros && giros.length > 0 ? (
              <>
                <ul className="divide-y divide-border-faint" data-testid="lista-de-giros">
                  {pageItems.map((g) => (
                    <FilaDelGiro key={g.id} g={g} />
                  ))}
                </ul>
                {shouldPaginate ? (
                  <div className="border-t border-border pt-3">
                    <TablePagination
                      total={total}
                      page={page}
                      pageSize={pageSize}
                      pageSizeOptions={PAGE_SIZE_OPTIONS}
                      onPageChange={setPage}
                      onPageSizeChange={setPageSize}
                    />
                  </div>
                ) : null}
              </>
            ) : (
              <p className="mt-2 text-body-sm text-fg-muted" data-testid="sin-giros">
                Todavía no te han girado nada por Leasefy. Lo que está por girar lo ves en{' '}
                {/* Revisora r27: el vacío lleva a donde dice (antes lo nombraba sin enlace). */}
                <Link href="/panel/estado-de-cuenta" className="font-medium text-fg underline underline-offset-4 hover:text-primary">
                  tu estado de cuenta
                </Link>
                .
              </p>
            )}
          </section>
          {/* La cuenta a la que te giran (sin novedades), después de lo girado: se consulta, no se hace. */}
          {(cuentas ?? [])
            .filter((f) => !f.giroDevuelto)
            .map((f) => (
              <TarjetaDeLaCuenta key={f.propietarioId} ficha={f} onCambio={cargar} />
            ))}
        </div>
      </EstadoDeDatos>
    </div>
  );
}
