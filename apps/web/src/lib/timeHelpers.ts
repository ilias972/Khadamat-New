/**
 * Time Conversion Helpers
 *
 * Utilities pour convertir entre format "HH:MM" (frontend) et minutes depuis 00:00 (backend)
 */

/**
 * Convertit une heure au format "HH:MM" en minutes depuis 00:00
 *
 * @param time - Heure au format "HH:MM" (ex: "09:00", "18:30")
 * @returns Nombre de minutes depuis 00:00 (ex: 540, 1110)
 *
 * @example
 * timeToMinutes("09:00") // 540
 * timeToMinutes("18:30") // 1110
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convertit des minutes depuis 00:00 en heure au format "HH:MM"
 *
 * @param minutes - Nombre de minutes depuis 00:00
 * @returns Heure au format "HH:MM" (ex: "09:00", "18:30")
 *
 * @example
 * minutesToTime(540)  // "09:00"
 * minutesToTime(1110) // "18:30"
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Jours de la semaine (0 = Dimanche, 1 = Lundi, ..., 6 = Samedi)
 */
export const DAYS_OF_WEEK = [
  { value: 0, label: 'Dimanche' },
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
];
