'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Clock, FileText, LogOut, User } from 'lucide-react';

/**
 * KycPendingState - Hard Gate UX
 *
 * Affiche une "Waiting Room" pour les PROs dont le KYC est en cours de validation.
 * L'utilisateur ne peut pas accéder au dashboard tant que son dossier n'est pas approuvé.
 *
 * Design : TaskRabbit-inspired avec couleurs Orange (#F08C1B)
 */

export default function KycPendingState() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleModifyProfile = () => {
    router.push('/dashboard/profile');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Card principale */}
        <div className="bg-surface rounded-2xl shadow-soft p-8 text-center">
          {/* Icône Hourglass animée */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center">
                <Clock className="w-12 h-12 text-primary-500 animate-pulse" />
              </div>
              {/* Badge notification */}
              <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-warning-500 flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          {/* Titre */}
          <h1 className="text-2xl font-bold text-text-primary mb-3">
            Dossier en cours de validation
          </h1>

          {/* Message personnalisé */}
          <p className="text-text-secondary mb-2">
            Merci{user?.firstName ? ` ${user.firstName}` : ''} !
          </p>
          <p className="text-text-secondary mb-6">
            Votre profil Pro est en cours d'examen par notre équipe.
            <br />
            Vous recevrez une notification dès que votre dossier sera validé.
          </p>

          {/* Barre de progression stylisée */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-muted">Progression</span>
              <span className="text-sm font-medium text-primary-600">En attente</span>
            </div>
            <div className="h-2 bg-primary-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-400 to-primary-500 rounded-full animate-pulse"
                style={{ width: '60%' }}
              />
            </div>
          </div>

          {/* Étapes du processus */}
          <div className="space-y-3 mb-8 text-left">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-success-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm text-text-secondary">Inscription complétée</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-success-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm text-text-secondary">Documents envoyés</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center animate-pulse">
                <Clock className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-medium text-primary-600">Vérification en cours...</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-xs text-gray-400">4</span>
              </div>
              <span className="text-sm text-text-muted">Compte activé</span>
            </div>
          </div>

          {/* Info délai */}
          <div className="bg-info-50 border border-info-500/20 rounded-xl p-4 mb-6">
            <p className="text-sm text-info-600">
              ⏱️ Le délai de vérification est généralement de <strong>24 à 48 heures</strong> ouvrées.
            </p>
          </div>

          {/* Boutons d'action */}
          <div className="space-y-3">
            <button
              onClick={handleModifyProfile}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors font-medium shadow-card hover:shadow-card-hover"
            >
              <User className="w-5 h-5" />
              Modifier mon profil
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 text-text-secondary rounded-xl hover:bg-surface-hover transition-colors font-medium"
            >
              <LogOut className="w-5 h-5" />
              Se déconnecter
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-text-muted text-sm mt-6">
          Une question ? Contactez-nous à{' '}
          <a href="mailto:support@khadamat.ma" className="text-primary-500 hover:underline">
            support@khadamat.ma
          </a>
        </p>
      </div>
    </div>
  );
}
