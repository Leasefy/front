'use client';

/**
 * Configuración → Integraciones → «Wompi · Pagos a terceros».
 *
 * La inmobiliaria pega las llaves de SU cuenta de comercio en Wompi (no las de
 * Leasefy), el back las guarda cifradas y las prueba leyendo sus cuentas
 * origen. Con eso, los lotes de giros aprobados salen por Wompi sin subir el
 * archivo al portal del banco.
 *
 * ── Lo que esta pantalla se niega a hacer ───────────────────────────────────
 *
 * · Mostrar una llave: el back nunca la devuelve. Se dice cuál está puesta por
 *   sus últimos cuatro caracteres, y los campos arrancan vacíos siempre.
 * · Dejar tocar las llaves a quien no puede: el back pide `configuracion:edit`;
 *   acá los botones se apagan con ese porqué.
 * · Poner la guía de activación sobre la pantalla: va detrás de
 *   «Cómo se activa» (`ParaEntenderMas`).
 */

import { useHidratado } from '@/lib/hooks/use-hidratado';
import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, Copy, Plugs, WarningCircle } from '@phosphor-icons/react';
import { Banner } from '@leasefy/cadence';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ParaEntenderMas } from '@/components/ui/para-entender-mas';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { formatDateTime } from '@/lib/format';
import { wompiPagosApi } from '@/lib/api/wompi-pagos.service';
import type { AmbienteDeWompi, CuentaOrigenDeWompi, VistaDeLaConexion } from '@/lib/api/wompi-pagos.types';

const NOMBRE_DEL_ESTADO: Record<string, string> = {
  CONECTADA: 'Conectada',
  SIN_PROBAR: 'Sin probar',
  FALLO: 'La prueba falló',
};

const NOMBRE_DE_LA_CUENTA: Record<string, string> = {
  ACTIVE: 'Activa',
  IN_REVIEW: 'En revisión',
  INACTIVE: 'Inactiva',
};

/** «Conectada en producción con la llave ••••1234.» — el resumen es UNA frase. */
export function resumenDeLaConexion(v: VistaDeLaConexion): string {
  const c = v.conexion;
  if (!c) return 'Tu inmobiliaria todavía no ha conectado Wompi · Pagos a terceros.';
  const donde = c.ambiente === 'PRODUCCION' ? 'en producción' : 'en sandbox (no mueve plata)';
  const cuentas = c.cuentasOrigen.filter((x) => x.estado === 'ACTIVE' || !x.estado).length;
  const estado =
    c.estado === 'CONECTADA'
      ? `Conectada ${donde} con la llave ••••${c.finalDeLaLlave}`
      : c.estado === 'FALLO'
        ? `La última prueba ${donde} falló con la llave ••••${c.finalDeLaLlave}`
        : `Llaves guardadas ${donde} (••••${c.finalDeLaLlave}), sin probar`;
  return c.estado === 'CONECTADA'
    ? `${estado}: ${cuentas} ${cuentas === 1 ? 'cuenta origen activa' : 'cuentas origen activas'}.`
    : `${estado}.`;
}

