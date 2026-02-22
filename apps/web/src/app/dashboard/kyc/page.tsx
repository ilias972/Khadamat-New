'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { getJSON, postFormData, APIError } from '@/lib/api';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

/**
 * KYC Page (PRO Only)
 *
 * Page de soumission et suivi du dossier KYC pour les professionnels.
 *
 * Workflow:
 * 1. Afficher le statut actuel (NOT_SUBMITTED, PENDING, APPROVED, REJECTED)
 * 2. Formulaire de soumission (cinNumber, recto CIN, verso CIN)
 * 3. Upload des photos vers POST /kyc/upload
 * 4. Soumission du dossier vers POST /kyc/submit
 *
 * ⚠️ "use client" OBLIGATOIRE (hooks)
 */

interface KycStatus {
  kycStatus: 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  kycRejectionReason: string | null;
  hasCinNumber: boolean;
}

const MAX_KYC_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const CIN_PATTERN = /^[A-Z]{1,2}\d{4,8}$/i;

export default function KycPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  // Redirect if not PRO
  useEffect(() => {
    if (user && user.role !== 'PRO') {
      router.push('/');
    }
  }, [user, router]);

  // States
  const [kycStatus, setKycStatus] = useState<KycStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [cinNumber, setCinNumber] = useState('');
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch KYC status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const status = await getJSON<KycStatus>('/kyc/status');
        setKycStatus(status);
      } catch (err) {
        if (err instanceof APIError) {
          setError(err.message);
        } else {
          setError('Erreur lors du chargement du statut KYC');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, []);


  // Submit KYC (multipart avec resubmit si REJECTED)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const normalizedCin = cinNumber.trim().toUpperCase();
    if (!normalizedCin) {
      setError('Le numéro CIN est obligatoire.');
      return;
    }

    if (!CIN_PATTERN.test(normalizedCin)) {
      setError('Format CIN invalide. Exemple: AB123456');
      return;
    }

    // Vérifier que les fichiers sont présents
    if (!frontFile || !backFile) {
      setError('Veuillez sélectionner les deux photos de votre CIN');
      return;
    }

    if (
      frontFile.size > MAX_KYC_FILE_SIZE_BYTES ||
      backFile.size > MAX_KYC_FILE_SIZE_BYTES
    ) {
      setError('Chaque fichier doit faire 5 MB maximum.');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('cinNumber', normalizedCin);
      formData.append('cinFront', frontFile);
      formData.append('cinBack', backFile);

      const endpoint = kycStatus?.kycStatus === 'REJECTED' ? '/kyc/resubmit' : '/kyc/submit';

      await postFormData(endpoint, formData);

      setSuccess(
        kycStatus?.kycStatus === 'REJECTED'
          ? 'Dossier re-soumis avec succès ! Nous le vérifierons sous 48h.'
          : 'Dossier KYC soumis avec succès ! Nous le vérifierons sous 48h.',
      );

      // Refresh status
      const updatedStatus = await getJSON<KycStatus>('/kyc/status');
      setKycStatus(updatedStatus);

      // Reset form
      setCinNumber('');
      setFrontFile(null);
      setBackFile(null);
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message || 'Erreur lors de la soumission');
      } else {
        setError('Erreur lors de la soumission');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NOT_SUBMITTED':
        return (
          <span className="inline-flex items-center px-3 py-1 bg-surface-active text-text-label text-sm font-medium rounded-full">
            Non soumis
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-3 py-1 bg-warning-100 text-warning-800 text-sm font-medium rounded-full">
            En cours de vérification
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-3 py-1 bg-success-100 text-success-800 text-sm font-medium rounded-full">
            ✓ Approuvé
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-3 py-1 bg-error-100 text-error-800 text-sm font-medium rounded-full">
            ✗ Rejeté
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="motion-safe:animate-spin rounded-full h-12 w-12 border-b-2 border-inverse-bg"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user || user.role !== 'PRO') {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-text-primary">
            Vérification KYC
          </h1>
          <p className="text-text-secondary mt-2">
            Soumettez votre carte d'identité nationale pour vérification
          </p>
        </div>

        {/* 🚨 GROSSE ALERTE ROUGE si REJECTED */}
        {kycStatus && kycStatus.kycStatus === 'REJECTED' && (
          <div
            className="bg-error-600 text-text-inverse rounded-lg p-6 shadow-lg"
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-start gap-4">
              <span className="text-4xl">⚠️</span>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">Dossier KYC Rejeté</h2>
                <p className="text-lg mb-4">
                  Votre dossier de vérification d'identité a été rejeté. Vous devez le soumettre à nouveau pour accéder au dashboard.
                </p>
                {kycStatus.kycRejectionReason && (
                  <div className="bg-error-800 rounded-lg p-4">
                    <p className="font-semibold mb-1">Motif du rejet :</p>
                    <p className="text-base">{kycStatus.kycRejectionReason}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Statut actuel (si pas REJECTED) */}
        {kycStatus && kycStatus.kycStatus !== 'REJECTED' && (
          <div className="bg-surface rounded-lg border border-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-text-primary">
                  Statut actuel
                </h2>
              </div>
              {getStatusBadge(kycStatus.kycStatus)}
            </div>

            {/* Approved message */}
            {kycStatus.kycStatus === 'APPROVED' && (
              <div className="mt-4 bg-success-50 border border-success-200 rounded-lg p-4">
                <p className="text-sm text-success-800">
                  Votre identité a été vérifiée avec succès. Vous pouvez maintenant utiliser toutes les fonctionnalités de la plateforme.
                </p>
              </div>
            )}
          </div>
        )}

        {/* PENDING — dossier en cours de vérification */}
        {kycStatus && kycStatus.kycStatus === 'PENDING' && (
          <div className="bg-surface rounded-lg border border-border p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-warning-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-warning-600 motion-safe:animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              Dossier en cours de vérification
            </h2>
            <p className="text-text-secondary max-w-md mx-auto">
              Votre dossier KYC a bien été soumis. Notre équipe le vérifie sous 24 à 48 heures.
              Vous recevrez une notification dès que la vérification sera terminée.
            </p>
          </div>
        )}

        {/* Formulaire de soumission (NOT_SUBMITTED ou REJECTED uniquement) */}
        {kycStatus && kycStatus.kycStatus !== 'APPROVED' && kycStatus.kycStatus !== 'PENDING' && (
          <div className="bg-surface rounded-lg border border-border p-6">
            <h2 className="text-xl font-semibold text-text-primary mb-6">
              {kycStatus.kycStatus === 'REJECTED'
                ? 'Soumettre à nouveau'
                : 'Soumettre mon dossier KYC'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Numéro CIN */}
              <div>
                <label
                  htmlFor="cinNumber"
                  className="block text-sm font-medium text-text-label mb-2"
                >
                  Numéro de CIN
                </label>
                <input
                  type="text"
                  id="cinNumber"
                  value={cinNumber}
                  onChange={(e) => setCinNumber(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 bg-background border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-inverse-bg text-text-primary"
                  placeholder="AB123456"
                  pattern="[A-Za-z]{1,2}[0-9]{4,8}"
                  title="Format attendu: 1 ou 2 lettres suivies de 4 à 8 chiffres"
                  required
                />
                <p className="text-xs text-text-muted mt-1">
                  Format: Lettres en majuscules suivies de chiffres
                </p>
              </div>

              {/* Photo Recto */}
              <div>
                <label
                  htmlFor="frontFile"
                  className="block text-sm font-medium text-text-label mb-2"
                >
                  Photo CIN Recto
                </label>
                <input
                  type="file"
                  id="frontFile"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > MAX_KYC_FILE_SIZE_BYTES) {
                        setError('Le fichier CIN recto dépasse 5 MB.');
                        setFrontFile(null);
                        return;
                      }
                      setFrontFile(file);
                      setError('');
                    }
                  }}
                  className="w-full px-4 py-3 bg-background border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-inverse-bg text-text-primary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-inverse-bg file:text-inverse-text hover:file:bg-inverse-hover"
                  required
                />
                {frontFile && (
                  <p className="text-xs text-success-600 mt-1">
                    ✓ {frontFile.name} ({(frontFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              {/* Photo Verso */}
              <div>
                <label
                  htmlFor="backFile"
                  className="block text-sm font-medium text-text-label mb-2"
                >
                  Photo CIN Verso
                </label>
                <input
                  type="file"
                  id="backFile"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > MAX_KYC_FILE_SIZE_BYTES) {
                        setError('Le fichier CIN verso dépasse 5 MB.');
                        setBackFile(null);
                        return;
                      }
                      setBackFile(file);
                      setError('');
                    }
                  }}
                  className="w-full px-4 py-3 bg-background border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-inverse-bg text-text-primary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-inverse-bg file:text-inverse-text hover:file:bg-inverse-hover"
                  required
                />
                {backFile && (
                  <p className="text-xs text-success-600 mt-1">
                    ✓ {backFile.name} ({(backFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              {/* Messages */}
              {error && (
                <div
                  className="bg-error-50 border border-error-200 rounded-lg p-4"
                  role="alert"
                  aria-live="polite"
                >
                  <p className="text-error-800 text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div
                  className="bg-success-50 border border-success-200 rounded-lg p-4"
                  role="alert"
                  aria-live="polite"
                >
                  <p className="text-success-800 text-sm">{success}</p>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={submitting || !frontFile || !backFile}
                className="w-full px-6 py-3 bg-inverse-bg text-inverse-text rounded-lg hover:bg-inverse-hover transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting
                  ? 'Soumission...'
                  : kycStatus?.kycStatus === 'REJECTED'
                  ? 'Re-soumettre mon dossier'
                  : 'Soumettre mon dossier'}
              </button>
            </form>
          </div>
        )}

        {/* Info box */}
        <div className="bg-info-50 border border-info-200 rounded-lg p-4">
          <h3 className="font-semibold text-info-900 mb-2">
            Informations importantes
          </h3>
          <ul className="text-sm text-info-800 space-y-1">
            <li>• Les photos doivent être claires et lisibles</li>
            <li>• Formats acceptés : JPG, PNG, WebP (max 5MB)</li>
            <li>• Le numéro CIN doit correspondre exactement à votre carte</li>
            <li>• La vérification prend généralement 24 à 48 heures</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
