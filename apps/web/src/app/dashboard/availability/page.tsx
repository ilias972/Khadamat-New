'use client';

import { useEffect, useState } from 'react';
import { getJSON, putJSON, APIError } from '@/lib/api';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { timeToMinutes, minutesToTime, DAYS_OF_WEEK } from '@/lib/timeHelpers';

/**
 * Dashboard Availability Page
 *
 * Permet au Pro de gérer ses disponibilités hebdomadaires :
 * - Activer/désactiver des jours
 * - Définir les heures de début et fin (format HH:MM)
 * - Conversion automatique en minutes pour l'API
 *
 * ⚠️ "use client" OBLIGATOIRE
 */

interface AvailabilitySlot {
  id?: string;
  dayOfWeek: number;
  startMin: number;
  endMin: number;
  isActive: boolean;
}

interface AvailabilityFormSlot {
  dayOfWeek: number;
  startTime: string; // Format "HH:MM"
  endTime: string; // Format "HH:MM"
  isActive: boolean;
}

export default function AvailabilityPage() {
  const [availability, setAvailability] = useState<AvailabilityFormSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Charger les disponibilités existantes
  useEffect(() => {
    const fetchData = async () => {
      try {
        const dashboardData = await getJSON<{ availability: AvailabilitySlot[] }>(
          '/pro/me',
        );

        // Initialiser le formulaire avec les disponibilités existantes
        const initialForm: AvailabilityFormSlot[] = DAYS_OF_WEEK.map((day) => {
          const existingSlot = dashboardData.availability.find(
            (slot) => slot.dayOfWeek === day.value,
          );

          if (existingSlot) {
            return {
              dayOfWeek: day.value,
              startTime: minutesToTime(existingSlot.startMin),
              endTime: minutesToTime(existingSlot.endMin),
              isActive: existingSlot.isActive,
            };
          } else {
            // Valeurs par défaut : 9h-18h, inactif
            return {
              dayOfWeek: day.value,
              startTime: '09:00',
              endTime: '18:00',
              isActive: false,
            };
          }
        });

        setAvailability(initialForm);
      } catch (err) {
        if (err instanceof APIError) {
          setError(err.message);
        } else {
          setError('Erreur lors du chargement');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleToggleDay = (dayOfWeek: number) => {
    setAvailability((prev) =>
      prev.map((slot) =>
        slot.dayOfWeek === dayOfWeek
          ? { ...slot, isActive: !slot.isActive }
          : slot,
      ),
    );
  };

  const handleChange = (
    dayOfWeek: number,
    field: 'startTime' | 'endTime',
    value: string,
  ) => {
    setAvailability((prev) =>
      prev.map((slot) =>
        slot.dayOfWeek === dayOfWeek ? { ...slot, [field]: value } : slot,
      ),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      // Construire le payload : Array de AvailabilitySlotInput
      // Convertir les heures (HH:MM) en minutes
      const payload = availability
        .filter((slot) => slot.isActive) // Seulement les jours actifs
        .map((slot) => ({
          dayOfWeek: slot.dayOfWeek,
          startMin: timeToMinutes(slot.startTime),
          endMin: timeToMinutes(slot.endTime),
          isActive: slot.isActive,
        }));

      await putJSON('/pro/availability', payload);
      setSuccess('Disponibilités mises à jour avec succès !');

      // Recharger les disponibilités
      const dashboardData = await getJSON<{ availability: AvailabilitySlot[] }>(
        '/pro/me',
      );

      // Mettre à jour le formulaire avec les nouvelles données
      const updatedForm: AvailabilityFormSlot[] = DAYS_OF_WEEK.map((day) => {
        const existingSlot = dashboardData.availability.find(
          (slot) => slot.dayOfWeek === day.value,
        );

        if (existingSlot) {
          return {
            dayOfWeek: day.value,
            startTime: minutesToTime(existingSlot.startMin),
            endTime: minutesToTime(existingSlot.endMin),
            isActive: existingSlot.isActive,
          };
        } else {
          return {
            dayOfWeek: day.value,
            startTime: '09:00',
            endTime: '18:00',
            isActive: false,
          };
        }
      });

      setAvailability(updatedForm);
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('Erreur lors de la sauvegarde');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Disponibilités
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            Gérez vos horaires de travail hebdomadaires
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 dark:border-zinc-50 mx-auto mb-4"></div>
            <p className="text-zinc-600 dark:text-zinc-400">Chargement...</p>
          </div>
        )}

        {/* Form */}
        {!loading && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {availability.map((slot, index) => {
              const dayInfo = DAYS_OF_WEEK[index];

              return (
                <div
                  key={slot.dayOfWeek}
                  className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6"
                >
                  {/* Day Toggle */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      {dayInfo.label}
                    </h3>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={slot.isActive}
                        onChange={() => handleToggleDay(slot.dayOfWeek)}
                        className="sr-only peer"
                      />
                      <div className="relative w-11 h-6 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-zinc-900 dark:peer-focus:ring-zinc-50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-900 dark:peer-checked:bg-zinc-50"></div>
                      <span className="ml-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        {slot.isActive ? 'Travaillé' : 'Repos'}
                      </span>
                    </label>
                  </div>

                  {/* Time Range (shown only if active) */}
                  {slot.isActive && (
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                          Heure de début
                        </label>
                        <input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) =>
                            handleChange(slot.dayOfWeek, 'startTime', e.target.value)
                          }
                          className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                          Heure de fin
                        </label>
                        <input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) =>
                            handleChange(slot.dayOfWeek, 'endTime', e.target.value)
                          }
                          className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50"
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Messages */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-green-800 dark:text-green-200">{success}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={saving}
              className="w-full px-6 py-3 bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer les disponibilités'}
            </button>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
