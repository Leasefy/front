'use client';

// Re-exports the shared PermissionsContext so callers don't need to change their import.
// The actual fetch happens once in PermissionsProvider (inmobiliaria layout).
export { usePermissionsContext as usePermissions } from '@/lib/context/PermissionsContext';
