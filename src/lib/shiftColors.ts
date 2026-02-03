import { HRShift } from '@/types/hr';

export type ShiftColorConfig = {
  border: string;
  bg: string;
  label: string;
};

/**
 * Determina los colores del turno basándose en:
 * 1. Estado administrativo (approved/paid) → Gris
 * 2. Respuesta del empleado (rejected) → Rojo
 * 3. Respuesta del empleado (accepted) → Verde
 * 4. Default (pendiente) → Amarillo
 */
export function getShiftColors(shift: HRShift): ShiftColorConfig {
  // Prioridad 1: Turno aprobado/pagado (ya realizado)
  if (shift.status === 'approved' || shift.status === 'paid') {
    return {
      border: 'border-l-gray-400',
      bg: 'bg-gray-100 dark:bg-gray-800/40',
      label: 'Aprobado',
    };
  }

  // Prioridad 2: Rechazado por empleado
  if (shift.employee_response === 'rejected') {
    return {
      border: 'border-l-red-500',
      bg: 'bg-red-50 dark:bg-red-950/30',
      label: 'Rechazado',
    };
  }

  // Prioridad 3: Aceptado por empleado
  if (shift.employee_response === 'accepted') {
    return {
      border: 'border-l-green-500',
      bg: 'bg-green-50 dark:bg-green-950/30',
      label: 'Aceptado',
    };
  }

  // Default: Pendiente (amarillo)
  return {
    border: 'border-l-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    label: 'Pendiente',
  };
}

// Leyenda de colores para mostrar en la UI
export const SHIFT_COLOR_LEGEND = [
  { color: 'bg-amber-500', label: 'Pendiente' },
  { color: 'bg-green-500', label: 'Aceptado' },
  { color: 'bg-gray-400', label: 'Aprobado' },
  { color: 'bg-red-500', label: 'Rechazado' },
] as const;
