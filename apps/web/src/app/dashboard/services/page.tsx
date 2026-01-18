'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getJSON, putJSON, APIError } from '@/lib/api';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

/**
 * Dashboard Services Page
 *
 * Permet au Pro de gérer ses services :
 * - Activer/désactiver des services par catégorie
 * - Définir le type de prix (FIXED ou RANGE)
 * - Saisir les prix correspondants
 *
 * ⚠️ "use client" OBLIGATOIRE
 */

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ProService {
  id: string;
  categoryId: string;
  category: Category;
  pricingType: string | null;
  fixedPriceMad: number | null;
  minPriceMad: number | null;
  maxPriceMad: number | null;
  isActive: boolean;
}

interface ServiceFormData {
  categoryId: string;
  isActive: boolean;
  pricingType: 'FIXED' | 'RANGE';
  fixedPriceMad: string;
  minPriceMad: string;
  maxPriceMad: string;
}

export default function ServicesPage() {
  const { accessToken } = useAuthStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [existingServices, setExistingServices] = useState<ProService[]>([]);
  const [servicesForm, setServicesForm] = useState<Record<string, ServiceFormData>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Charger catégories et services existants
  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken) return;

      try {
        const [categoriesData, dashboardData] = await Promise.all([
          getJSON<Category[]>('/public/categories'),
          getJSON<{ services: ProService[] }>('/pro/me', accessToken),
        ]);

        setCategories(categoriesData);
        setExistingServices(dashboardData.services);

        // Initialiser le formulaire avec les services existants
        const initialForm: Record<string, ServiceFormData> = {};
        categoriesData.forEach((cat) => {
          const existingService = dashboardData.services.find(
            (s) => s.categoryId === cat.id,
          );

          if (existingService) {
            initialForm[cat.id] = {
              categoryId: cat.id,
              isActive: existingService.isActive,
              pricingType: (existingService.pricingType as 'FIXED' | 'RANGE') || 'FIXED',
              fixedPriceMad: existingService.fixedPriceMad?.toString() || '',
              minPriceMad: existingService.minPriceMad?.toString() || '',
              maxPriceMad: existingService.maxPriceMad?.toString() || '',
            };
          } else {
            initialForm[cat.id] = {
              categoryId: cat.id,
              isActive: false,
              pricingType: 'FIXED',
              fixedPriceMad: '',
              minPriceMad: '',
              maxPriceMad: '',
            };
          }
        });

        setServicesForm(initialForm);
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
  }, [accessToken]);

  const handleToggleService = (categoryId: string) => {
    setServicesForm((prev) => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        isActive: !prev[categoryId].isActive,
      },
    }));
  };

  const handleChange = (categoryId: string, field: keyof ServiceFormData, value: any) => {
    setServicesForm((prev) => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      // Construire le payload : Array de ProServiceInput
      const payload = Object.values(servicesForm)
        .filter((service) => service.isActive) // Seulement les services actifs
        .map((service) => ({
          categoryId: service.categoryId,
          pricingType: service.pricingType,
          fixedPriceMad:
            service.pricingType === 'FIXED' && service.fixedPriceMad
              ? parseInt(service.fixedPriceMad, 10)
              : undefined,
          minPriceMad:
            service.pricingType === 'RANGE' && service.minPriceMad
              ? parseInt(service.minPriceMad, 10)
              : undefined,
          maxPriceMad:
            service.pricingType === 'RANGE' && service.maxPriceMad
              ? parseInt(service.maxPriceMad, 10)
              : undefined,
          isActive: service.isActive,
        }));

      await putJSON('/pro/services', payload, accessToken || undefined);
      setSuccess('Services mis à jour avec succès !');

      // Recharger les services
      const dashboardData = await getJSON<{ services: ProService[] }>(
        '/pro/me',
        accessToken || undefined,
      );
      setExistingServices(dashboardData.services);
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
            Services
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            Gérez vos services et tarifs
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
            {categories.map((category) => {
              const service = servicesForm[category.id];
              if (!service) return null;

              return (
                <div
                  key={category.id}
                  className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6"
                >
                  {/* Toggle Service */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                        {category.name}
                      </h3>
                    </div>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={service.isActive}
                        onChange={() => handleToggleService(category.id)}
                        className="sr-only peer"
                      />
                      <div className="relative w-11 h-6 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-zinc-900 dark:peer-focus:ring-zinc-50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-900 dark:peer-checked:bg-zinc-50"></div>
                      <span className="ml-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        {service.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </label>
                  </div>

                  {/* Pricing Configuration (shown only if active) */}
                  {service.isActive && (
                    <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                      {/* Pricing Type */}
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                          Type de tarification
                        </label>
                        <select
                          value={service.pricingType}
                          onChange={(e) =>
                            handleChange(
                              category.id,
                              'pricingType',
                              e.target.value as 'FIXED' | 'RANGE',
                            )
                          }
                          className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50"
                        >
                          <option value="FIXED">Prix fixe</option>
                          <option value="RANGE">Fourchette de prix</option>
                        </select>
                      </div>

                      {/* Fixed Price */}
                      {service.pricingType === 'FIXED' && (
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Prix fixe (MAD)
                          </label>
                          <input
                            type="number"
                            value={service.fixedPriceMad}
                            onChange={(e) =>
                              handleChange(category.id, 'fixedPriceMad', e.target.value)
                            }
                            className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50"
                            placeholder="150"
                            min="0"
                            required
                          />
                        </div>
                      )}

                      {/* Price Range */}
                      {service.pricingType === 'RANGE' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                              Prix minimum (MAD)
                            </label>
                            <input
                              type="number"
                              value={service.minPriceMad}
                              onChange={(e) =>
                                handleChange(category.id, 'minPriceMad', e.target.value)
                              }
                              className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50"
                              placeholder="100"
                              min="0"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                              Prix maximum (MAD)
                            </label>
                            <input
                              type="number"
                              value={service.maxPriceMad}
                              onChange={(e) =>
                                handleChange(category.id, 'maxPriceMad', e.target.value)
                              }
                              className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50"
                              placeholder="200"
                              min="0"
                              required
                            />
                          </div>
                        </div>
                      )}
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
              {saving ? 'Enregistrement...' : 'Enregistrer les services'}
            </button>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
