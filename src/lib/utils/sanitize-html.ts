import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitiza HTML de contrato proveniente del backend antes de inyectarlo con
 * `dangerouslySetInnerHTML`. Defensa en profundidad contra XSS almacenado:
 * el HTML de contrato se plantilla desde campos con texto libre del
 * inquilino/propietario, así que se trata como no confiable.
 *
 * Devuelve un objeto listo para esparcir en el sink:
 *   <div {...sanitizeContractHtml(preview.html)} />
 */
export function sanitizeContractHtml(html: string | null | undefined): {
  dangerouslySetInnerHTML: { __html: string };
} {
  const clean = DOMPurify.sanitize(html ?? '', {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['script', 'style'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
  });
  return { dangerouslySetInnerHTML: { __html: clean } };
}
