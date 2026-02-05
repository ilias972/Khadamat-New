'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Briefcase, Upload, ArrowLeft, Check, AlertCircle, Star, Shield, Zap } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import CitySelect from '@/components/shared/CitySelect';
import type { AuthResponse } from '@khadamat/contracts';

/**
 * Page : /auth/register
 *
 * Page d'inscription modernisée - TaskRabbit Style
 * Design chaleureux avec Orange (#F08C1B) et Beige (#F2F0EF)
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
    <div className="min-h-screen flex">
      {/* ═══════════════════════════════════════════════════════════════════
          LEFT PANEL - Orange Gradient Sidebar
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #F9B16D 0%, #F08C1B 35%, #D97213 70%, #B55812 100%)' }}>
        {/* Background Pattern - Geometric Shapes */}
        <div className="absolute inset-0">
          {/* Large decorative circles */}
          <div className="absolute -top-20 -left-20 w-80 h-80 border-[3px] border-white/10 rounded-full" />
          <div className="absolute top-1/4 -right-16 w-64 h-64 border-[3px] border-white/10 rounded-full" />
          <div className="absolute -bottom-10 left-1/4 w-48 h-48 border-[3px] border-white/10 rounded-full" />
          {/* Small accent circles */}
          <div className="absolute top-20 right-20 w-6 h-6 bg-white/20 rounded-full animate-float" />
          <div className="absolute top-1/3 left-16 w-4 h-4 bg-white/15 rounded-full animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-1/4 right-1/4 w-5 h-5 bg-white/20 rounded-full animate-float" style={{ animationDelay: '0.5s' }} />
          {/* Gradient overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/10" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="animate-fade-in">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <span className="text-white font-bold text-xl">K</span>
              </div>
              <span className="text-white text-2xl font-bold tracking-tight">Khadamat</span>
            </Link>
          </div>

          {/* Main Content - Centered */}
          <div className="flex-1 flex flex-col justify-center items-center text-center px-4">
            {/* Big Quote / Statistic */}
            <div className="mb-10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <p className="text-white text-7xl font-extrabold mb-3 drop-shadow-lg">+15,000</p>
              <p className="text-white/90 text-xl font-medium max-w-xs mx-auto leading-relaxed">
                professionnels au Maroc nous font confiance
              </p>
            </div>

            {/* Features */}
            <div className="space-y-3 text-left w-full max-w-sm">
              <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-all duration-300 animate-fade-in stagger-1">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shadow-lg">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="text-white font-semibold block">Inscription express</span>
                  <span className="text-white/70 text-sm">En moins de 2 minutes</span>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-all duration-300 animate-fade-in stagger-2">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shadow-lg">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="text-white font-semibold block">Profils vérifiés</span>
                  <span className="text-white/70 text-sm">100% sécurisés et fiables</span>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-all duration-300 animate-fade-in stagger-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shadow-lg">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="text-white font-semibold block">Support 24/7</span>
                  <span className="text-white/70 text-sm">Une équipe à votre écoute</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom - Social Proof */}
          <div className="animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <div className="flex items-center justify-center gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <div className="flex -space-x-3">
                {['A', 'M', 'S', 'K', 'Y'].map((letter, i) => (
                  <div
                    key={i}
                    className="w-11 h-11 rounded-full bg-gradient-to-br from-white/40 to-white/20 border-2 border-white/50 flex items-center justify-center text-white text-sm font-bold shadow-lg"
                    style={{ zIndex: 5 - i }}
                  >
                    {letter}
                  </div>
                ))}
              </div>
              <div className="text-white text-sm">
                <p className="font-bold">Rejoignez-les !</p>
                <p className="text-white/70 text-xs">+500 cette semaine</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          RIGHT PANEL - Beige Form Section with Floating Card
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 bg-[#F2F0EF] flex items-center justify-center p-6 lg:p-12 min-h-screen">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 lg:p-10 border border-slate-100">
          {/* Back button */}
          {step === 2 && (
            <button
              onClick={() => { setStep(1); setRole(null); }}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-6 transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour au choix du profil
            </button>
          )}

          {/* Mobile Logo */}
          <div className="lg:hidden mb-8">
            <Link href="/" className="text-[#F08C1B] text-2xl font-bold">
              Khadamat
            </Link>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              STEP 1: Role Selection Cards
              ═══════════════════════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="animate-fade-in">
              <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-2">
                Créer un compte
              </h1>
              <p className="text-slate-500 mb-8">
                Choisissez votre type de profil pour commencer
              </p>

              <div className="space-y-4">
                {/* Client Card */}
                <button
                  onClick={() => handleRoleSelect('CLIENT')}
                  className="w-full p-6 bg-slate-50 hover:bg-white rounded-2xl border-2 border-transparent hover:border-[#F08C1B] shadow-sm hover:shadow-xl transition-all duration-300 text-left group hover:-translate-y-1"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FEF3E7] to-[#FDECD4] flex items-center justify-center group-hover:from-[#FDE5CC] group-hover:to-[#FBCF9E] transition-all shadow-sm group-hover:shadow-md">
                      <User className="w-7 h-7 text-[#F08C1B]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-[#D97213] transition-colors">
                        Je suis Client
                      </h3>
                      <p className="text-slate-500 text-sm leading-relaxed">
                        Je cherche des professionnels qualifiés pour mes projets
                      </p>
                    </div>
                    <div className="w-7 h-7 rounded-full border-2 border-slate-300 group-hover:border-[#F08C1B] group-hover:bg-[#F08C1B] transition-all flex items-center justify-center group-hover:scale-110">
                      <Check className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </button>

                {/* Pro Card */}
                <button
                  onClick={() => handleRoleSelect('PRO')}
                  className="w-full p-6 bg-slate-50 hover:bg-white rounded-2xl border-2 border-transparent hover:border-[#F08C1B] shadow-sm hover:shadow-xl transition-all duration-300 text-left group hover:-translate-y-1"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FEF3E7] to-[#FDECD4] flex items-center justify-center group-hover:from-[#FDE5CC] group-hover:to-[#FBCF9E] transition-all shadow-sm group-hover:shadow-md">
                      <Briefcase className="w-7 h-7 text-[#F08C1B]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-[#D97213] transition-colors">
                        Je suis Professionnel
                      </h3>
                      <p className="text-slate-500 text-sm leading-relaxed">
                        Je propose mes services et développe ma clientèle
                      </p>
                    </div>
                    <div className="w-7 h-7 rounded-full border-2 border-slate-300 group-hover:border-[#F08C1B] group-hover:bg-[#F08C1B] transition-all flex items-center justify-center group-hover:scale-110">
                      <Check className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </button>
              </div>

              {/* Divider */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-slate-400 font-medium">ou</span>
                </div>
              </div>

              <p className="text-center text-slate-500">
                Déjà un compte ?{' '}
                <Link href="/auth/login" className="text-[#F08C1B] font-bold hover:text-[#D97213] hover:underline transition-colors">
                  Se connecter
                </Link>
              </p>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              STEP 2: Registration Form
              ═══════════════════════════════════════════════════════════════ */}
          {step === 2 && role && (
            <div className="animate-fade-in">
              {/* Role Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FEF3E7] to-[#FDECD4] rounded-full mb-4 shadow-sm">
                {role === 'PRO' ? (
                  <Briefcase className="w-4 h-4 text-[#F08C1B]" />
                ) : (
                  <User className="w-4 h-4 text-[#F08C1B]" />
                )}
                <span className="text-sm font-bold text-[#D97213]">
                  {role === 'PRO' ? 'Professionnel' : 'Client'}
                </span>
              </div>

              <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-2">
                {role === 'PRO' ? 'Rejoignez nos Pros' : 'Créez votre compte'}
              </h1>
              <p className="text-slate-500 mb-8">
                Remplissez vos informations pour commencer
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Nom / Prénom */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Prénom
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full h-12 px-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#F08C1B] focus:ring-4 focus:ring-[#F08C1B]/10 transition-all"
                      placeholder="Ahmed"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Nom
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full h-12 px-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#F08C1B] focus:ring-4 focus:ring-[#F08C1B]/10 transition-all"
                      placeholder="Bennani"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full h-12 px-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#F08C1B] focus:ring-4 focus:ring-[#F08C1B]/10 transition-all"
                    placeholder="ahmed@exemple.com"
                    required
                  />
                </div>

                {/* Téléphone */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full h-12 px-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#F08C1B] focus:ring-4 focus:ring-[#F08C1B]/10 transition-all"
                    placeholder="0612345678"
                    required
                  />
                </div>

                {/* Mot de passe */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full h-12 px-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#F08C1B] focus:ring-4 focus:ring-[#F08C1B]/10 transition-all"
                    placeholder="Min. 6 caractères"
                    required
                    minLength={6}
                  />
                </div>

                {/* Ville */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
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
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Adresse complète
                    </label>
                    <input
                      type="text"
                      value={formData.addressLine}
                      onChange={(e) => setFormData({ ...formData, addressLine: e.target.value })}
                      className="w-full h-12 px-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#F08C1B] focus:ring-4 focus:ring-[#F08C1B]/10 transition-all"
                      placeholder="12 Rue Hassan II, Apt 5"
                      required
                    />
                  </div>
                )}

                {/* PRO: KYC Section */}
                {role === 'PRO' && (
                  <>
                    {/* Section Divider */}
                    <div className="relative py-3">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-white text-slate-500 font-medium">Vérification d&apos;identité</span>
                      </div>
                    </div>

                    {/* CIN Number */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Numéro de CIN
                      </label>
                      <input
                        type="text"
                        value={formData.cinNumber}
                        onChange={(e) => setFormData({ ...formData, cinNumber: e.target.value.toUpperCase() })}
                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#F08C1B] focus:ring-4 focus:ring-[#F08C1B]/10 transition-all font-mono tracking-wider"
                        placeholder="AB123456"
                        required
                      />
                    </div>

                    {/* CIN Photos */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Recto */}
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          CIN Recto
                        </label>
                        <label className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                          cinFrontFile
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-slate-300 bg-white hover:border-[#F08C1B] hover:bg-[#FEF3E7]'
                        }`}>
                          {cinFrontFile ? (
                            <div className="text-center">
                              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-2">
                                <Check className="w-6 h-6 text-emerald-600" />
                              </div>
                              <span className="text-sm text-emerald-700 font-semibold">Fichier ajouté</span>
                              <p className="text-xs text-emerald-600 mt-1 truncate max-w-[120px]">{cinFrontFile.name}</p>
                            </div>
                          ) : (
                            <div className="text-center">
                              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                              <span className="text-sm text-slate-600 font-medium">Cliquez pour ajouter</span>
                              <p className="text-xs text-slate-400 mt-1">JPG, PNG (max 5MB)</p>
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
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          CIN Verso
                        </label>
                        <label className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                          cinBackFile
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-slate-300 bg-white hover:border-[#F08C1B] hover:bg-[#FEF3E7]'
                        }`}>
                          {cinBackFile ? (
                            <div className="text-center">
                              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-2">
                                <Check className="w-6 h-6 text-emerald-600" />
                              </div>
                              <span className="text-sm text-emerald-700 font-semibold">Fichier ajouté</span>
                              <p className="text-xs text-emerald-600 mt-1 truncate max-w-[120px]">{cinBackFile.name}</p>
                            </div>
                          ) : (
                            <div className="text-center">
                              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                              <span className="text-sm text-slate-600 font-medium">Cliquez pour ajouter</span>
                              <p className="text-xs text-slate-400 mt-1">JPG, PNG (max 5MB)</p>
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

                    {/* KYC Info Box */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                      <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-blue-900 text-sm font-semibold">Vérification sécurisée</p>
                        <p className="text-blue-700 text-sm mt-1">
                          Votre compte sera validé sous 24-48h après vérification de vos documents.
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-red-700 text-sm font-medium">{error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 px-6 bg-gradient-to-r from-[#F08C1B] to-[#D97213] text-white font-bold text-lg rounded-xl hover:from-[#D97213] hover:to-[#B55812] active:from-[#B55812] active:to-[#914616] transition-all duration-300 shadow-lg shadow-[#F08C1B]/30 hover:shadow-xl hover:shadow-[#F08C1B]/40 hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-0 active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:scale-100 disabled:hover:shadow-lg"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Création en cours...
                    </span>
                  ) : (
                    'Créer mon compte'
                  )}
                </button>
              </form>

              <p className="text-center text-slate-500 mt-6">
                Déjà un compte ?{' '}
                <Link href="/auth/login" className="text-[#F08C1B] font-semibold hover:underline">
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
