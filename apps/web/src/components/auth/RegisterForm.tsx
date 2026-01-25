'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { APIError } from '@/lib/api';
import CitySelect from '@/components/shared/CitySelect';
import type { AuthResponse } from '@khadamat/contracts';

/**
 * RegisterForm
 *
 * Formulaire d'inscription ATOMIQUE avec tabs Client/Pro
 * - Tabs : [Client] vs [Pro]
 * - Champs communs : Prénom, Nom, Email, Phone, Password, Ville (cityId)
 * - Spécifique Client : Adresse complète (addressLine)
 * - Spécifique PRO : cinNumber, cinFront (photo), cinBack (photo) - OBLIGATOIRES
 * - Soumission : FormData multipart/form-data (atomic backend)
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
    cinNumber: '', // Requis pour PRO uniquement
  });

  // File states (PRO only)
  const [cinFrontFile, setCinFrontFile] = useState<File | null>(null);
  const [cinBackFile, setCinBackFile] = useState<File | null>(null);

  // UI states
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validation PRO : Fichiers OBLIGATOIRES
      if (role === 'PRO') {
        if (!formData.cinNumber || formData.cinNumber.trim().length === 0) {
          setError('Le numéro CIN est obligatoire pour les professionnels');
          setLoading(false);
          return;
        }
        if (!cinFrontFile) {
          setError('La photo CIN recto est obligatoire pour les professionnels');
          setLoading(false);
          return;
        }
        if (!cinBackFile) {
          setError('La photo CIN verso est obligatoire pour les professionnels');
          setLoading(false);
          return;
        }

        // Validation taille fichiers (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (cinFrontFile.size > maxSize) {
          setError('La photo recto dépasse la limite de 5MB');
          setLoading(false);
          return;
        }
        if (cinBackFile.size > maxSize) {
          setError('La photo verso dépasse la limite de 5MB');
          setLoading(false);
          return;
        }

        // Validation type fichiers (images uniquement)
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(cinFrontFile.type)) {
          setError('La photo recto doit être une image (JPG, PNG, WebP)');
          setLoading(false);
          return;
        }
        if (!allowedTypes.includes(cinBackFile.type)) {
          setError('La photo verso doit être une image (JPG, PNG, WebP)');
          setLoading(false);
          return;
        }
      }

      // Construire le FormData (multipart/form-data)
      const formDataToSend = new FormData();
      formDataToSend.append('firstName', formData.firstName);
      formDataToSend.append('lastName', formData.lastName);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('password', formData.password);
      formDataToSend.append('role', role);
      formDataToSend.append('cityId', formData.cityId);

      // CLIENT : Ajouter addressLine
      if (role === 'CLIENT' && formData.addressLine) {
        formDataToSend.append('addressLine', formData.addressLine);
      }

      // PRO : Ajouter cinNumber et fichiers
      if (role === 'PRO') {
        formDataToSend.append('cinNumber', formData.cinNumber);
        if (cinFrontFile) {
          formDataToSend.append('cinFront', cinFrontFile);
        }
        if (cinBackFile) {
          formDataToSend.append('cinBack', cinBackFile);
        }
      }

      // Envoi avec fetch natif (le browser gère le Content-Type multipart)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        body: formDataToSend,
        // ⚠️ Ne PAS spécifier Content-Type, le browser le fait automatiquement avec boundary
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de l\'inscription');
      }

      const data: AuthResponse = await response.json();

      // Success : stocker auth et rediriger selon rôle
      setAuth(data.user, data.accessToken);

      // Redirect selon le rôle
      if (role === 'PRO') {
        router.push('/dashboard/kyc');
      } else {
        router.push('/');
      }
    } catch (err) {
      if (err instanceof Error) {
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

        {/* Champs KYC (PRO uniquement) */}
        {role === 'PRO' && (
          <>
            {/* Numéro CIN */}
            <div>
              <label
                htmlFor="cinNumber"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                Numéro de CIN <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="cinNumber"
                value={formData.cinNumber}
                onChange={(e) =>
                  setFormData({ ...formData, cinNumber: e.target.value.toUpperCase() })
                }
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50"
                placeholder="AB123456"
                required
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Format: Lettres en majuscules suivies de chiffres
              </p>
            </div>

            {/* Photo CIN Recto */}
            <div>
              <label
                htmlFor="cinFront"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                Photo CIN Recto <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                id="cinFront"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setCinFrontFile(file);
                  }
                }}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-zinc-900 file:text-zinc-50 dark:file:bg-zinc-50 dark:file:text-zinc-900 hover:file:bg-zinc-800 dark:hover:file:bg-zinc-200"
                required
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Formats acceptés : JPG, PNG, WebP (max 5MB)
              </p>
              {cinFrontFile && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  ✓ {cinFrontFile.name} ({(cinFrontFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            {/* Photo CIN Verso */}
            <div>
              <label
                htmlFor="cinBack"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                Photo CIN Verso <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                id="cinBack"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setCinBackFile(file);
                  }
                }}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-zinc-900 file:text-zinc-50 dark:file:bg-zinc-50 dark:file:text-zinc-900 hover:file:bg-zinc-800 dark:hover:file:bg-zinc-200"
                required
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Formats acceptés : JPG, PNG, WebP (max 5MB)
              </p>
              {cinBackFile && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  ✓ {cinBackFile.name} ({(cinBackFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            {/* Avertissement KYC */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Vérification d'identité (KYC)</strong> : Votre compte sera créé avec le statut "En attente de vérification". Nous vérifierons vos documents sous 24-48h.
              </p>
            </div>
          </>
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
