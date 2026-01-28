'use client';

import { useState } from 'react';
import { Loader2, CheckCircle, Copy, Phone, Mail, CreditCard } from 'lucide-react';
import { postJSON } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';

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

interface PaymentResponse {
  success: boolean;
  order: {
    id: string;
    reference: string;
    planType: string;
    amount: number;
    currency: string;
    status: string;
  };
  message: string;
  paymentInstructions: {
    reference: string;
    amount: string;
    methods: string[];
    contact: {
      phone: string;
      email: string;
    };
    note: string;
  };
}

/**
 * PaymentButton - Version MANUAL (MVP)
 *
 * Bouton de paiement qui crée une demande et affiche les instructions.
 * Le paiement réel se fait hors plateforme (virement, cash, etc.)
 */
export function PaymentButton({
  planType,
  amount,
  label = 'Souscrire',
  cityId,
  categoryId,
  className = '',
  disabled = false,
}: PaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentResponse | null>(null);
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

      // 3. Appeler l'API backend
      const response = await postJSON<PaymentResponse>(
        '/payment/checkout',
        payload,
        accessToken,
      );

      console.log('✅ Payment request created:', response.order.reference);

      // 4. Afficher le modal avec les instructions
      setPaymentData(response);
      setShowModal(true);
      addToast('Demande de paiement créée !', 'success');
    } catch (error: any) {
      const errorMessage =
        error.message || 'Une erreur est survenue lors de la création de la demande';

      console.error('❌ Payment error:', errorMessage);
      addToast(errorMessage, 'error', 8000);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('Copié dans le presse-papier !', 'success', 2000);
  };

  return (
    <>
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
            Création de la demande...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            {label} ({amount.toFixed(0)} MAD)
          </>
        )}
      </button>

      {/* Modal Instructions de Paiement */}
      {showModal && paymentData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#F08C1B] to-[#D97213] p-6 rounded-t-2xl text-white text-center">
              <CheckCircle className="w-16 h-16 mx-auto mb-3" />
              <h2 className="text-2xl font-bold">Demande enregistrée !</h2>
              <p className="text-white/90 mt-1">Référence: {paymentData.order.reference}</p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Montant */}
              <div className="text-center">
                <p className="text-sm text-slate-500">Montant à régler</p>
                <p className="text-4xl font-bold text-slate-900">
                  {paymentData.paymentInstructions.amount}
                </p>
              </div>

              {/* Référence à copier */}
              <div className="bg-slate-100 rounded-xl p-4">
                <p className="text-sm text-slate-500 mb-2">Référence à mentionner lors du paiement :</p>
                <div className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border-2 border-dashed border-[#F08C1B]">
                  <span className="font-mono font-bold text-lg">{paymentData.paymentInstructions.reference}</span>
                  <button
                    onClick={() => copyToClipboard(paymentData.paymentInstructions.reference)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Copier"
                  >
                    <Copy className="w-5 h-5 text-[#F08C1B]" />
                  </button>
                </div>
              </div>

              {/* Méthodes de paiement */}
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-3">Modes de paiement acceptés :</p>
                <ul className="space-y-2">
                  {paymentData.paymentInstructions.methods.map((method, index) => (
                    <li key={index} className="flex items-center gap-2 text-slate-600">
                      <span className="w-2 h-2 bg-[#F08C1B] rounded-full"></span>
                      {method}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Contact */}
              <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-blue-900">Contactez-nous pour le règlement :</p>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-blue-600" />
                  <a
                    href={`tel:${paymentData.paymentInstructions.contact.phone.replace(/\s/g, '')}`}
                    className="text-blue-600 hover:underline"
                  >
                    {paymentData.paymentInstructions.contact.phone}
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <a
                    href={`mailto:${paymentData.paymentInstructions.contact.email}`}
                    className="text-blue-600 hover:underline"
                  >
                    {paymentData.paymentInstructions.contact.email}
                  </a>
                </div>
              </div>

              {/* Note */}
              <p className="text-sm text-slate-500 text-center italic">
                {paymentData.paymentInstructions.note}
              </p>
            </div>

            {/* Footer */}
            <div className="p-6 pt-0">
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-3 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
