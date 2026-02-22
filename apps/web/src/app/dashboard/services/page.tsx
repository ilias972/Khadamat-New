'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [servicesForm, setServicesForm] = useState<Record<string, ServiceFormData>>({});
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Charger catégories et services existants (DS-10: with retry support)
  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [categoriesData, dashboardData] = await Promise.all([
        getJSON<Category[]>('/public/categories'),
        getJSON<{ profile: { isPremium: boolean }; services: ProService[] }>('/pro/me'),
      ]);

      setCategories(categoriesData);
      setIsPremium(dashboardData.profile.isPremium);

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

  useEffect(() => {
    fetchData();
  }, []);

  // DS-11: Auto-dismiss success after 3s
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

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

    // DS-07: Frontend validation
    const activeServices = Object.values(servicesForm).filter((s) => s.isActive);
    for (const service of activeServices) {
      if (service.pricingType === 'FIXED') {
        const fixedPrice = Number(service.fixedPriceMad);
        if (isNaN(fixedPrice) || fixedPrice <= 0) {
          setError('Prix fixe invalide : veuillez saisir un montant supérieur à 0.');
          return;
        }
      } else if (service.pricingType === 'RANGE') {
        const minPrice = Number(service.minPriceMad);
        const maxPrice = Number(service.maxPriceMad);
        if (isNaN(minPrice) || isNaN(maxPrice) || minPrice <= 0 || maxPrice <= 0) {
          setError('Fourchette invalide : le minimum doit être inférieur au maximum (et supérieur à 0).');
          return;
        }
        if (minPrice >= maxPrice) {
          setError('Fourchette invalide : le minimum doit être inférieur au maximum (et supérieur à 0).');
          return;
        }
      }
    }

    setSaving(true);

    try {
      // Construire le payload : Array de ProServiceInput (DS-07: Number() instead of parseInt)
      const payload = Object.values(servicesForm)
        .filter((service) => service.isActive)
        .map((service) => ({
          categoryId: service.categoryId,
          pricingType: service.pricingType,
          fixedPriceMad:
            service.pricingType === 'FIXED' && service.fixedPriceMad
              ? Number(service.fixedPriceMad)
              : undefined,
          minPriceMad:
            service.pricingType === 'RANGE' && service.minPriceMad
              ? Number(service.minPriceMad)
              : undefined,
          maxPriceMad:
            service.pricingType === 'RANGE' && service.maxPriceMad
              ? Number(service.maxPriceMad)
              : undefined,
          isActive: service.isActive,
        }));

      await putJSON('/pro/services', payload);
      setSuccess('Services mis à jour avec succès !');

      // Recharger les services
      const dashboardData = await getJSON<{ profile: { isPremium: boolean }; services: ProService[] }>(
        '/pro/me',
      );
      setIsPremium(dashboardData.profile.isPremium);

      // Update form with fresh data
      const updatedForm: Record<string, ServiceFormData> = {};
      categories.forEach((cat) => {
        const existingService = dashboardData.services.find(
          (s) => s.categoryId === cat.id,
        );

        if (existingService) {
          updatedForm[cat.id] = {
            categoryId: cat.id,
            isActive: existingService.isActive,
            pricingType: (existingService.pricingType as 'FIXED' | 'RANGE') || 'FIXED',
            fixedPriceMad: existingService.fixedPriceMad?.toString() || '',
            minPriceMad: existingService.minPriceMad?.toString() || '',
            maxPriceMad: existingService.maxPriceMad?.toString() || '',
          };
        } else {
          updatedForm[cat.id] = servicesForm[cat.id];
        }
      });
      setServicesForm(updatedForm);
    } catch (err) {
      if (err instanceof APIError) {
        // DS-03: Handle KYC 403
        if (err.statusCode === 403 && (err.message.includes('KYC_NOT_APPROVED') || err.response?.code === 'KYC_NOT_APPROVED')) {
          router.replace('/dashboard/kyc');
          return;
        }
        // DS-02: Premium limit error
        if (err.message.includes('SERVICE_LIMIT_REACHED') || err.response?.code === 'SERVICE_LIMIT_REACHED') {
          const maxServices = isPremium ? 3 : 1;
          setError(`Limite atteinte : vous pouvez activer jusqu'à ${maxServices} service(s).`);
        } else {
          setError(err.message);
        }
      } else {
        setError('Erreur lors de la sauvegarde');
      }
    } finally {
      setSaving(false);
    }
  };

  // DS-02: Calculate service limits
  const maxServices = isPremium ? 3 : 1;
  const enabledCount = Object.values(servicesForm).filter((s) => s.isActive).length;
  const remaining = Math.max(0, maxServices - enabledCount);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-text-primary">
            Services
          </h1>
          <p className="text-text-secondary mt-2">
            Gérez vos services et tarifs
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-surface rounded-lg border border-border p-8 text-center">
            {/* DS-06: motion-safe:animate-spin */}
            <div className="motion-safe:animate-spin rounded-full h-12 w-12 border-b-2 border-inverse-bg mx-auto mb-4"></div>
            <p className="text-text-secondary">Chargement...</p>
          </div>
        )}

        {/* DS-10: Error with retry button */}
        {!loading && error && !success && (
          <div className="bg-error-50 border border-error-200 rounded-lg p-4" role="alert">
            <p className="text-error-800 mb-3">{error}</p>
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-4 py-2 bg-inverse-bg text-inverse-text rounded-lg hover:bg-inverse-hover transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Form */}
        {!loading && !error && (
          <>
            {/* DS-02: Premium quota display */}
            <div className="bg-info-50 border border-info-200 rounded-lg p-4">
              <p className="text-info-800 font-medium">
                Services activés : {enabledCount}/{maxServices} — Restants : {remaining}
              </p>
              {!isPremium && (
                <p className="text-info-700 text-sm mt-1">
                  Passez Premium pour activer jusqu'à 3 services.
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {categories.map((category) => {
                const service = servicesForm[category.id];
                if (!service) return null;

                // DS-02: Disable toggle when limit reached (unless already enabled)
                const limitReached = enabledCount >= maxServices;
                const shouldDisableToggle = !service.isActive && limitReached;

                return (
                  <div
                    key={category.id}
                    className="bg-surface rounded-lg border border-border p-6"
                  >
                    {/* Toggle Service */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-text-primary">
                          {category.name}
                        </h3>
                      </div>
                      <label
                        htmlFor={`service-toggle-${category.id}`}
                        className={`flex items-center ${shouldDisableToggle ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        {/* DS-05: aria-label + aria-describedby on sr-only checkbox */}
                        <input
                          type="checkbox"
                          id={`service-toggle-${category.id}`}
                          checked={service.isActive}
                          onChange={() => handleToggleService(category.id)}
                          disabled={shouldDisableToggle || saving}
                          aria-label={`Activer ou désactiver le service ${category.name}`}
                          aria-describedby={`service-state-${category.id}`}
                          className="sr-only peer"
                        />
                        <div className="relative w-11 h-6 bg-border-strong peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-inverse-bg rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-inverse-bg peer-disabled:opacity-50"></div>
                        <span className="ml-3 text-sm font-medium text-text-label">
                          {service.isActive ? 'Actif' : 'Inactif'}
                        </span>
                        {/* DS-05: Screen reader state */}
                        <span id={`service-state-${category.id}`} className="sr-only">
                          {service.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </label>
                    </div>

                    {/* Pricing Configuration (shown only if active) */}
                    {service.isActive && (
                      <div className="space-y-4 pt-4 border-t border-border">
                        {/* Pricing Type */}
                        <div>
                          {/* DS-04: htmlFor on label */}
                          <label htmlFor={`service-pricing-${category.id}`} className="block text-sm font-medium text-text-label mb-2">
                            Type de tarification
                          </label>
                          <select
                            id={`service-pricing-${category.id}`}
                            value={service.pricingType}
                            onChange={(e) =>
                              handleChange(
                                category.id,
                                'pricingType',
                                e.target.value as 'FIXED' | 'RANGE',
                              )
                            }
                            className="w-full px-4 py-2 bg-background border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-inverse-bg text-text-primary"
                          >
                            <option value="FIXED">Prix fixe</option>
                            <option value="RANGE">Fourchette de prix</option>
                          </select>
                        </div>

                        {/* Fixed Price */}
                        {service.pricingType === 'FIXED' && (
                          <div>
                            {/* DS-04: htmlFor on label */}
                            <label htmlFor={`service-fixed-${category.id}`} className="block text-sm font-medium text-text-label mb-2">
                              Prix fixe (MAD)
                            </label>
                            {/* DS-07: min="0.01" step="0.01" */}
                            <input
                              type="number"
                              id={`service-fixed-${category.id}`}
                              value={service.fixedPriceMad}
                              onChange={(e) =>
                                handleChange(category.id, 'fixedPriceMad', e.target.value)
                              }
                              className="w-full px-4 py-2 bg-background border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-inverse-bg text-text-primary"
                              placeholder="150"
                              min="0.01"
                              step="0.01"
                              required
                            />
                          </div>
                        )}

                        {/* Price Range */}
                        {service.pricingType === 'RANGE' && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              {/* DS-04: htmlFor on label */}
                              <label htmlFor={`service-min-${category.id}`} className="block text-sm font-medium text-text-label mb-2">
                                Prix minimum (MAD)
                              </label>
                              {/* DS-07: min="0.01" step="0.01" */}
                              <input
                                type="number"
                                id={`service-min-${category.id}`}
                                value={service.minPriceMad}
                                onChange={(e) =>
                                  handleChange(category.id, 'minPriceMad', e.target.value)
                                }
                                className="w-full px-4 py-2 bg-background border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-inverse-bg text-text-primary"
                                placeholder="100"
                                min="0.01"
                                step="0.01"
                                required
                              />
                            </div>
                            <div>
                              {/* DS-04: htmlFor on label */}
                              <label htmlFor={`service-max-${category.id}`} className="block text-sm font-medium text-text-label mb-2">
                                Prix maximum (MAD)
                              </label>
                              {/* DS-07: min="0.01" step="0.01" */}
                              <input
                                type="number"
                                id={`service-max-${category.id}`}
                                value={service.maxPriceMad}
                                onChange={(e) =>
                                  handleChange(category.id, 'maxPriceMad', e.target.value)
                                }
                                className="w-full px-4 py-2 bg-background border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-inverse-bg text-text-primary"
                                placeholder="200"
                                min="0.01"
                                step="0.01"
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

              {/* Messages (role="alert" for accessibility) */}
              {error && !loading && (
                <div className="bg-error-50 border border-error-200 rounded-lg p-4" role="alert">
                  <p className="text-error-800">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-success-50 border border-success-200 rounded-lg p-4" role="alert">
                  <p className="text-success-800">{success}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={saving}
                className="w-full px-6 py-3 bg-inverse-bg text-inverse-text rounded-lg hover:bg-inverse-hover transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer les services'}
              </button>
            </form>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
