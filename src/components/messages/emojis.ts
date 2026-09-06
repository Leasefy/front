/**
 * El catálogo de emojis del compositor.
 *
 * Es propio y a mano, sin dependencia nueva: los paquetes de emojis traen los
 * ~1.900 de Unicode con su índice de búsqueda, y eso pesa cientos de kB para
 * una bandeja donde lo que se manda es «listo», «gracias» y «👍». Un set
 * elegido —caras, gestos, casa y símbolos— entra en un panel sin scroll
 * interminable y se recorre con la vista, que es lo que hace rápido a un
 * selector de emojis.
 *
 * El orden dentro de cada grupo NO es alfabético ni el de Unicode: primero lo
 * que de verdad se usa contestándole a un inquilino.
 */

export interface GrupoDeEmojis {
  /** La llave estable, para el `key` de React y para los tests. */
  id: string;
  etiquetaEs: string;
  etiquetaEn: string;
  emojis: string[];
}

export const GRUPOS_DE_EMOJIS: GrupoDeEmojis[] = [
  {
    id: 'caras',
    etiquetaEs: 'Caras',
    etiquetaEn: 'Faces',
    emojis: [
      '🙂', '😀', '😃', '😄', '😁', '😊', '😉', '😌',
      '😅', '😂', '🤣', '😍', '🥰', '😘', '🤗', '🤔',
      '😐', '😴', '😮', '😯', '😕', '🙁', '😢', '😭',
      '😅', '😬', '😳', '🥳', '😎', '🤝', '😇', '🫡',
    ],
  },
  {
    id: 'gestos',
    etiquetaEs: 'Gestos',
    etiquetaEn: 'Gestures',
    emojis: [
      '👍', '👎', '👌', '👏', '🙌', '🙏', '✌️', '🤞',
      '👋', '💪', '☝️', '👇', '👉', '👈', '✋', '🫶',
    ],
  },
  {
    id: 'casa',
    etiquetaEs: 'Casa y trámites',
    etiquetaEn: 'Home and paperwork',
    emojis: [
      '🏠', '🏡', '🏢', '🏬', '🔑', '🚪', '🛋️', '🛏️',
      '🚿', '🔧', '🔨', '🧹', '💡', '📅', '📆', '⏰',
      '📄', '📋', '📎', '✍️', '📝', '📷', '📍', '🚗',
      '💵', '💰', '🧾', '🏦', '📈', '📉', '📦', '🔒',
    ],
  },
  {
    id: 'simbolos',
    etiquetaEs: 'Símbolos',
    etiquetaEn: 'Symbols',
    emojis: [
      '✅', '❌', '⚠️', '❗', '❓', '⭐', '❤️', '🎉',
      '🔔', '📣', '🕐', '➡️', '⬅️', '🔁', '💬', '📌',
    ],
  },
];

/** Todos, aplanados. Útil para los tests y para contar sin recorrer grupos. */
export const TODOS_LOS_EMOJIS: string[] = GRUPOS_DE_EMOJIS.flatMap((g) => g.emojis);
