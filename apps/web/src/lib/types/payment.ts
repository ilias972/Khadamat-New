export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED';

export type PaymentPlanType = 'PREMIUM_MONTHLY' | 'PREMIUM_ANNUAL' | 'BOOST';

export interface PaymentStatusResponse {
  reference: string;
  planType: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
  paidAt: string | null;
}

export interface CheckoutResponse {
  success: boolean;
  reusedPendingOrder: boolean;
  order: {
    id: string;
    reference: string;
    planType: string;
    amount: number;
    currency: string;
    status: PaymentStatus;
  };
  message: string;
  paymentInstructions?: {
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

export interface PaymentPlan {
  planType: PaymentPlanType;
  label: string;
  description: string;
  amount: number;
  currency: string;
  durationDays: number;
}

export interface PaymentPlansResponse {
  plans: PaymentPlan[];
}

export interface PendingPaymentOrder {
  reference: string;
  planType: PaymentPlanType;
  amount: number;
  currency: string;
  createdAt?: string;
}

export interface PendingPaymentOrderResponse {
  order: PendingPaymentOrder | null;
}
