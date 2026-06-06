import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Re-export utilities for convenience
export * from './utils/storage'
export * from './utils/logger'
export * from './utils/safe-redirect'