export function ConexionWompiPagos() {
  const { canAccess } = usePermissions();
  const puedeEditar = canAccess('configuracion', 'edit');
  const [vista, setVista] = useState<VistaDeLaConexion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [probando, setProbando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setVista(await wompiPagosApi.verConexion());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer la conexión con Wompi.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const probar = async () => {
    setProbando(true);
    try {
      const v = await wompiPagosApi.probarConexion();
      setVista(v);
      if (v.conexion?.estado === 'CONECTADA') toast.success('Wompi respondió: la conexión funciona');
      else
        toast.error('La prueba falló', {
          description: v.conexion?.ultimoError ?? undefined,
        });
    } catch (e) {
      toast.error('No se pudo probar la conexión', {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setProbando(false);
    }
  };

  const conexion = vista?.conexion ?? null;
  const sinPermiso = 'Las llaves de Wompi las cambia un administrador de la inmobiliaria.';

  return (
    <section
      className="space-y-5 rounded-lg border border-border bg-surface p-6 shadow-sm"
      data-testid="conexion-wompi-pagos"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-soft">
            <Plugs className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-fg">Wompi · Pagos a terceros</h2>
              {conexion && (
                <Badge
                  variant={
                    conexion.estado === 'CONECTADA'
                      ? 'success'
                      : conexion.estado === 'FALLO'
                        ? 'destructive'
                        : 'warning'
                  }
                  data-testid="estado-de-la-conexion"
                >
                  {NOMBRE_DEL_ESTADO[conexion.estado] ?? conexion.estado}
                </Badge>
              )}
            </div>
            <p className="text-sm text-fg-muted">
              Los giros a propietarios salen por Wompi desde tu cuenta de Bancolombia (y de Occidente o Bogotá
              cuando las vincules), sin subir el archivo al portal del banco.
            </p>
          </div>
        </div>
        <ParaEntenderMas etiqueta="Cómo se activa" titulo="Activar Wompi · Pagos a terceros">
          <GuiaDeActivacion />
        </ParaEntenderMas>
      </div>

      {cargando && !vista ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : error ? (
        <Banner variant="danger">{error}</Banner>
      ) : vista && !vista.disponible && !conexion ? (
        <Banner variant="warning" title="Todavía no se puede conectar">
          {vista.motivo}
        </Banner>
      ) : vista ? (
        <>
          <p className="text-sm text-fg" data-testid="resumen-de-la-conexion">
            {resumenDeLaConexion(vista)}
            {conexion?.ultimaPruebaAt ? (
              <span className="text-fg-muted"> Última prueba {formatDateTime(conexion.ultimaPruebaAt)}.</span>
            ) : null}
          </p>
          {conexion?.estado === 'FALLO' && conexion.ultimoError && (
            <Banner variant="danger">{conexion.ultimoError}</Banner>
          )}
          {!vista.disponible && vista.motivo && <Banner variant="warning">{vista.motivo}</Banner>}

          {conexion && conexion.cuentasOrigen.length > 0 && (
            <CuentasOrigen cuentas={conexion.cuentasOrigen} />
          )}
          {conexion?.limites?.diarioCop != null && (
            <p className="text-sm text-fg-muted">
              Cupo diario en Wompi:{' '}
              <span className="font-mono tabular-nums text-fg">
                {formatCurrency(conexion.limites.diarioCop)}
              </span>
              {conexion.limites.disponibleHoyCop != null && (
                <>
                  {' '}
                  · disponible hoy{' '}
                  <span className="font-mono tabular-nums text-fg">
                    {formatCurrency(conexion.limites.disponibleHoyCop)}
                  </span>
                </>
              )}
              .
            </p>
          )}
          {conexion && <Webhook conexion={conexion} />}

          <FormularioDeLlaves
            yaHayConexion={Boolean(conexion)}
            ambienteActual={conexion?.ambiente ?? 'PRODUCCION'}
            tieneSecreto={conexion?.tieneSecretoDeEventos ?? false}
            puedeEditar={puedeEditar && vista.disponible}
            porQueNo={!puedeEditar ? sinPermiso : !vista.disponible ? vista.motivo : null}
            onGuardado={setVista}
          />

          {conexion && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                hideArrow
                onClick={() => void probar()}
                isLoading={probando}
                disabled={!puedeEditar}
                title={puedeEditar ? undefined : sinPermiso}
                data-testid="probar-conexion"
              >
                Probar conexión
              </Button>
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}

function CuentasOrigen({ cuentas }: { cuentas: CuentaOrigenDeWompi[] }) {
  return (
    <div className="space-y-2" data-testid="cuentas-origen">
      <p className="text-sm font-medium text-fg">Cuentas origen en Wompi</p>
      <ul className="divide-y divide-border rounded-md border border-border">
        {cuentas.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
            <span className="text-fg">
              {c.banco}
              {c.tipo ? <span className="text-fg-muted"> · {c.tipo.toLowerCase()}</span> : null}{' '}
              <span className="font-mono">{c.numero}</span>
            </span>
            <span className="flex items-center gap-3">
              {c.saldoCentavos != null && (
                <span className="font-mono tabular-nums text-fg">
                  {formatCurrency(Math.floor(c.saldoCentavos / 100))}
                </span>
              )}
              <span className={c.estado === 'ACTIVE' ? 'text-success' : 'text-warning'}>
                {NOMBRE_DE_LA_CUENTA[c.estado ?? ''] ?? c.estado ?? '—'}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Webhook({ conexion }: { conexion: NonNullable<VistaDeLaConexion['conexion']> }) {
  const url = conexion.webhook.url;
  const copiar = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('URL copiada');
    } catch {
      toast.error('No se pudo copiar: selecciónala y cópiala a mano.');
    }
  };
  return (
    <div className="space-y-1.5" data-testid="webhook-de-wompi">
      <p className="text-sm font-medium text-fg">URL de eventos para Wompi</p>
      {url ? (
        <div className="flex flex-wrap items-center gap-2">
          <code
            className="min-w-0 flex-1 truncate rounded-md border border-border bg-surface-muted px-3 py-2 font-mono text-sm text-fg"
            title={url}
          >
            {url}
          </code>
          <Button variant="ghost" size="sm" hideArrow onClick={() => void copiar()}>
            <Copy className="h-4 w-4" />
            Copiar
          </Button>
        </div>
      ) : (
        <p className="text-sm text-fg-muted">
          El servidor no tiene configurada su dirección pública (BACKEND_PUBLIC_URL): la ruta es{' '}
          <span className="font-mono">{conexion.webhook.ruta}</span>. Pídele la URL completa a soporte.
        </p>
      )}
      <p className="flex items-start gap-1.5 text-sm text-fg-muted">
        {conexion.tieneSecretoDeEventos ? (
          <>
            <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
            Con el secreto de eventos guardado, los lotes se cierran apenas Wompi avisa.
          </>
        ) : (
          <>
            <WarningCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" />
            Sin el secreto de eventos no se aceptan los avisos de Wompi: los lotes se cierran igual, con la
            consulta que corre cada 10 minutos.
          </>
        )}
      </p>
    </div>
  );
}

function FormularioDeLlaves({
  yaHayConexion,
  ambienteActual,
  tieneSecreto,
  puedeEditar,
  porQueNo,
  onGuardado,
}: {
  yaHayConexion: boolean;
  ambienteActual: AmbienteDeWompi;
  tieneSecreto: boolean;
  puedeEditar: boolean;
  porQueNo: string | null;
  onGuardado: (v: VistaDeLaConexion) => void;
}) {
  const [ambiente, setAmbiente] = useState<AmbienteDeWompi>(ambienteActual);
  const [apiKey, setApiKey] = useState('');
  const [usuario, setUsuario] = useState('');
  const [secreto, setSecreto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setAmbiente(ambienteActual), [ambienteActual]);

  const guardar = async () => {
    if (!apiKey.trim() || !usuario.trim()) {
      setError('Pega la API Key y el ID de usuario principal.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const v = await wompiPagosApi.guardarConexion({
        ambiente,
        apiKey,
        usuarioPrincipalId: usuario,
        // Vacío = se deja el que había (si había); con algo, se reemplaza.
        ...(secreto.trim() ? { secretoDeEventos: secreto } : {}),
      });
      onGuardado(v);
      // Las llaves no se quedan en la pantalla ni un segundo más.
      setApiKey('');
      setUsuario('');
      setSecreto('');
      if (v.conexion?.estado === 'CONECTADA') toast.success('Llaves guardadas y probadas');
      else
        toast.error('Se guardaron, pero la prueba falló', {
          description: v.conexion?.ultimoError ?? undefined,
        });
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'No se pudieron guardar las llaves.');
    } finally {
      setGuardando(false);
    }
  };

  const deshabilitado = !puedeEditar || guardando;
  const hidratado = useHidratado();

  return (
    // 🔴 POST y botón apagado hasta hidratar: sin eso, un clic antes de que
    // React hidrate lo envía el navegador solo, por GET, y las llaves de Wompi
    // quedan en la URL (el mismo defecto que tuvo el login el 16-09).
    <form
      method="post"
      className="space-y-4 rounded-md border border-border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void guardar();
      }}
      data-testid="formulario-de-llaves"
    >
      <p className="text-sm font-medium text-fg">
        {yaHayConexion ? 'Cambiar las llaves' : 'Pegar las llaves'}
      </p>
      <fieldset className="space-y-1.5" disabled={deshabilitado}>
        <legend className="text-sm text-fg">Ambiente</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup">
          {(
            [
              ['PRODUCCION', 'Producción'],
              ['SANDBOX', 'Sandbox (pruebas, no mueve plata)'],
            ] as const
          ).map(([valor, etiqueta]) => (
            <label
              key={valor}
              className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                ambiente === valor ? 'border-primary bg-primary-soft text-primary' : 'border-border text-fg'
              }`}
            >
              <input
                type="radio"
                name="ambiente-de-wompi"
                value={valor}
                checked={ambiente === valor}
                onChange={() => setAmbiente(valor)}
                className="sr-only"
              />
              {etiqueta}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="wompi-api-key">API Key</Label>
          <Input
            id="wompi-api-key"
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={deshabilitado}
            className="font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wompi-usuario">ID de usuario principal</Label>
          <Input
            id="wompi-usuario"
            type="password"
            autoComplete="off"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            disabled={deshabilitado}
            className="font-mono"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="wompi-secreto">Secreto de eventos</Label>
        <Input
          id="wompi-secreto"
          type="password"
          autoComplete="off"
          value={secreto}
          onChange={(e) => setSecreto(e.target.value)}
          disabled={deshabilitado}
          placeholder={tieneSecreto ? 'Déjalo vacío para conservar el que ya está' : 'Opcional'}
          className="font-mono"
        />
      </div>
      {error && <Banner variant="danger">{error}</Banner>}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          hideArrow
          isLoading={guardando}
          disabled={!puedeEditar || !hidratado}
          title={porQueNo ?? undefined}
        >
          Guardar y probar
        </Button>
        {porQueNo ? (
          <p className="text-sm text-fg-muted">{porQueNo}</p>
        ) : (
          <p className="text-sm text-fg-muted">Se guardan cifradas y nunca se vuelven a mostrar.</p>
        )}
      </div>
    </form>
  );
}

/** La guía corta de activación. Fuente: docs.wompi.co, leída el 22-09-2026. */
function GuiaDeActivacion() {
  return (
    <div className="space-y-4 text-sm text-fg">
      <section className="space-y-1.5">
        <h3 className="font-semibold">1. Activar Pagos a terceros (el representante legal)</h3>
        <p className="text-fg-muted">
          En el panel de Wompi, menú Pagos a terceros → Solicitar activación. Lo hace el representante legal:
          valida su identidad (fotos del documento y video del rostro) y, si eliges un plan con cuentas
          Bancolombia, firma digitalmente la autorización. Wompi responde en 2 a 5 días hábiles.
        </p>
      </section>
      <section className="space-y-1.5">
        <h3 className="font-semibold">2. Vincular la cuenta desde la que se gira</h3>
        <p className="text-fg-muted">
          Pagos a terceros → Saldos → Agregar cuenta bancaria, y firmar la autorización. Una cuenta
          Bancolombia queda lista en hasta 3 días hábiles; una de Banco de Occidente o de Bogotá, en 15 a 30
          días hábiles. El lote tiene que armarse desde esa misma cuenta.
        </p>
      </section>
      <section className="space-y-1.5">
        <h3 className="font-semibold">3. Crear al Aprobador</h3>
        <p className="text-fg-muted">
          Roles y usuarios → Pagos a terceros: crea un usuario con el rol Aprobador y asígnale la cuenta. Cada
          lote que mandes desde Leasefy llega a Wompi pendiente de aprobación y lo aprueba esa persona.
        </p>
      </section>
      <section className="space-y-1.5">
        <h3 className="font-semibold">4. Copiar las llaves</h3>
        <p className="text-fg-muted">
          Desarrollo → Programadores → Pagos a Terceros: la API Key (pide el segundo factor para verla) y el
          ID de usuario principal. Pégalas aquí. Si regeneras la API Key, espera 2 o 3 minutos antes de
          probarla. Para que los lotes se cierren apenas Wompi avise, configura allá la URL de eventos que
          aparece aquí y pega su secreto.
        </p>
      </section>
      <section className="space-y-1.5">
        <h3 className="font-semibold">Costos y límites</h3>
        <p className="text-fg-muted">
          Desde la Wompi Cuenta, <span className="font-mono">$1.849 + 0,4 % + IVA</span> por pago exitoso. Los
          planes con cuentas Bancolombia no publican su precio: los da Wompi al activarlos. El cupo es de{' '}
          <span className="font-mono">$1.500.000.000</span> al día (ampliable con soporte) y{' '}
          <span className="font-mono">3.800</span> lotes diarios.
        </p>
      </section>
    </div>
  );
}
