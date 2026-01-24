'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { postJSON, APIError } from '@/lib/api';
import CitySelect from '@/components/shared/CitySelect';
import type { RegisterInput, AuthResponse } from '@khadamat/contracts';

/**
 * RegisterForm
 *
 * Formulaire d'inscription avec tabs Client/Pro
 * - Tabs : [Client] vs [Pro]
 * - Champs communs : Prénom, Nom, Email, Phone, Password, Ville (cityId)
 * - Spécifique Client : Adresse complète (addressLine)
 * - Success : setAuth() + redirect selon rôle (CLIENT → '/', PRO → '/dashboard/kyc')
 * - Error : Affichage message d'erreur
 *
 * ⚠️ "use client" OBLIGATOIRE (hooks)
 */

export default function RegisterForm() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  // Tab state : 'CLIENT' ou 'PRO'
  const [role, setRole] = useState<'CLIENT' | 'PRO'>('CLIENT');

  // Form data
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    cityId: '', // Requis pour TOUS
    addressLine: '', // Requis pour CLIENT uniquement
  });

  // UI states
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Construire le payload selon le rôle
      const payload: RegisterInput = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role,
        cityId: formData.cityId, // Requis pour tous
        ...(role === 'CLIENT' && formData.addressLine
          ? { addressLine: formData.addressLine }
          : {}),
      };

      const response = await postJSON<AuthResponse>('/auth/register', payload);

      // Success : stocker auth et rediriger selon rôle
      setAuth(response.user, response.accessToken);

      // Redirect selon le rôle
      if (role === 'PRO') {
        router.push('/dashboard/kyc');
      } else {
        router.push('/');
      }
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('Une erreur est survenue');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs Client/Pro */}
      <div className="flex gap-2 border-b border-zinc-300 dark:border-zinc-700">
        <button
          type="button"
          onClick={() => setRole('CLIENT')}
          className={`px-6 py-3 font-medium transition ${
            role === 'CLIENT'
              ? 'border-b-2 border-zinc-900 dark:border-zinc-50 text-zinc-900 dark:text-zinc-50'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          Client
        </button>
        <button
          type="button"
          onClick={() => setRole('PRO')}
          className={`px-6 py-3 font-medium transition ${
            role === 'PRO'
              ? 'border-b-2 border-zinc-900 dark:border-zinc-50 text-zinc-900 dark:text-zinc-50'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          Professionnel
        </button>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Prénom */}
        <div>
          <label
            htmlFor="firstName"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
          >
            Prénom
          </label>
          <input
            type="text"
            id="firstName"
            value={formData.firstName}
            onChange={(e) =>
              setFormData({ ...formData, firstName: e.target.value })
            }
            className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50"
            placeholder="Votre prénom"
            required
          />
        </div>

        {/* Nom */}
        <div>
          <label
            htmlFor="lastName"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
          >
            Nom
          </label>
          <input
            type="text"
            id="lastName"
            value={formData.lastName}
            onChange={(e) =>
              setFormData({ ...formData, lastName: e.target.value })
            }
            className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50"
            placeholder="Votre nom"
            required
          />
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50"
            placeholder="exemple@email.com"
            required
          />
        </div>

        {/* Téléphone */}
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
          >
            Téléphone
          </label>
          <input
            type="tel"
            id="phone"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50"
            placeholder="0612345678"
            required
          />
        </div>

        {/* Mot de passe */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
          >
            Mot de passe
          </label>
          <input
            type="password"
            id="password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50"
            placeholder="••••••••"
            required
          />
        </div>

        {/* Ville (TOUS) */}
        <div>
          <label
            htmlFor="cityId"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
          >
            Ville <span className="text-red-500">*</span>
          </label>
          <CitySelect
            value={formData.cityId}
            onChange={(cityId) => setFormData({ ...formData, cityId })}
            required
          />
        </div>

        {/* Adresse complète (CLIENT uniquement) */}
        {role === 'CLIENT' && (
          <div>
            <label
              htmlFor="addressLine"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
            >
              Adresse complète <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="addressLine"
              value={formData.addressLine}
              onChange={(e) =>
                setFormData({ ...formData, addressLine: e.target.value })
              }
              className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50"
              placeholder="12 Rue Hassan II, Appartement 5"
              required
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Cette adresse sera utilisée pour vos réservations
            </p>
          </div>
        )}

        {/* Message d'erreur */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* Bouton Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Inscription...' : "S'inscrire"}
        </button>
      </form>
    </div>
  );
}
