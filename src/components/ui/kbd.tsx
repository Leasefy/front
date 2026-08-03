/**
 * Kbd — THIN SHIM over @leasefy/cadence.
 *
 * Sin call sites en el mvp (0 imports). El Kbd del DS (mono, keycap hairline,
 * size sm/md) pasa a ser la única API. Los helpers legacy sin uso
 * (KeyboardShortcut, PlatformShortcut, formatKey, shortcuts) se eliminan.
 */

export { Kbd } from "@leasefy/cadence"
export type { KbdProps } from "@leasefy/cadence"
