'use client';

/**
 * El cajón del formulario del propietario (Nuevo y Editar), compartido por la
 * LISTA y la FICHA. Era una función local de `propietarios/page.tsx`
 * (QA-PROP-FRONT-LISTA, Nico 03-10: «la experiencia de nuevo propietario
 * debería ser en un drawer»); SEGUIMIENTO-FRONT la saca tal cual a este archivo
 * para que «Editar» de la ficha abra el MISMO cajón y no un modal.
 */

import { Button } from '@/components/ui/button';
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon';
import { Spinner } from '@/components/ui/spinner';
import { useI18n } from '@/lib/i18n';

/**
 * El motivo del back, dentro del diálogo que lo provocó. Un toast se va solo
 * en cuatro segundos y se lleva la única explicación de por qué no se guardó.
 */
export function AvisoEnElDialogo({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      data-testid="aviso-en-el-dialogo"
      className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger"
    >
      {children}
    </p>
  );
}

/**
 * El cajón del formulario del propietario: Nuevo y Editar (Nico, 03-10). La
 * misma experiencia que «Nuevo inquilino»: cabecera, cuerpo que se desplaza y
 * pie FIJO, así «Cancelar / Crear propietario» se ven siempre enteros (P-12).
 * El formulario va en el cuerpo sin su fila de botones (`accionesAfuera`) y el
 * botón del pie lo manda con `form=`. Lo que el back dijo sin campo va arriba
 * del cuerpo; lo que es de un campo, bajo ese campo (y ahí va el foco, P-11).
 */
export function CajonDelFormularioDelPropietario({
  abierto,
  onCerrar,
  titulo,
  descripcion,
  aviso,
  idDelFormulario,
  textoDelBoton,
  guardando,
  children,
}: {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  descripcion?: React.ReactNode;
  aviso?: string | null;
  idDelFormulario: string;
  textoDelBoton: string;
  guardando: boolean;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <Cajon
      abierto={abierto}
      onOpenChange={(sigue) => {
        if (!sigue) onCerrar();
      }}
      tamano="lg"
      data-testid="cajon-del-propietario"
    >
      <CajonCabecera titulo={titulo} descripcion={descripcion} />
      <CajonCuerpo>
        {aviso ? (
          <div className="mb-4">
            <AvisoEnElDialogo>{aviso}</AvisoEnElDialogo>
          </div>
        ) : null}
        {children}
      </CajonCuerpo>
      <CajonPie>
        <Button type="button" variant="secondary" size="sm" hideArrow onClick={onCerrar} disabled={guardando}>
          {t('inmobiliaria.propietario.form.cancel')}
        </Button>
        <Button
          type="submit"
          form={idDelFormulario}
          size="sm"
          hideArrow
          disabled={guardando}
          className="gap-2"
          data-testid="guardar-propietario"
        >
          {guardando ? (
            <>
              <Spinner size="sm" variant="current" />
              {t('inmobiliaria.propietario.form.saving')}
            </>
          ) : (
            textoDelBoton
          )}
        </Button>
      </CajonPie>
    </Cajon>
  );
}
