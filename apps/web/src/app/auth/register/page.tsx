'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Briefcase, Upload, ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import CitySelect from '@/components/shared/CitySelect';
import type { AuthResponse } from '@khadamat/contracts';

/**
 * Page : /auth/register
 *
 * Page d'inscription modernisée avec Design System Khadamat
 * - Split screen (illustration + formulaire)
 * - Sélecteur de rôle avec cartes
 * - Upload KYC stylisé pour PRO
 */

type Role = 'CLIENT' | 'PRO';

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  // Step: 1 = choix du rôle, 2 = formulaire
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<Role | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    cityId: '',
    addressLine: '',
    cinNumber: '',
  });

  // Files (PRO)
  const [cinFrontFile, setCinFrontFile] = useState<File | null>(null);
  const [cinBackFile, setCinBackFile] = useState<File | null>(null);

  // UI
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRoleSelect = (selectedRole: Role) => {
    setRole(selectedRole);
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validation PRO
      if (role === 'PRO') {
        if (!formData.cinNumber.trim()) {
          setError('Le numéro CIN est obligatoire');
          setLoading(false);
          return;
        }
        if (!cinFrontFile || !cinBackFile) {
          setError('Les photos CIN recto et verso sont obligatoires');
          setLoading(false);
          return;
        }
        // Validation taille (5MB max)
        const maxSize = 5 * 1024 * 1024;
        if (cinFrontFile.size > maxSize || cinBackFile.size > maxSize) {
          setError('Les photos ne doivent pas dépasser 5MB');
          setLoading(false);
          return;
        }
      }

      // Construire FormData
      const fd = new FormData();
      fd.append('firstName', formData.firstName);
      fd.append('lastName', formData.lastName);
      fd.append('email', formData.email);
      fd.append('phone', formData.phone);
      fd.append('password', formData.password);
      fd.append('role', role!);
      fd.append('cityId', formData.cityId);

      if (role === 'CLIENT' && formData.addressLine) {
        fd.append('addressLine', formData.addressLine);
      }

      if (role === 'PRO') {
        fd.append('cinNumber', formData.cinNumber);
        if (cinFrontFile) fd.append('cinFront', cinFrontFile);
        if (cinBackFile) fd.append('cinBack', cinBackFile);
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        body: fd,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de l\'inscription');
      }

      const data: AuthResponse = await response.json();
      setAuth(data.user, data.accessToken);

      // Redirect selon rôle
      router.push(role === 'PRO' ? '/dashboard' : '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Illustration (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-500 to-primary-600 p-12 flex-col justify-between">
        <div>
          <Link href="/" className="text-white text-2xl font-bold">
            Khadamat
          </Link>
        </div>

        <div className="text-white">
          <h1 className="text-4xl font-bold mb-4">
            Rejoignez la communauté
          </h1>
          <p className="text-primary-100 text-lg">
            {role === 'PRO'
              ? 'Développez votre activité et trouvez de nouveaux clients chaque jour.'
              : 'Trouvez les meilleurs professionnels pour tous vos besoins.'}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex -space-x-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-10 h-10 rounded-full bg-white/20 border-2 border-white flex items-center justify-center text-white text-sm font-medium"
              >
                {String.fromCharCode(64 + i)}
              </div>
            ))}
          </div>
          <p className="text-primary-100 text-sm">
            +2,000 professionnels nous font confiance
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Back button */}
          {step === 2 && (
            <button
              onClick={() => { setStep(1); setRole(null); }}
              className="flex items-center gap-2 text-text-secondary hover:text-text-primary mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour au choix du profil
            </button>
          )}

          {/* Mobile Logo */}
          <div className="lg:hidden mb-8">
            <Link href="/" className="text-primary-500 text-2xl font-bold">
              Khadamat
            </Link>
          </div>

          {/* Step 1: Role Selection */}
          {step === 1 && (
            <div>
              <h1 className="text-3xl font-bold text-text-primary mb-2">
                Créer un compte
              </h1>
              <p className="text-text-secondary mb-8">
                Choisissez votre type de profil pour commencer
              </p>

              <div className="space-y-4">
                {/* Client Card */}
                <button
                  onClick={() => handleRoleSelect('CLIENT')}
                  className="w-full p-6 bg-white rounded-2xl shadow-card hover:shadow-card-hover border-2 border-transparent hover:border-primary-500 transition-all duration-200 text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-primary-50 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                      <User className="w-7 h-7 text-primary-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-text-primary mb-1">
                        Je suis Client
                      </h3>
                      <p className="text-text-secondary text-sm">
                        Je cherche des professionnels pour mes projets
                      </p>
                    </div>
                  </div>
                </button>

                {/* Pro Card */}
                <button
                  onClick={() => handleRoleSelect('PRO')}
                  className="w-full p-6 bg-white rounded-2xl shadow-card hover:shadow-card-hover border-2 border-transparent hover:border-primary-500 transition-all duration-200 text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-primary-50 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                      <Briefcase className="w-7 h-7 text-primary-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-text-primary mb-1">
                        Je suis Professionnel
                      </h3>
                      <p className="text-text-secondary text-sm">
                        Je propose mes services et cherche des clients
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              <p className="text-center text-text-secondary mt-8">
                Déjà un compte ?{' '}
                <Link href="/auth/login" className="text-primary-500 font-medium hover:underline">
                  Se connecter
                </Link>
              </p>
            </div>
          )}

          {/* Step 2: Registration Form */}
          {step === 2 && role && (
            <div>
              <h1 className="text-3xl font-bold text-text-primary mb-2">
                {role === 'PRO' ? 'Inscription Professionnel' : 'Inscription Client'}
              </h1>
              <p className="text-text-secondary mb-8">
                Remplissez vos informations pour créer votre compte
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Nom / Prénom */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Prénom
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all"
                      placeholder="Ahmed"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Nom
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all"
                      placeholder="Bennani"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all"
                    placeholder="ahmed@exemple.com"
                    required
                  />
                </div>

                {/* Téléphone */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all"
                    placeholder="0612345678"
                    required
                  />
                </div>

                {/* Mot de passe */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all"
                    placeholder="Min. 6 caractères"
                    required
                    minLength={6}
                  />
                </div>

                {/* Ville */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Ville
                  </label>
                  <CitySelect
                    value={formData.cityId}
                    onChange={(cityId) => setFormData({ ...formData, cityId })}
                    required
                  />
                </div>

                {/* CLIENT: Adresse */}
                {role === 'CLIENT' && (
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Adresse complète
                    </label>
                    <input
                      type="text"
                      value={formData.addressLine}
                      onChange={(e) => setFormData({ ...formData, addressLine: e.target.value })}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all"
                      placeholder="12 Rue Hassan II, Apt 5"
                      required
                    />
                  </div>
                )}

                {/* PRO: KYC */}
                {role === 'PRO' && (
                  <>
                    {/* CIN Number */}
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Numéro de CIN
                      </label>
                      <input
                        type="text"
                        value={formData.cinNumber}
                        onChange={(e) => setFormData({ ...formData, cinNumber: e.target.value.toUpperCase() })}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all"
                        placeholder="AB123456"
                        required
                      />
                    </div>

                    {/* CIN Photos */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Recto */}
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          CIN Recto
                        </label>
                        <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                          cinFrontFile
                            ? 'border-success-500 bg-success-50'
                            : 'border-gray-300 bg-white hover:border-primary-500 hover:bg-primary-50'
                        }`}>
                          {cinFrontFile ? (
                            <div className="text-center">
                              <Check className="w-8 h-8 text-success-500 mx-auto mb-1" />
                              <span className="text-sm text-success-600 font-medium">Fichier ajouté</span>
                            </div>
                          ) : (
                            <div className="text-center">
                              <Upload className="w-8 h-8 text-text-muted mx-auto mb-1" />
                              <span className="text-sm text-text-secondary">Cliquez pour ajouter</span>
                            </div>
                          )}
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => setCinFrontFile(e.target.files?.[0] || null)}
                            required
                          />
                        </label>
                      </div>

                      {/* Verso */}
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          CIN Verso
                        </label>
                        <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                          cinBackFile
                            ? 'border-success-500 bg-success-50'
                            : 'border-gray-300 bg-white hover:border-primary-500 hover:bg-primary-50'
                        }`}>
                          {cinBackFile ? (
                            <div className="text-center">
                              <Check className="w-8 h-8 text-success-500 mx-auto mb-1" />
                              <span className="text-sm text-success-600 font-medium">Fichier ajouté</span>
                            </div>
                          ) : (
                            <div className="text-center">
                              <Upload className="w-8 h-8 text-text-muted mx-auto mb-1" />
                              <span className="text-sm text-text-secondary">Cliquez pour ajouter</span>
                            </div>
                          )}
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => setCinBackFile(e.target.files?.[0] || null)}
                            required
                          />
                        </label>
                      </div>
                    </div>

                    {/* KYC Info */}
                    <div className="bg-info-50 border border-info-500/20 rounded-xl p-4">
                      <p className="text-info-600 text-sm">
                        <strong>Vérification d&apos;identité :</strong> Votre compte sera validé sous 24-48h après vérification de vos documents.
                      </p>
                    </div>
                  </>
                )}

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-3 bg-error-50 border border-error-500/20 rounded-xl p-4">
                    <AlertCircle className="w-5 h-5 text-error-500 flex-shrink-0 mt-0.5" />
                    <p className="text-error-600 text-sm">{error}</p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-4 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 active:bg-primary-700 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? 'Création du compte...' : 'Créer mon compte'}
                </button>
              </form>

              <p className="text-center text-text-secondary mt-6">
                Déjà un compte ?{' '}
                <Link href="/auth/login" className="text-primary-500 font-medium hover:underline">
                  Se connecter
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
