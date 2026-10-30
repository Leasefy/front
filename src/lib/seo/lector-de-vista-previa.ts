/**
 * Los que leen un enlace para armar su vista previa (WhatsApp, Facebook, Telegram, Slack…). No siempre siguen una
 * redirección: el middleware les sirve la página pública ahí mismo (Nico, 28-10-2026: la foto del inmueble compartido
 * «sí o sí tiene que ir»).
 */
const LECTORES_DE_VISTA_PREVIA =
  /WhatsApp|facebookexternalhit|Facebot|Twitterbot|Slackbot|TelegramBot|LinkedInBot|Discordbot|SkypeUriPreview|Pinterestbot|redditbot|Applebot|vkShare|Iframely|Embedly/i;

export function esLectorDeVistaPrevia(agente: string | null): boolean {
  return Boolean(agente && LECTORES_DE_VISTA_PREVIA.test(agente));
}
