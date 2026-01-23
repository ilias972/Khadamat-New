export const PAYMENT_PLANS = {
  PREMIUM_MONTHLY: {
    key: 'PREMIUM_MONTHLY',
    priceMad: 350.0,
    durationDays: 30,
  },
  PREMIUM_ANNUAL: {
    key: 'PREMIUM_ANNUAL',
    priceMad: 3000.0,
    durationDays: 365,
  },
  BOOST: {
    key: 'BOOST',
    priceMad: 200.0,
    durationDays: 7,
  },
} as const;

export type PlanType = keyof typeof PAYMENT_PLANS;

export const BOOST_COOLDOWN_DAYS = 21; // 7j actif + 14j repos
export const BOOST_ACTIVE_DAYS = 7;

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
} as const;
