/**
 * Avatar — THIN SHIM over @leasefy/ui.
 *
 * Sin call sites en el mvp (0 imports). La API composable legacy
 * (Avatar/AvatarImage/AvatarFallback/AvatarGroup/AvatarWithStatus,
 * getInitials, getColorFromString) no se usaba en ninguna parte, así que el
 * Avatar monolítico del DS (`name` + initials/accent automáticos, AvatarStack)
 * pasa a ser la única API.
 */

export { Avatar, AvatarStack } from "@leasefy/ui"
export type { AvatarProps, AvatarStackProps, AvatarSize } from "@leasefy/ui"
