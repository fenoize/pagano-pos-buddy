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
      // Intentar obtener 'id' o 'user_id' del objeto almacenado
      const userId = parsed?.id || parsed?.user_id;
      if (userId && typeof userId === 'string') {
        return userId;
      }
    }
  } catch (e) {
    console.error('Error parsing staff user from localStorage:', e);
  }

  // Backward-compat (legacy key)
  const legacy = localStorage.getItem('pos_user_id');
  return legacy || '';
}

/**
 * Verifica si hay un usuario staff autenticado
 */
export function hasStaffUser(): boolean {
  return getStaffUserId() !== '';
}
