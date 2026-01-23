'use client';

import { useState } from 'react';
import { postJSON } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';

export type PlanType = 'PREMIUM_MONTHLY' | 'PREMIUM_ANNUAL' | 'BOOST';

interface PaymentMetadata {
  cityId?: string;
  categoryId?: string;
}

interface CheckoutResponse {
  actionUrl: string;
  fields: Record<string, string>;
}

export function useCmiPayment() {
  const [isLoading, setIsLoading] = useState(false);
  const { accessToken } = useAuthStore();
  const { addToast } = useToastStore();

  /**
   * Initie un paiement CMI.
   *
   * @param planType - Type de plan (PREMIUM_MONTHLY, PREMIUM_ANNUAL, BOOST)
   * @param metadata - Métadonnées optionnelles (cityId, categoryId pour BOOST)
   */
  const subscribe = async (planType: PlanType, metadata?: PaymentMetadata) => {
    if (!accessToken) {
      addToast('Vous devez être connecté pour effectuer un paiement', 'error');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Appel API pour initier le paiement
      const response = await postJSON<CheckoutResponse>(
        '/payment/checkout',
        {
          planType,
          ...metadata,
        },
        accessToken,
      );

      // 2. Créer un formulaire HTML invisible
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = response.actionUrl;
      form.style.display = 'none';

      // 3. Injecter tous les champs en tant que inputs hidden
      Object.entries(response.fields).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
      });

      // 4. Ajouter le formulaire au DOM et le soumettre
      document.body.appendChild(form);
      form.submit();

      // Note: La page sera redirigée vers CMI, donc pas besoin de cleanup
    } catch (error: any) {
      setIsLoading(false);

      // Gestion des erreurs métier (cooldown, exclusivité, etc.)
      const errorMessage =
        error.message || 'Une erreur est survenue lors de l\'initiation du paiement';

      addToast(errorMessage, 'error', 8000);
    }
  };

  return {
    subscribe,
    isLoading,
  };
}
