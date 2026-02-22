'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, CheckCircle, Copy, Phone, Mail, CreditCard } from 'lucide-react';
import { postJSON } from '@/lib/api';
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
  const { addToast } = useToastStore();
  const inFlightRef = useRef(false);
  const lastSubmitAtRef = useRef(0);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const copyButtonRef = useRef<HTMLButtonElement>(null);
  const cooldownTimeoutRef = useRef<number | null>(null);
  const SUBMIT_COOLDOWN_MS = 3000;

  const closeModal = useCallback(() => {
    setShowModal(false);
  }, []);

  const getModalFocusableElements = useCallback((): HTMLElement[] => {
    if (!modalRef.current) return [];
    return Array.from(
      modalRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
  }, []);

  const handleModalKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = getModalFocusableElements();
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (active === first || !modalRef.current?.contains(active)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [closeModal, getModalFocusableElements],
  );

  useEffect(() => {
    if (!showModal) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const raf = window.requestAnimationFrame(() => {
      if (copyButtonRef.current) {
        copyButtonRef.current.focus();
        return;
      }
      modalRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(raf);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [showModal]);

  useEffect(() => {
    return () => {
      if (cooldownTimeoutRef.current !== null) {
        window.clearTimeout(cooldownTimeoutRef.current);
      }
    };
  }, []);

  const handlePayment = async () => {
    if (disabled || isLoading || inFlightRef.current) {
      return;
    }

    const now = Date.now();
    if (now - lastSubmitAtRef.current < SUBMIT_COOLDOWN_MS) {
      return;
    }

    // 1. Préparer le payload
    const payload: Record<string, unknown> = { planType };

    if (planType === 'BOOST') {
      if (!cityId || !categoryId) {
        addToast('Ville et catégorie requises pour le Boost', 'error');
        return;
      }
      payload.cityId = cityId;
      payload.categoryId = categoryId;
    }

    inFlightRef.current = true;
    lastSubmitAtRef.current = now;
    setIsLoading(true);

    try {
      // 2. Appeler l'API backend
      const response = await postJSON<PaymentResponse>(
        '/payment/checkout',
        payload,
      );

      // 3. Afficher le modal avec les instructions
      setPaymentData(response);
      setShowModal(true);
      addToast('Demande de paiement créée !', 'success');
    } catch (error: any) {
      const errorMessage =
        error.message || 'Une erreur est survenue lors de la création de la demande';

      console.error('❌ Payment error:', errorMessage);
      addToast(errorMessage, 'error', 8000);
    } finally {
      const remainingCooldown = Math.max(
        0,
        SUBMIT_COOLDOWN_MS - (Date.now() - lastSubmitAtRef.current),
      );

      if (cooldownTimeoutRef.current !== null) {
        window.clearTimeout(cooldownTimeoutRef.current);
      }

      cooldownTimeoutRef.current = window.setTimeout(() => {
        inFlightRef.current = false;
        setIsLoading(false);
        cooldownTimeoutRef.current = null;
      }, remainingCooldown);
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
        aria-busy={isLoading}
        aria-live="polite"
        className={`
          px-6 py-3 rounded-lg font-medium motion-safe:transition-all
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-center gap-2
          ${className}
        `}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 motion-safe:animate-spin" aria-hidden="true" />
            <span role="status">Création de la demande...</span>
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" aria-hidden="true" />
            {label} ({amount.toFixed(0)} MAD)
          </>
        )}
      </button>

      {/* Modal Instructions de Paiement */}
      {showModal && paymentData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-modal-title"
            aria-describedby="payment-modal-desc"
            onKeyDown={handleModalKeyDown}
            tabIndex={-1}
            className="bg-surface rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto focus:outline-none"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-6 rounded-t-2xl text-text-inverse text-center">
              <CheckCircle className="w-16 h-16 mx-auto mb-3" aria-hidden="true" />
              <h2 id="payment-modal-title" className="text-2xl font-bold">Demande enregistrée !</h2>
              <p id="payment-modal-desc" className="text-text-inverse/90 mt-1">
                Référence: {paymentData.order.reference}
              </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Montant */}
              <div className="text-center">
                <p className="text-sm text-text-muted">Montant à régler</p>
                <p className="text-4xl font-bold text-text-primary">
                  {paymentData.paymentInstructions.amount}
                </p>
              </div>

              {/* Référence à copier */}
              <div className="bg-surface-active rounded-xl p-4">
                <p className="text-sm text-text-muted mb-2">Référence à mentionner lors du paiement :</p>
                <div className="flex items-center justify-between bg-surface rounded-lg px-4 py-3 border-2 border-dashed border-primary-500">
                  <span className="font-mono font-bold text-lg">{paymentData.paymentInstructions.reference}</span>
                  <button
                    ref={copyButtonRef}
                    onClick={() => copyToClipboard(paymentData.paymentInstructions.reference)}
                    className="p-2 hover:bg-surface-active rounded-lg motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    title="Copier"
                    aria-label="Copier la référence de paiement"
                  >
                    <Copy className="w-5 h-5 text-primary-500" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Méthodes de paiement */}
              <div>
                <p className="text-sm font-semibold text-text-label mb-3">Modes de paiement acceptés :</p>
                <ul className="space-y-2">
                  {paymentData.paymentInstructions.methods.map((method, index) => (
                    <li key={index} className="flex items-center gap-2 text-text-secondary">
                      <span className="w-2 h-2 bg-primary-500 rounded-full" aria-hidden="true"></span>
                      {method}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Contact */}
              <div className="bg-info-50 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-info-900">Contactez-nous pour le règlement :</p>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-info-600" aria-hidden="true" />
                  <a
                    href={`tel:${paymentData.paymentInstructions.contact.phone.replace(/\s/g, '')}`}
                    className="text-info-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info-600 rounded-sm"
                  >
                    {paymentData.paymentInstructions.contact.phone}
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-info-600" aria-hidden="true" />
                  <a
                    href={`mailto:${paymentData.paymentInstructions.contact.email}`}
                    className="text-info-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info-600 rounded-sm"
                  >
                    {paymentData.paymentInstructions.contact.email}
                  </a>
                </div>
              </div>

              {/* Note */}
              <p className="text-sm text-text-muted text-center italic">
                {paymentData.paymentInstructions.note}
              </p>
            </div>

            {/* Footer */}
            <div className="p-6 pt-0">
              <button
                onClick={closeModal}
                className="w-full py-3 bg-inverse-bg text-text-inverse font-semibold rounded-xl hover:bg-inverse-hover motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inverse-bg"
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
