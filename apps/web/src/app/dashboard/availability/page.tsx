'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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

interface DayError {
  dayOfWeek: number;
  message: string;
}

// DA-08: Helper functions for mapping (DRY)
function apiAvailabilityToFormState(apiData: AvailabilitySlot[]): AvailabilityFormSlot[] {
  return DAYS_OF_WEEK.map((day) => {
    const existingSlot = apiData.find((slot) => slot.dayOfWeek === day.value);

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
}

function formStateToPayload(formState: AvailabilityFormSlot[]) {
  return formState
    .filter((slot) => slot.isActive)
    .map((slot) => ({
      dayOfWeek: slot.dayOfWeek,
      startMin: timeToMinutes(slot.startTime),
      endMin: timeToMinutes(slot.endTime),
      isActive: slot.isActive,
    }));
}

export default function AvailabilityPage() {
  const router = useRouter();
  const [availability, setAvailability] = useState<AvailabilityFormSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dayErrors, setDayErrors] = useState<DayError[]>([]);
  const [success, setSuccess] = useState('');

  // DA-09: Extract loadData for retry functionality
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dashboardData = await getJSON<{ availability: AvailabilitySlot[] }>('/pro/me');
      const initialForm = apiAvailabilityToFormState(dashboardData.availability);
      setAvailability(initialForm);
    } catch (err) {
      if (err instanceof APIError) {
        // DA-03: Handle KYC 403
        if (err.statusCode === 403 && (err.message.includes('KYC_NOT_APPROVED') || err.response?.code === 'KYC_NOT_APPROVED')) {
          router.replace('/dashboard/kyc');
          return;
        }
        setError(err.message);
      } else {
        setError('Erreur lors du chargement');
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Charger les disponibilités existantes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // DA-11: Auto-dismiss success after 3s
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleToggleDay = (dayOfWeek: number) => {
    setAvailability((prev) =>
      prev.map((slot) =>
        slot.dayOfWeek === dayOfWeek
          ? { ...slot, isActive: !slot.isActive }
          : slot,
      ),
    );
    // Clear day errors when toggling
    setDayErrors((prev) => prev.filter((e) => e.dayOfWeek !== dayOfWeek));
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
    // Clear day errors when changing time
    setDayErrors((prev) => prev.filter((e) => e.dayOfWeek !== dayOfWeek));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess('');
    setDayErrors([]);

    // DA-02: Client-side validation startTime < endTime
    const errors: DayError[] = [];
    const activeSlots = availability.filter((slot) => slot.isActive);

    for (const slot of activeSlots) {
      if (!slot.startTime || !slot.endTime) {
        errors.push({
          dayOfWeek: slot.dayOfWeek,
          message: 'Veuillez renseigner une heure de début et de fin.',
        });
        continue;
      }

      const startMin = timeToMinutes(slot.startTime);
      const endMin = timeToMinutes(slot.endTime);

      if (startMin >= endMin) {
        errors.push({
          dayOfWeek: slot.dayOfWeek,
          message: 'L\'heure de début doit être avant l\'heure de fin.',
        });
      }
    }

    if (errors.length > 0) {
      setDayErrors(errors);
      setError('Veuillez corriger les erreurs dans les horaires.');
      return;
    }

    setSaving(true);

    try {
      const payload = formStateToPayload(availability);
      await putJSON('/pro/availability', payload);
      setSuccess('Disponibilités mises à jour avec succès !');

      // Recharger les disponibilités
      const dashboardData = await getJSON<{ availability: AvailabilitySlot[] }>('/pro/me');
      const updatedForm = apiAvailabilityToFormState(dashboardData.availability);
      setAvailability(updatedForm);
    } catch (err) {
      if (err instanceof APIError) {
        // DA-03: Handle KYC 403
        if (err.statusCode === 403 && (err.message.includes('KYC_NOT_APPROVED') || err.response?.code === 'KYC_NOT_APPROVED')) {
          router.replace('/dashboard/kyc');
          return;
        }
        setError(err.message);
      } else {
        setError('Erreur lors de la sauvegarde');
      }
    } finally {
      setSaving(false);
    }
  };

  // Check if form has validation errors
  const hasValidationErrors = dayErrors.length > 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-text-primary">
            Disponibilités
          </h1>
          <p className="text-text-secondary mt-2">
            Gérez vos horaires de travail hebdomadaires
          </p>
        </div>

        {/* DA-09: Error banner with retry */}
        {error && !loading && (
          <div className="bg-error-50 border border-error-200 rounded-lg p-4" role="alert">
            <p className="text-error-800 mb-3">{error}</p>
            {!saving && (
              <button
                onClick={loadData}
                disabled={loading}
                className="px-4 py-2 bg-error-600 text-inverse-text rounded-lg hover:bg-error-700 motion-safe:transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Réessayer
              </button>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="bg-surface rounded-lg border border-border p-8 text-center" aria-busy="true">
            {/* DA-06: motion-safe:animate-spin */}
            <div className="motion-safe:animate-spin rounded-full h-12 w-12 border-b-2 border-inverse-bg mx-auto mb-4"></div>
            <p className="text-text-secondary">Chargement...</p>
          </div>
        )}

        {/* Form */}
        {!loading && !error && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {availability.map((slot, index) => {
              const dayInfo = DAYS_OF_WEEK[index];
              const dayError = dayErrors.find((e) => e.dayOfWeek === slot.dayOfWeek);

              return (
                /* DA-04: Semantic fieldset for grouping */
                <fieldset
                  key={slot.dayOfWeek}
                  className="bg-surface rounded-lg border border-border p-6"
                >
                  <legend className="sr-only">Disponibilité pour {dayInfo.label}</legend>

                  {/* Day Toggle */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-text-primary">
                      {dayInfo.label}
                    </h3>
                    <label
                      htmlFor={`toggle-${slot.dayOfWeek}`}
                      className="flex items-center cursor-pointer"
                    >
                      {/* DA-05: aria-label on sr-only checkbox */}
                      <input
                        type="checkbox"
                        id={`toggle-${slot.dayOfWeek}`}
                        checked={slot.isActive}
                        onChange={() => handleToggleDay(slot.dayOfWeek)}
                        aria-label={`Activer la disponibilité pour ${dayInfo.label}`}
                        className="sr-only peer"
                      />
                      {/* DA-06: motion-safe on transitions */}
                      <div className="relative w-11 h-6 bg-border-strong peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-inverse-bg rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 motion-safe:after:transition-all peer-checked:bg-inverse-bg"></div>
                      <span className="ml-3 text-sm font-medium text-text-label">
                        {slot.isActive ? 'Travaillé' : 'Repos'}
                      </span>
                    </label>
                  </div>

                  {/* Time Range (shown only if active) */}
                  {slot.isActive && (
                    <div className="pt-4 border-t border-border">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          {/* DA-04: htmlFor on label */}
                          <label
                            htmlFor={`start-${slot.dayOfWeek}`}
                            className="block text-sm font-medium text-text-label mb-2"
                          >
                            Heure de début
                          </label>
                          <input
                            type="time"
                            id={`start-${slot.dayOfWeek}`}
                            value={slot.startTime}
                            onChange={(e) =>
                              handleChange(slot.dayOfWeek, 'startTime', e.target.value)
                            }
                            aria-describedby={dayError ? `error-${slot.dayOfWeek}` : undefined}
                            aria-invalid={!!dayError}
                            className="w-full px-4 py-2 bg-background border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-inverse-bg text-text-primary"
                            required
                          />
                        </div>
                        <div>
                          {/* DA-04: htmlFor on label */}
                          <label
                            htmlFor={`end-${slot.dayOfWeek}`}
                            className="block text-sm font-medium text-text-label mb-2"
                          >
                            Heure de fin
                          </label>
                          <input
                            type="time"
                            id={`end-${slot.dayOfWeek}`}
                            value={slot.endTime}
                            onChange={(e) =>
                              handleChange(slot.dayOfWeek, 'endTime', e.target.value)
                            }
                            aria-describedby={dayError ? `error-${slot.dayOfWeek}` : undefined}
                            aria-invalid={!!dayError}
                            className="w-full px-4 py-2 bg-background border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-inverse-bg text-text-primary"
                            required
                          />
                        </div>
                      </div>

                      {/* DA-02: Inline error message */}
                      {dayError && (
                        <p
                          id={`error-${slot.dayOfWeek}`}
                          className="text-error-700 text-sm mt-2"
                          role="alert"
                        >
                          {dayError.message}
                        </p>
                      )}
                    </div>
                  )}
                </fieldset>
              );
            })}

            {/* Success message */}
            {success && (
              <div className="bg-success-50 border border-success-200 rounded-lg p-4" role="alert">
                <p className="text-success-800">{success}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={saving || hasValidationErrors}
              className="w-full px-6 py-3 bg-inverse-bg text-inverse-text rounded-lg hover:bg-inverse-hover motion-safe:transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer les disponibilités'}
            </button>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
