'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { getJSON, postJSON, APIError } from '@/lib/api';
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

export default function KycPage() {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();

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
      if (!accessToken) return;

      try {
        const status = await getJSON<KycStatus>('/kyc/status', accessToken);
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
  }, [accessToken]);


  // Submit KYC (multipart avec resubmit si REJECTED)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Vérifier que les fichiers sont présents
    if (!frontFile || !backFile) {
      setError('Veuillez sélectionner les deux photos de votre CIN');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('cinNumber', cinNumber);
      formData.append('cinFront', frontFile);
      formData.append('cinBack', backFile);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const endpoint = kycStatus?.kycStatus === 'REJECTED' ? '/kyc/resubmit' : '/kyc/submit';

      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la soumission');
      }

      setSuccess(
        kycStatus?.kycStatus === 'REJECTED'
          ? 'Dossier re-soumis avec succès ! Nous le vérifierons sous 48h.'
          : 'Dossier KYC soumis avec succès ! Nous le vérifierons sous 48h.',
      );

      // Refresh status
      const updatedStatus = await getJSON<KycStatus>('/kyc/status', accessToken || undefined);
      setKycStatus(updatedStatus);

      // Reset form
      setCinNumber('');
      setFrontFile(null);
      setBackFile(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
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
          <span className="inline-flex items-center px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-medium rounded-full">
            Non soumis
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-sm font-medium rounded-full">
            En cours de vérification
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-sm font-medium rounded-full">
            ✓ Approuvé
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-sm font-medium rounded-full">
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 dark:border-zinc-50"></div>
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
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Vérification KYC
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            Soumettez votre carte d'identité nationale pour vérification
          </p>
        </div>

        {/* 🚨 GROSSE ALERTE ROUGE si REJECTED */}
        {kycStatus && kycStatus.kycStatus === 'REJECTED' && (
          <div className="bg-red-600 dark:bg-red-700 text-white rounded-lg p-6 shadow-lg">
            <div className="flex items-start gap-4">
              <span className="text-4xl">⚠️</span>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">Dossier KYC Rejeté</h2>
                <p className="text-lg mb-4">
                  Votre dossier de vérification d'identité a été rejeté. Vous devez le soumettre à nouveau pour accéder au dashboard.
                </p>
                {kycStatus.kycRejectionReason && (
                  <div className="bg-red-800 dark:bg-red-900 rounded-lg p-4">
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
          <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                  Statut actuel
                </h2>
              </div>
              {getStatusBadge(kycStatus.kycStatus)}
            </div>

            {/* Approved message */}
            {kycStatus.kycStatus === 'APPROVED' && (
              <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm text-green-800 dark:text-green-200">
                  Votre identité a été vérifiée avec succès. Vous pouvez maintenant utiliser toutes les fonctionnalités de la plateforme.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Formulaire de soumission (si pas APPROVED) */}
        {kycStatus && kycStatus.kycStatus !== 'APPROVED' && (
          <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-6">
              {kycStatus.kycStatus === 'REJECTED'
                ? 'Soumettre à nouveau'
                : 'Soumettre mon dossier KYC'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Numéro CIN */}
              <div>
                <label
                  htmlFor="cinNumber"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
                >
                  Numéro de CIN
                </label>
                <input
                  type="text"
                  id="cinNumber"
                  value={cinNumber}
                  onChange={(e) => setCinNumber(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50"
                  placeholder="AB123456"
                  required
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Format: Lettres en majuscules suivies de chiffres
                </p>
              </div>

              {/* Photo Recto */}
              <div>
                <label
                  htmlFor="frontFile"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
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
                      setFrontFile(file);
                    }
                  }}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-zinc-900 file:text-zinc-50 dark:file:bg-zinc-50 dark:file:text-zinc-900 hover:file:bg-zinc-800 dark:hover:file:bg-zinc-200"
                  required
                />
                {frontFile && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    ✓ {frontFile.name} ({(frontFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              {/* Photo Verso */}
              <div>
                <label
                  htmlFor="backFile"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
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
                      setBackFile(file);
                    }
                  }}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-zinc-900 file:text-zinc-50 dark:file:bg-zinc-50 dark:file:text-zinc-900 hover:file:bg-zinc-800 dark:hover:file:bg-zinc-200"
                  required
                />
                {backFile && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    ✓ {backFile.name} ({(backFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              {/* Messages */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <p className="text-green-800 dark:text-green-200 text-sm">{success}</p>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={submitting || !frontFile || !backFile}
                className="w-full px-6 py-3 bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Informations importantes
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
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
