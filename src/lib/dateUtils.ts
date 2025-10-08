import { format as formatFns, parseISO, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';

const SANTIAGO_TZ = 'America/Santiago';

export const formatDate = (
  date: string | Date, 
  formatStr: string = 'dd MMM yyyy HH:mm'
): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const zonedDate = toZonedTime(dateObj, SANTIAGO_TZ);
  return formatFns(zonedDate, formatStr, { locale: es });
};

export const formatDateShort = (date: string | Date): string => {
  return formatDate(date, 'dd/MM/yyyy');
};

export const formatDateTime = (date: string | Date): string => {
  return formatDate(date, 'dd MMM yyyy, HH:mm');
};

export const formatDateLong = (date: string | Date): string => {
  return formatDate(date, "dd 'de' MMMM 'de' yyyy, HH:mm");
};

export const formatDistanceToNowInSpanish = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true, locale: es });
};
