'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { postJSON } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';
import { submitCmiForm } from '@/lib/cmi/submit-helper';

export type PlanType = 'PREMIUM_MONTHLY' | 'PREMIUM_ANNUAL' | 'BOOST';

interface PaymentButtonProps {
  planType: PlanType;
  amount: number;
  label?: string;
  cityId?: string;
  categoryId?: string;
  className?: string;
  disabled?: boolean;
}

interface CheckoutResponse {
  actionUrl: string;
  fields: Record<string, string>;
}

/**
 * PaymentButton
 *
 * Bouton de paiement qui initie une transaction CMI.
 * Authentifié (JWT), appelle l'API backend, puis redirige vers CMI.
 */
export function PaymentButton({
  planType,
  amount,
  label = 'Payer',
  cityId,
  categoryId,
  className = '',
  disabled = false,
}: PaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { accessToken } = useAuthStore();
  const { addToast } = useToastStore();

  const handlePayment = async () => {
    // 1. Vérifier l'authentification
    if (!accessToken) {
      addToast('Vous devez être connecté pour effectuer un paiement', 'error');
      return;
    }

    setIsLoading(true);

    try {
      // 2. Préparer le payload
      const payload: Record<string, unknown> = { planType };

      if (planType === 'BOOST') {
        if (!cityId || !categoryId) {
          addToast('Ville et catégorie requises pour le Boost', 'error');
          setIsLoading(false);
          return;
        }
        payload.cityId = cityId;
        payload.categoryId = categoryId;
      }

      // 3. Appeler l'API backend (AUTHENTIFIÉ avec Bearer token)
      const response = await postJSON<CheckoutResponse>(
        '/payment/checkout',
        payload,
        accessToken,
      );

      console.log('✅ Checkout response:', {
        actionUrl: response.actionUrl,
        fieldsCount: Object.keys(response.fields).length,
      });

      // 4. Soumettre le formulaire CMI (déclenche la redirection navigateur)
      submitCmiForm(response.actionUrl, response.fields);

      // Note: La page sera redirigée vers CMI, donc pas besoin de setIsLoading(false)
    } catch (error: any) {
      setIsLoading(false);

      // Gestion des erreurs métier (cooldown, exclusivité, etc.)
      const errorMessage =
        error.message || 'Une erreur est survenue lors de l\'initiation du paiement';

      console.error('❌ Payment error:', errorMessage);
      addToast(errorMessage, 'error', 8000);
    }
  };

  return (
    <button
      type="button"
      onClick={handlePayment}
      disabled={disabled || isLoading}
      className={`
        px-6 py-3 rounded-lg font-medium transition-all
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center justify-center gap-2
        ${className}
      `}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          Redirection vers CMI...
        </>
      ) : (
        <>
          {label} ({amount.toFixed(2)} MAD)
        </>
      )}
    </button>
  );
}
