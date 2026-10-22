'use client';

/**
 * El selector del TIPO de documento del proveedor, aparte del número (21-10-2026).
 * Lo usan «Agregar cotización» (registro rápido) y Proveedores.
 */
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  NOMBRE_DEL_TIPO_DE_DOCUMENTO,
  TIPOS_DE_DOCUMENTO_DEL_PROVEEDOR,
  type TipoDeDocumentoDelProveedor,
} from '@/lib/mantenimiento/documento-del-proveedor';

export function TipoDeDocumentoDelProveedor({
  id,
  valor,
  onCambiar,
  conError,
  describedBy,
}: {
  id: string;
  valor: TipoDeDocumentoDelProveedor | '';
  onCambiar: (tipo: TipoDeDocumentoDelProveedor) => void;
  conError?: boolean;
  describedBy?: string;
}) {
  return (
    <Select value={valor || undefined} onValueChange={(v) => onCambiar(v as TipoDeDocumentoDelProveedor)}>
      <SelectTrigger
        id={id}
        aria-required="true"
        aria-invalid={conError || undefined}
        aria-describedby={describedBy}
        data-testid={`${id}-trigger`}
      >
        <SelectValue placeholder="Elige el tipo" />
      </SelectTrigger>
      <SelectContent>
        {TIPOS_DE_DOCUMENTO_DEL_PROVEEDOR.map((tipo) => (
          <SelectItem key={tipo} value={tipo}>
            {NOMBRE_DEL_TIPO_DE_DOCUMENTO[tipo]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
