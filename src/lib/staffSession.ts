import { STORAGE_KEYS } from '@/lib/storageKeys';

/**
 * Obtiene el ID del usuario staff autenticado desde el storage.
 * 
 * Nota: El POS usa una sesión propia (no Supabase Auth), por eso el user_id
 * se guarda en localStorage bajo STORAGE_KEYS.STAFF_USER.
 */
export function getStaffUserId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.STAFF_USER);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.id && typeof parsed.id === 'string') return parsed.id;
    }
  } catch {
    // ignore
  }

  // Backward-compat (legacy key)
  const legacy = localStorage.getItem('pos_user_id');
  return legacy || '';
}
