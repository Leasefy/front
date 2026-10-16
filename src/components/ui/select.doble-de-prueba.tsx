/**
 * Doble de prueba del `Select` del adaptador (Radix/Cadence) que pinta un
 * `<select>` NATIVO: en happy-dom el portal de Radix no se puede abrir, y las
 * pruebas que eligen una opción lo hacen con el valor del `<select>`.
 *
 * Uso: `vi.mock('@/components/ui/select', () => import('@/components/ui/select.doble-de-prueba'))`.
 *
 * Lee del árbol del `Select` el `id` y los `aria-*` del `SelectTrigger`, el
 * `placeholder` del `SelectValue` (la primera opción, con valor `''`) y cada
 * `SelectItem` (valor y texto).
 */
import * as React from 'react';

type Nodo = React.ReactNode;

function textoDe(n: Nodo): string {
  if (n === null || n === undefined || typeof n === 'boolean') return '';
  if (typeof n === 'string' || typeof n === 'number') return String(n);
  if (Array.isArray(n)) return n.map(textoDe).join('');
  if (React.isValidElement<{ children?: Nodo }>(n)) return textoDe(n.props.children);
  return '';
}

interface Leido {
  trigger: Record<string, unknown>;
  placeholder?: string;
  items: Array<{ value: string; texto: string; disabled?: boolean }>;
}

function leer(n: Nodo, l: Leido) {
  React.Children.forEach(n, (hijo) => {
    if (!React.isValidElement<Record<string, unknown> & { children?: Nodo }>(hijo)) return;
    if (hijo.type === SelectTrigger) {
      const { children, className: _c, ...resto } = hijo.props;
      l.trigger = resto;
      leer(children, l);
      return;
    }
    if (hijo.type === SelectValue) {
      if (typeof hijo.props.placeholder === 'string') l.placeholder = hijo.props.placeholder;
      return;
    }
    if (hijo.type === SelectItem) {
      l.items.push({
        value: String(hijo.props.value),
        texto: textoDe(hijo.props.children),
        disabled: Boolean(hijo.props.disabled),
      });
      return;
    }
    leer(hijo.props.children, l);
  });
}

export function Select({
  value,
  defaultValue,
  onValueChange,
  disabled,
  children,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
  disabled?: boolean;
  children?: Nodo;
}) {
  const l: Leido = { trigger: {}, items: [] };
  leer(children, l);
  const conVacia = l.placeholder !== undefined || !value;
  return (
    <select
      {...(l.trigger as React.SelectHTMLAttributes<HTMLSelectElement>)}
      disabled={disabled || Boolean(l.trigger.disabled)}
      value={value ?? undefined}
      defaultValue={value === undefined ? defaultValue : undefined}
      onChange={(e) => onValueChange?.(e.target.value)}
    >
      {conVacia && <option value="">{l.placeholder ?? ''}</option>}
      {l.items.map((i) => (
        <option key={i.value} value={i.value} disabled={i.disabled}>
          {i.texto}
        </option>
      ))}
    </select>
  );
}

export function SelectTrigger(_: Record<string, unknown> & { children?: Nodo }) {
  return null;
}
export function SelectValue(_: { placeholder?: string }) {
  return null;
}
export function SelectContent({ children }: { children?: Nodo }) {
  return <>{children}</>;
}
export function SelectItem(_: { value: string; children?: Nodo; disabled?: boolean }) {
  return null;
}
export const SelectGroup = SelectContent;
export function SelectLabel() {
  return null;
}
export function SelectSeparator() {
  return null;
}
export function SelectScrollUpButton() {
  return null;
}
export function SelectScrollDownButton() {
  return null;
}
