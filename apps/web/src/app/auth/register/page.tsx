'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { User, Briefcase, Upload, ArrowLeft, Check, AlertCircle, Shield, Zap, Users, MessageCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import CitySelect from '@/components/shared/CitySelect';
import type { AuthResponse } from '@khadamat/contracts';

type Role = 'CLIENT' | 'PRO';

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterPageInner />
    </Suspense>
  );
}

function RegisterPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();

  // Step: 1 = choix du rôle, 2 = formulaire
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<Role | null>(null);

  // Auto-select role from URL (?role=PRO)
  useEffect(() => {
    const urlRole = searchParams.get('role')?.toUpperCase();
    if (urlRole === 'PRO' || urlRole === 'CLIENT') {
      setRole(urlRole);
      setStep(2);
    }
  }, [searchParams]);

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

  const [confirmPassword, setConfirmPassword] = useState('');

  // UI
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [cinNumberError, setCinNumberError] = useState('');
  const [cinFrontError, setCinFrontError] = useState('');
  const [cinBackError, setCinBackError] = useState('');
  const errorRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const cinInputRef = useRef<HTMLInputElement>(null);

  // ── Error mapping ──
  const mapBackendError = (msg: string): string => {
    const lower = msg.toLowerCase();
    // Conflict / duplicate detection
    if (lower.includes('conflict') || lower.includes('conflit') || lower.includes('données en conflit')) {
      if (lower.includes('email')) return 'Cette adresse e-mail est déjà utilisée';
      if (lower.includes('phone') || lower.includes('téléphone')) return 'Ce numéro de téléphone est déjà utilisé';
      if (lower.includes('cin')) return 'Ce numéro de CIN est déjà utilisé';
      return 'Un compte avec ces informations existe déjà (e-mail, téléphone ou CIN)';
    }
    if (lower.includes('email') && (lower.includes('exist') || lower.includes('déjà') || lower.includes('unique') || lower.includes('duplicate')))
      return 'Cette adresse e-mail est déjà utilisée';
    if (lower.includes('phone') && (lower.includes('exist') || lower.includes('déjà') || lower.includes('unique') || lower.includes('téléphone') || lower.includes('duplicate')))
      return 'Ce numéro de téléphone est déjà utilisé';
    if (lower.includes('cin') && (lower.includes('exist') || lower.includes('déjà') || lower.includes('unique') || lower.includes('duplicate')))
      return 'Ce numéro de CIN est déjà utilisé';
    if (lower.includes('mot de passe') || lower.includes('password'))
      return 'Le mot de passe ne respecte pas les critères requis';
    if (lower.includes('fichier') || lower.includes('file') || lower.includes('image'))
      return 'Un ou plusieurs fichiers sont invalides (JPG, PNG, WebP, max 5 Mo)';
    if (lower.includes('téléphone') || lower.includes('phone'))
      return 'Le numéro de téléphone est invalide';
    return msg || 'Une erreur est survenue lors de l\'inscription';
  };

  // ── Validation helpers ──
  const PHONE_REGEX = /^(\+212|0)[5-7]\d{8}$/;
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const CIN_REGEX = /^[A-Za-z]{1,2}\d{5,6}$/;
  const ALLOWED_CIN_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_CIN_SIZE = 5 * 1024 * 1024;

  const validatePassword = (pwd: string): string[] => {
    const errs: string[] = [];
    if (pwd.length < 10) errs.push('Minimum 10 caractères');
    if (!/[a-z]/.test(pwd)) errs.push('Au moins 1 minuscule');
    if (!/[A-Z]/.test(pwd)) errs.push('Au moins 1 majuscule');
    if (!/[0-9]/.test(pwd)) errs.push('Au moins 1 chiffre');
    return errs;
  };

  const handlePasswordChange = (pwd: string) => {
    setFormData({ ...formData, password: pwd });
    setPasswordErrors(pwd ? validatePassword(pwd) : []);
  };

  const handleEmailChange = (email: string) => {
    setFormData({ ...formData, email });
    if (email && !EMAIL_REGEX.test(email)) {
      setEmailError('Adresse e-mail invalide');
    } else {
      setEmailError('');
    }
  };

  const handlePhoneChange = (phone: string) => {
    setFormData({ ...formData, phone });
    if (phone && !PHONE_REGEX.test(phone)) {
      setPhoneError('Format : 06XXXXXXXX ou +212XXXXXXXXX');
    } else {
      setPhoneError('');
    }
  };

  const handleCinNumberChange = (cin: string) => {
    const upper = cin.toUpperCase();
    setFormData({ ...formData, cinNumber: upper });
    if (upper && !CIN_REGEX.test(upper)) {
      setCinNumberError('Format invalide (ex : BJ453975)');
    } else {
      setCinNumberError('');
    }
  };

  const handleCinFile = (
    file: File | undefined,
    setter: (f: File | null) => void,
    setErr: (msg: string) => void,
  ) => {
    if (!file) { setter(null); return; }
    if (!ALLOWED_CIN_TYPES.includes(file.type)) {
      setErr('Format accepté : JPG, PNG ou WebP');
      setter(null);
      return;
    }
    if (file.size > MAX_CIN_SIZE) {
      setErr('Le fichier ne doit pas dépasser 5 Mo');
      setter(null);
      return;
    }
    setErr('');
    setter(file);
  };

  const handleRoleSelect = (selectedRole: Role) => {
    setRole(selectedRole);
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validation e-mail
      if (!EMAIL_REGEX.test(formData.email)) {
        setEmailError('Adresse e-mail invalide');
        setError('L\'adresse e-mail est invalide');
        setLoading(false);
        requestAnimationFrame(() => emailInputRef.current?.focus());
        return;
      }

      // Validation téléphone
      if (!PHONE_REGEX.test(formData.phone)) {
        setPhoneError('Format : 06XXXXXXXX ou +212XXXXXXXXX');
        setError('Le numéro de téléphone est invalide');
        setLoading(false);
        requestAnimationFrame(() => phoneInputRef.current?.focus());
        return;
      }

      // Validation mot de passe
      const pwdErrs = validatePassword(formData.password);
      if (pwdErrs.length > 0) {
        setPasswordErrors(pwdErrs);
        setError('Le mot de passe ne respecte pas les critères requis');
        setLoading(false);
        requestAnimationFrame(() => passwordInputRef.current?.focus());
        return;
      }

      // Confirmation mot de passe
      if (formData.password !== confirmPassword) {
        setError('Les mots de passe ne correspondent pas');
        setLoading(false);
        return;
      }

      // Validation PRO
      if (role === 'PRO') {
        if (!formData.cinNumber.trim() || !CIN_REGEX.test(formData.cinNumber)) {
          setCinNumberError('Format invalide (ex : BJ453975)');
          setError('Le numéro de CIN est invalide');
          setLoading(false);
          requestAnimationFrame(() => cinInputRef.current?.focus());
          return;
        }
        if (!cinFrontFile) {
          setCinFrontError('La photo recto est obligatoire');
          setError('Les photos CIN recto et verso sont obligatoires');
          setLoading(false);
          return;
        }
        if (!cinBackFile) {
          setCinBackError('La photo verso est obligatoire');
          setError('Les photos CIN recto et verso sont obligatoires');
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
        credentials: 'include',
        headers: { 'X-CSRF-PROTECTION': '1' },
        body: fd,
      });

      if (!response.ok) {
        const errorData = await response.json();
        const raw = Array.isArray(errorData.message)
          ? errorData.message[0]
          : errorData.message || '';
        throw new Error(mapBackendError(raw));
      }

      const data: AuthResponse = await response.json();
      setAuth(data.user);

      // Redirect selon rôle
      router.push(role === 'PRO' ? '/dashboard/kyc' : '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ═══════════════════════════════════════════════════════════════════
          LEFT PANEL - Orange Gradient Sidebar
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, var(--color-primary-300) 0%, var(--color-primary-500) 35%, var(--color-primary-600) 70%, var(--color-primary-700) 100%)' }}>
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
            {/* Tagline */}
            <div className="mb-10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <p className="text-white text-4xl sm:text-5xl font-extrabold mb-3 drop-shadow-lg leading-tight">
                Trouvez le bon pro,<br />près de chez vous
              </p>
              <p className="text-white/90 text-lg font-medium max-w-xs mx-auto leading-relaxed">
                La plateforme de services à domicile au Maroc
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
                  <span className="text-white/70 text-sm">Vérification d&apos;identité rigoureuse</span>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-all duration-300 animate-fade-in stagger-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shadow-lg">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="text-white font-semibold block">Support 7j/7</span>
                  <span className="text-white/70 text-sm">Une équipe à votre écoute</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom - Social Proof */}
          <div className="animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <div className="flex items-center justify-center gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="text-white text-sm">
                <p className="font-bold">Inscription gratuite</p>
                <p className="text-white/70 text-xs">Créez votre compte en quelques minutes</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          RIGHT PANEL - Beige Form Section with Floating Card
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 bg-background flex items-center justify-center p-6 lg:p-12 min-h-screen">
        <div className="w-full max-w-md bg-surface rounded-3xl shadow-xl p-8 lg:p-10 border border-border">
          {/* Back button */}
          {step === 2 && (
            <button
              onClick={() => { setStep(1); setRole(null); }}
              className="flex items-center gap-2 text-text-muted hover:text-text-primary mb-6 transition-colors font-medium"
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

          {/* ═══════════════════════════════════════════════════════════════
              STEP 1: Role Selection Cards
              ═══════════════════════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="animate-fade-in">
              <h1 className="text-3xl lg:text-4xl font-bold text-text-primary mb-2">
                Créer un compte
              </h1>
              <p className="text-text-muted mb-8">
                Choisissez votre type de profil pour commencer
              </p>

              <div className="space-y-4">
                {/* Client Card */}
                <button
                  onClick={() => handleRoleSelect('CLIENT')}
                  className="w-full p-6 bg-input-bg hover:bg-surface rounded-2xl border-2 border-transparent hover:border-primary-500 shadow-sm hover:shadow-xl motion-safe:transition-all motion-safe:duration-300 text-left group motion-safe:hover:-translate-y-1"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center group-hover:from-primary-100 group-hover:to-primary-200 transition-all shadow-sm group-hover:shadow-md">
                      <User className="w-7 h-7 text-primary-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-text-primary mb-1 group-hover:text-primary-600 transition-colors">
                        Je suis Client
                      </h3>
                      <p className="text-text-muted text-sm leading-relaxed">
                        Je cherche des professionnels qualifiés pour mes projets
                      </p>
                    </div>
                    <div className="w-7 h-7 rounded-full border-2 border-border-strong group-hover:border-primary-500 group-hover:bg-primary-500 transition-all flex items-center justify-center group-hover:scale-110">
                      <Check className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </button>

                {/* Pro Card */}
                <button
                  onClick={() => handleRoleSelect('PRO')}
                  className="w-full p-6 bg-input-bg hover:bg-surface rounded-2xl border-2 border-transparent hover:border-primary-500 shadow-sm hover:shadow-xl motion-safe:transition-all motion-safe:duration-300 text-left group motion-safe:hover:-translate-y-1"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center group-hover:from-primary-100 group-hover:to-primary-200 transition-all shadow-sm group-hover:shadow-md">
                      <Briefcase className="w-7 h-7 text-primary-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-text-primary mb-1 group-hover:text-primary-600 transition-colors">
                        Je suis Professionnel
                      </h3>
                      <p className="text-text-muted text-sm leading-relaxed">
                        Je propose mes services et développe ma clientèle
                      </p>
                    </div>
                    <div className="w-7 h-7 rounded-full border-2 border-border-strong group-hover:border-primary-500 group-hover:bg-primary-500 transition-all flex items-center justify-center group-hover:scale-110">
                      <Check className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </button>
              </div>

              {/* Divider */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-surface text-text-muted font-medium">ou</span>
                </div>
              </div>

              <p className="text-center text-text-muted">
                Déjà un compte ?{' '}
                <Link href="/auth/login" className="text-primary-500 font-bold hover:text-primary-600 hover:underline transition-colors">
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
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-50 to-primary-100 rounded-full mb-4 shadow-sm">
                {role === 'PRO' ? (
                  <Briefcase className="w-4 h-4 text-primary-500" />
                ) : (
                  <User className="w-4 h-4 text-primary-500" />
                )}
                <span className="text-sm font-bold text-primary-600">
                  {role === 'PRO' ? 'Professionnel' : 'Client'}
                </span>
              </div>

              <h1 className="text-3xl lg:text-4xl font-bold text-text-primary mb-2">
                {role === 'PRO' ? 'Rejoignez nos Pros' : 'Créez votre compte'}
              </h1>
              <p className="text-text-muted mb-8">
                Remplissez vos informations pour commencer
              </p>

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                {/* Nom / Prénom */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="reg-firstName" className="block text-sm font-semibold text-text-label mb-2">
                      Prénom <span className="text-error-500">*</span>
                    </label>
                    <input
                      id="reg-firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full h-12 px-4 bg-input-bg border-2 border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:bg-surface focus:border-border-focus focus:ring-4 focus:ring-primary-500/10 transition-all"
                      placeholder="Ahmed"
                      required
                      autoComplete="given-name"
                    />
                  </div>
                  <div>
                    <label htmlFor="reg-lastName" className="block text-sm font-semibold text-text-label mb-2">
                      Nom <span className="text-error-500">*</span>
                    </label>
                    <input
                      id="reg-lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full h-12 px-4 bg-input-bg border-2 border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:bg-surface focus:border-border-focus focus:ring-4 focus:ring-primary-500/10 transition-all"
                      placeholder="Bennani"
                      required
                      autoComplete="family-name"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="reg-email" className="block text-sm font-semibold text-text-label mb-2">
                    Email <span className="text-error-500">*</span>
                  </label>
                  <input
                    ref={emailInputRef}
                    id="reg-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    aria-describedby={emailError ? 'reg-email-error' : undefined}
                    aria-invalid={!!emailError || undefined}
                    className={`w-full h-12 px-4 bg-input-bg border-2 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:bg-surface focus:border-border-focus focus:ring-4 focus:ring-primary-500/10 transition-all ${
                      emailError ? 'border-error-300' : 'border-border'
                    }`}
                    placeholder="ahmed@exemple.com"
                    required
                    autoComplete="email"
                  />
                  {emailError && (
                    <p id="reg-email-error" className="mt-1.5 text-xs text-error-600" role="alert">{emailError}</p>
                  )}
                </div>

                {/* Téléphone */}
                <div>
                  <label htmlFor="reg-phone" className="block text-sm font-semibold text-text-label mb-2">
                    Téléphone <span className="text-error-500">*</span>
                  </label>
                  <input
                    ref={phoneInputRef}
                    id="reg-phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    aria-describedby={phoneError ? 'reg-phone-error' : undefined}
                    aria-invalid={!!phoneError || undefined}
                    className={`w-full h-12 px-4 bg-input-bg border-2 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:bg-surface focus:border-border-focus focus:ring-4 focus:ring-primary-500/10 transition-all ${
                      phoneError ? 'border-error-300' : 'border-border'
                    }`}
                    placeholder="0612345678"
                    required
                    autoComplete="tel"
                  />
                  {phoneError && (
                    <p id="reg-phone-error" className="mt-1.5 text-xs text-error-600" role="alert">{phoneError}</p>
                  )}
                </div>

                {/* Mot de passe */}
                <div>
                  <label htmlFor="reg-password" className="block text-sm font-semibold text-text-label mb-2">
                    Mot de passe <span className="text-error-500">*</span>
                  </label>
                  <input
                    ref={passwordInputRef}
                    id="reg-password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    aria-describedby="reg-password-rules"
                    aria-invalid={passwordErrors.length > 0 || undefined}
                    className={`w-full h-12 px-4 bg-input-bg border-2 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:bg-surface focus:border-border-focus focus:ring-4 focus:ring-primary-500/10 motion-safe:transition-all ${
                      passwordErrors.length > 0 ? 'border-error-300' : 'border-border'
                    }`}
                    placeholder="Min. 10 caractères, 1 maj, 1 min, 1 chiffre"
                    required
                    minLength={10}
                    autoComplete="new-password"
                  />
                  {formData.password && (
                    <ul id="reg-password-rules" className="mt-2 space-y-1" aria-label="Critères du mot de passe">
                      {[
                        { ok: formData.password.length >= 10, label: 'Minimum 10 caractères' },
                        { ok: /[a-z]/.test(formData.password), label: 'Au moins 1 minuscule' },
                        { ok: /[A-Z]/.test(formData.password), label: 'Au moins 1 majuscule' },
                        { ok: /[0-9]/.test(formData.password), label: 'Au moins 1 chiffre' },
                      ].map((rule) => (
                        <li key={rule.label} className={`flex items-center gap-1.5 text-xs ${rule.ok ? 'text-success-600' : 'text-text-muted'}`}>
                          {rule.ok ? (
                            <Check className="w-3 h-3" aria-hidden="true" />
                          ) : (
                            <span className="w-3 h-3 rounded-full border border-border-strong inline-block" aria-hidden="true" />
                          )}
                          {rule.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Confirmer mot de passe */}
                <div>
                  <label htmlFor="reg-confirmPassword" className="block text-sm font-semibold text-text-label mb-2">
                    Confirmer le mot de passe <span className="text-error-500">*</span>
                  </label>
                  <input
                    id="reg-confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    aria-describedby={confirmPassword && formData.password !== confirmPassword ? 'reg-confirm-error' : undefined}
                    aria-invalid={!!(confirmPassword && formData.password !== confirmPassword)}
                    className={`w-full h-12 px-4 bg-input-bg border-2 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:bg-surface focus:border-border-focus focus:ring-4 focus:ring-primary-500/10 transition-all ${
                      confirmPassword && formData.password !== confirmPassword ? 'border-error-300' : 'border-border'
                    }`}
                    placeholder="Retapez votre mot de passe"
                    required
                    autoComplete="new-password"
                  />
                  {confirmPassword && formData.password !== confirmPassword && (
                    <p id="reg-confirm-error" className="mt-1.5 text-xs text-error-600" role="alert">
                      Les mots de passe ne correspondent pas
                    </p>
                  )}
                </div>

                {/* Ville */}
                <div>
                  <label htmlFor="reg-city" className="block text-sm font-semibold text-text-label mb-2">
                    Ville <span className="text-error-500">*</span>
                  </label>
                  <CitySelect
                    id="reg-city"
                    value={formData.cityId}
                    onChange={(cityId) => setFormData({ ...formData, cityId })}
                    required
                  />
                </div>

                {/* CLIENT: Adresse */}
                {role === 'CLIENT' && (
                  <div>
                    <label htmlFor="reg-address" className="block text-sm font-semibold text-text-label mb-2">
                      Adresse complète <span className="text-error-500">*</span>
                    </label>
                    <input
                      id="reg-address"
                      type="text"
                      value={formData.addressLine}
                      onChange={(e) => setFormData({ ...formData, addressLine: e.target.value })}
                      className="w-full h-12 px-4 bg-input-bg border-2 border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:bg-surface focus:border-border-focus focus:ring-4 focus:ring-primary-500/10 transition-all"
                      placeholder="12 Rue Hassan II, Apt 5"
                      required
                      autoComplete="street-address"
                    />
                  </div>
                )}

                {/* PRO: KYC Section */}
                {role === 'PRO' && (
                  <>
                    {/* Section Divider */}
                    <div className="relative py-3">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-surface text-text-muted font-medium">Vérification d&apos;identité</span>
                      </div>
                    </div>

                    {/* CIN Number */}
                    <div>
                      <label htmlFor="reg-cin" className="block text-sm font-semibold text-text-label mb-2">
                        Numéro de CIN <span className="text-error-500">*</span>
                      </label>
                      <input
                        ref={cinInputRef}
                        id="reg-cin"
                        type="text"
                        value={formData.cinNumber}
                        onChange={(e) => handleCinNumberChange(e.target.value)}
                        aria-describedby={cinNumberError ? 'reg-cin-error' : undefined}
                        aria-invalid={!!cinNumberError || undefined}
                        className={`w-full h-12 px-4 bg-input-bg border-2 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:bg-surface focus:border-border-focus focus:ring-4 focus:ring-primary-500/10 transition-all font-mono tracking-wider ${
                          cinNumberError ? 'border-error-300' : 'border-border'
                        }`}
                        placeholder="BJ453975"
                        required
                      />
                      {cinNumberError && (
                        <p id="reg-cin-error" className="mt-1.5 text-xs text-error-600" role="alert">{cinNumberError}</p>
                      )}
                    </div>

                    {/* CIN Photos */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Recto */}
                      <div>
                        <span className="block text-sm font-semibold text-text-label mb-2">
                          CIN Recto <span className="text-error-500">*</span>
                        </span>
                        <label className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                          cinFrontFile
                            ? 'border-success-500 bg-success-50'
                            : cinFrontError
                              ? 'border-error-300 bg-error-50'
                              : 'border-border-strong bg-surface hover:border-primary-500 hover:bg-primary-50'
                        }`}>
                          {cinFrontFile ? (
                            <div className="text-center">
                              <div className="w-12 h-12 rounded-full bg-success-100 flex items-center justify-center mx-auto mb-2">
                                <Check className="w-6 h-6 text-success-600" />
                              </div>
                              <span className="text-sm text-success-700 font-semibold">Fichier ajouté</span>
                              <p className="text-xs text-success-600 mt-1 truncate max-w-[120px]">{cinFrontFile.name}</p>
                            </div>
                          ) : (
                            <div className="text-center">
                              <Upload className="w-8 h-8 text-text-muted mx-auto mb-2" />
                              <span className="text-sm text-text-secondary font-medium">Cliquez pour ajouter</span>
                              <p className="text-xs text-text-muted mt-1">JPG, PNG, WebP (max 5 Mo)</p>
                            </div>
                          )}
                          <input
                            type="file"
                            className="hidden"
                            accept=".jpg,.jpeg,.png,.webp"
                            aria-label="Photo CIN recto"
                            onChange={(e) => handleCinFile(e.target.files?.[0], setCinFrontFile, setCinFrontError)}
                            required
                          />
                        </label>
                        {cinFrontError && (
                          <p className="mt-1.5 text-xs text-error-600 flex items-center gap-1" role="alert">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                            {cinFrontError}
                          </p>
                        )}
                      </div>

                      {/* Verso */}
                      <div>
                        <span className="block text-sm font-semibold text-text-label mb-2">
                          CIN Verso <span className="text-error-500">*</span>
                        </span>
                        <label className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                          cinBackFile
                            ? 'border-success-500 bg-success-50'
                            : cinBackError
                              ? 'border-error-300 bg-error-50'
                              : 'border-border-strong bg-surface hover:border-primary-500 hover:bg-primary-50'
                        }`}>
                          {cinBackFile ? (
                            <div className="text-center">
                              <div className="w-12 h-12 rounded-full bg-success-100 flex items-center justify-center mx-auto mb-2">
                                <Check className="w-6 h-6 text-success-600" />
                              </div>
                              <span className="text-sm text-success-700 font-semibold">Fichier ajouté</span>
                              <p className="text-xs text-success-600 mt-1 truncate max-w-[120px]">{cinBackFile.name}</p>
                            </div>
                          ) : (
                            <div className="text-center">
                              <Upload className="w-8 h-8 text-text-muted mx-auto mb-2" />
                              <span className="text-sm text-text-secondary font-medium">Cliquez pour ajouter</span>
                              <p className="text-xs text-text-muted mt-1">JPG, PNG, WebP (max 5 Mo)</p>
                            </div>
                          )}
                          <input
                            type="file"
                            className="hidden"
                            accept=".jpg,.jpeg,.png,.webp"
                            aria-label="Photo CIN verso"
                            onChange={(e) => handleCinFile(e.target.files?.[0], setCinBackFile, setCinBackError)}
                            required
                          />
                        </label>
                        {cinBackError && (
                          <p className="mt-1.5 text-xs text-error-600 flex items-center gap-1" role="alert">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                            {cinBackError}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* KYC Info Box */}
                    <div className="bg-info-50 border border-info-200 rounded-xl p-4 flex items-start gap-3">
                      <Shield className="w-5 h-5 text-info-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-info-900 text-sm font-semibold">Vérification sécurisée</p>
                        <p className="text-info-700 text-sm mt-1">
                          Votre compte sera validé sous 24-48h après vérification de vos documents.
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* Error */}
                <div aria-live="assertive" aria-atomic="true">
                  {error && (
                    <div
                      ref={errorRef}
                      tabIndex={-1}
                      className="flex items-start gap-3 bg-error-50 border border-error-200 rounded-xl p-4 outline-none"
                      role="alert"
                    >
                      <AlertCircle className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <p className="text-error-700 text-sm font-medium">{error}</p>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 px-6 bg-gradient-to-r from-primary-500 to-primary-600 text-inverse-text font-bold text-lg rounded-xl hover:from-primary-600 hover:to-primary-700 active:from-primary-700 active:to-primary-800 motion-safe:transition-all motion-safe:duration-300 shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 motion-safe:hover:-translate-y-0.5 motion-safe:hover:scale-[1.02] active:translate-y-0 active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:scale-100 disabled:hover:shadow-lg"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="motion-safe:animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
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

              <p className="text-center text-text-muted mt-6">
                Déjà un compte ?{' '}
                <Link href="/auth/login" className="text-primary-500 font-semibold hover:underline">
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
