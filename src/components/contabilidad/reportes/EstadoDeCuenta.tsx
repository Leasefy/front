'use client';

/**
 * El estado de cuenta de un tercero: todo lo que se movió a su nombre, en
 * todas las cuentas.
 *
 * El back lo pide por `terceroTipo` + `terceroId` **tal como se asentó**.
 * Para propietarios e inquilinos hay buscador (son los dos terceros que el
 * panel conoce); para cualquier otro tipo se pega el id a mano. El signo es
 * convención fija del informe: positivo = le debe a la inmobiliaria,
 * negativo = la inmobiliaria le debe.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MagnifyingGlass, UserList } from '@phosphor-icons/react';

import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { contabilidadApi, type EstadoDeCuenta as Estado } from '@/lib/api/contabilidad.service';
import { propietariosApi } from '@/lib/api/inmobiliaria.service';
import { inquilinosApi } from '@/lib/api/inquilinos.service';
import { diaLegible, rangoInvertido } from '@/lib/contabilidad/fechas';
import { cn } from '@/lib/utils';
import { Monto } from '../Monto';
import { RangoDeFechas } from '../RangoDeFechas';

const TIPOS = ['PROPIETARIO', 'ARRENDATARIO', 'PROVEEDOR', 'OTRO'] as const;
type Tipo = (typeof TIPOS)[number];

const NOMBRE_DE_TIPO: Record<Tipo, string> = {
  PROPIETARIO: 'Propietario',
  ARRENDATARIO: 'Arrendatario',
  PROVEEDOR: 'Proveedor',
  OTRO: 'Otro',
};

interface Candidato {
  id: string;
  nombre: string;
  detalle: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function EstadoDeCuenta() {
  const [tipo, setTipo] = useState<Tipo>('PROPIETARIO');
  const [tipoLibre, setTipoLibre] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [elegido, setElegido] = useState<Candidato | null>(null);
  const [idManual, setIdManual] = useState('');
  const [rango, setRango] = useState({ desde: '', hasta: '' });
  const [estado, setEstado] = useState<Estado | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const conBuscador = tipo === 'PROPIETARIO' || tipo === 'ARRENDATARIO';
  const terceroTipo = tipo === 'OTRO' ? tipoLibre.trim().toUpperCase() : tipo;
  const terceroId = conBuscador ? (elegido?.id ?? '') : idManual.trim();
  const invertido = rangoInvertido(rango.desde, rango.hasta);
  const listo = Boolean(terceroTipo) && UUID.test(terceroId) && !invertido;

  // Cambiar de tipo descarta lo elegido: un id de propietario no es de inquilino.
  useEffect(() => {
    setElegido(null);
    setCandidatos([]);
    setBusqueda('');
    setEstado(null);
  }, [tipo]);

  useEffect(() => {
    if (!conBuscador) return;
    const q = busqueda.trim();
    if (q.length < 2) {
      setCandidatos([]);
      return;
    }
    let vivo = true;
    setBuscando(true);
    const t = setTimeout(async () => {
      try {
        const lista: Candidato[] =
          tipo === 'PROPIETARIO'
            ? (await propietariosApi.getAll({ search: q, limit: 8 })).map((p) => ({
                id: p.id,
                nombre: p.name,
                detalle: p.documentNumber ? `${p.documentType} ${p.documentNumber}` : (p.email ?? ''),
              }))
            : (await inquilinosApi.listar({ buscar: q })).slice(0, 8).map((i) => ({
                id: i.tenantId,
                nombre: i.nombre,
                detalle: i.email ?? i.telefono ?? '',
              }));
        if (vivo) setCandidatos(lista);
      } catch {
        if (vivo) setCandidatos([]);
      } finally {
        if (vivo) setBuscando(false);
      }
    }, 300);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [busqueda, tipo, conBuscador]);

  const cargar = useCallback(async () => {
    if (!listo) return;
    setCargando(true);
    setError(null);
    try {
      setEstado(
        await contabilidadApi.reportes.estadoDeCuenta({
          terceroTipo,
          terceroId,
          desde: rango.desde || undefined,
          hasta: rango.hasta || undefined,
        }),
      );
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [listo, terceroTipo, terceroId, rango.desde, rango.hasta]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const saldoFinal = estado?.saldoFinalCop ?? 0;
  const lectura = useMemo(() => {
    if (!estado) return null;
    if (saldoFinal > 0) return 'Le debe a la inmobiliaria.';
    if (saldoFinal < 0) return 'La inmobiliaria le debe.';
    return 'A paz y salvo.';
  }, [estado, saldoFinal]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 rounded-lg border border-border bg-surface p-4 shadow-sm lg:grid-cols-[200px_minmax(280px,1fr)_minmax(280px,420px)]">
        <div className="space-y-1.5">
          <Label id="tercero-tipo">Tipo de tercero</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as Tipo)}>
            <SelectTrigger aria-labelledby="tercero-tipo" data-testid="tercero-tipo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOS.map((t) => (
                <SelectItem key={t} value={t}>
                  {NOMBRE_DE_TIPO[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {tipo === 'OTRO' ? (
            <Input
              aria-label="Tipo tal como se asentó"
              value={tipoLibre}
              onChange={(e) => setTipoLibre(e.target.value)}
              placeholder="ASEGURADORA"
              maxLength={20}
              className="font-mono uppercase"
            />
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tercero-busqueda">{conBuscador ? 'Tercero' : 'Id del tercero'}</Label>
          {conBuscador ? (
            elegido ? (
              <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-muted px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-fg">{elegido.nombre}</p>
                  <p className="truncate font-mono text-xs text-fg-muted">{elegido.detalle}</p>
                </div>
                <button
                  type="button"
                  className="text-sm text-fg-muted underline hover:text-fg"
                  onClick={() => setElegido(null)}
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="relative">
                <MagnifyingGlass
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
                  aria-hidden="true"
                />
                <Input
                  id="tercero-busqueda"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder={tipo === 'PROPIETARIO' ? 'Nombre o documento' : 'Nombre, correo o teléfono'}
                  className="pl-9"
                  autoComplete="off"
                  data-testid="tercero-busqueda"
                />
                {busqueda.trim().length >= 2 ? (
                  <ul
                    className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-surface py-1 shadow-md"
                    role="listbox"
                    data-testid="tercero-candidatos"
                  >
                    {buscando ? (
                      <li className="px-3 py-2 text-sm text-fg-muted">Buscando…</li>
                    ) : candidatos.length === 0 ? (
                      <li className="px-3 py-2 text-sm text-fg-muted">Nadie con ese dato.</li>
                    ) : (
                      candidatos.map((c) => (
                        <li key={c.id} role="option" aria-selected={false}>
                          <button
                            type="button"
                            className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-surface-hover"
                            onClick={() => {
                              setElegido(c);
                              setBusqueda('');
                            }}
                          >
                            <span className="text-sm text-fg">{c.nombre}</span>
                            <span className="font-mono text-xs text-fg-muted">{c.detalle}</span>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                ) : null}
              </div>
            )
          ) : (
            <>
              <Input
                id="tercero-busqueda"
                value={idManual}
                onChange={(e) => setIdManual(e.target.value)}
                placeholder="El id con el que se asentó"
                className="font-mono"
                autoComplete="off"
                aria-invalid={(idManual.trim() !== '' && !UUID.test(idManual.trim())) || undefined}
              />
              {idManual.trim() !== '' && !UUID.test(idManual.trim()) ? (
                <p className="text-xs text-danger" role="alert">
                  Tiene que ser un id (uuid).
                </p>
              ) : null}
            </>
          )}
        </div>

        <RangoDeFechas desde={rango.desde} hasta={rango.hasta} onChange={setRango} />
      </div>

      {!listo ? (
        <EmptyState
          icon={UserList}
          title="Elegí un tercero"
          description="El estado de cuenta junta todo lo que se asentó a su nombre, en todas las cuentas, con saldo corrido."
        />
      ) : error ? (
        <FalloDeCarga error={error} queEs="el estado de cuenta" onReintentar={cargar} />
      ) : cargando && !estado ? (
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      ) : estado ? (
        <div className={cn('space-y-4', cargando && 'opacity-60')} aria-busy={cargando}>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4">
            <div>
              <p className="text-sm text-fg-muted">Saldo final</p>
              <p className="text-2xl">
                <Monto valor={estado.saldoFinalCop} className="font-medium" />
              </p>
            </div>
            <p className="text-sm text-fg-muted">
              {lectura} Convención: débitos − créditos; en negativo, la inmobiliaria debe.
            </p>
          </div>

          {estado.renglones.length === 0 ? (
            <EmptyState
              icon={UserList}
              title="Sin movimientos en este rango"
              description="Nada se asentó a nombre de este tercero entre esas fechas."
            />
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead numeric>Asiento</TableHead>
                    <TableHead>Cuenta</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead numeric>Débito</TableHead>
                    <TableHead numeric>Crédito</TableHead>
                    <TableHead numeric>Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={6} muted className="text-sm">
                      Saldo inicial
                    </TableCell>
                    <TableCell numeric>
                      <Monto valor={estado.saldoInicialCop} />
                    </TableCell>
                  </TableRow>
                  {estado.renglones.map((r, i) => (
                    <TableRow key={`${r.asientoId}-${i}`}>
                      <TableCell>
                        <span className="font-mono text-sm tabular-nums">{diaLegible(r.fecha)}</span>
                      </TableCell>
                      <TableCell numeric>
                        <span className="font-mono tabular-nums">{r.numero}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs tabular-nums text-fg-muted">{r.codigo}</span>
                        <span className="block text-sm">{r.cuenta}</span>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <span className="block truncate text-sm" title={r.descripcionAsiento}>
                          {r.descripcionAsiento}
                        </span>
                        {r.descripcion ? (
                          <span className="block truncate text-xs text-fg-muted">{r.descripcion}</span>
                        ) : null}
                      </TableCell>
                      <TableCell numeric>
                        <Monto valor={r.debitoCop} vacioSiCero />
                      </TableCell>
                      <TableCell numeric>
                        <Monto valor={r.creditoCop} vacioSiCero />
                      </TableCell>
                      <TableCell numeric>
                        <Monto valor={r.saldoCop} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4} className="text-sm font-medium text-fg">
                      Totales del período
                    </TableCell>
                    <TableCell numeric>
                      <Monto valor={estado.debitosCop} className="font-medium" />
                    </TableCell>
                    <TableCell numeric>
                      <Monto valor={estado.creditosCop} className="font-medium" />
                    </TableCell>
                    <TableCell numeric>
                      <Monto valor={estado.saldoFinalCop} className="font-medium" />
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
