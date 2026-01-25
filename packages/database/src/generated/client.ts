/**
 * Manually generated Prisma Client type definitions.
 * Provides TypeScript types for the database schema when Prisma binaries
 * cannot be downloaded (e.g., in restricted network environments).
 */

// ============================================================================
// ENUMS
// ============================================================================

export const Role = {
  CLIENT: 'CLIENT',
  PRO: 'PRO',
  ADMIN: 'ADMIN',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const UserStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  BANNED: 'BANNED',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const KycStatus = {
  NOT_SUBMITTED: 'NOT_SUBMITTED',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;
export type KycStatus = (typeof KycStatus)[keyof typeof KycStatus];

export const BookingStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  DECLINED: 'DECLINED',
  CANCELLED_BY_CLIENT: 'CANCELLED_BY_CLIENT',
  CANCELLED_BY_CLIENT_LATE: 'CANCELLED_BY_CLIENT_LATE',
  CANCELLED_BY_PRO: 'CANCELLED_BY_PRO',
  CANCELLED_AUTO_FIRST_CONFIRMED: 'CANCELLED_AUTO_FIRST_CONFIRMED',
  CANCELLED_AUTO_OVERLAP: 'CANCELLED_AUTO_OVERLAP',
  EXPIRED: 'EXPIRED',
  WAITING_FOR_CLIENT: 'WAITING_FOR_CLIENT',
  COMPLETED: 'COMPLETED',
} as const;
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const BookingEventType = {
  CREATED: 'CREATED',
  CONFIRMED: 'CONFIRMED',
  DECLINED: 'DECLINED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
  SLOTS_RELEASED: 'SLOTS_RELEASED',
} as const;
export type BookingEventType = (typeof BookingEventType)[keyof typeof BookingEventType];

export const PenaltyType = {
  CLIENT_CANCEL_LATE: 'CLIENT_CANCEL_LATE',
  PRO_CANCEL_CONFIRMED: 'PRO_CANCEL_CONFIRMED',
} as const;
export type PenaltyType = (typeof PenaltyType)[keyof typeof PenaltyType];

export const SubscriptionPlan = {
  PREMIUM_MONTHLY_NO_COMMIT: 'PREMIUM_MONTHLY_NO_COMMIT',
  PREMIUM_ANNUAL_COMMIT: 'PREMIUM_ANNUAL_COMMIT',
} as const;
export type SubscriptionPlan = (typeof SubscriptionPlan)[keyof typeof SubscriptionPlan];

export const SubscriptionStatus = {
  ACTIVE: 'ACTIVE',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
} as const;
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const BoostStatus = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
} as const;
export type BoostStatus = (typeof BoostStatus)[keyof typeof BoostStatus];

export const EstimatedDuration = {
  H1: 'H1',
  H2: 'H2',
  H3: 'H3',
  H4: 'H4',
  H8: 'H8',
} as const;
export type EstimatedDuration = (typeof EstimatedDuration)[keyof typeof EstimatedDuration];

export const ReportStatus = {
  OPEN: 'OPEN',
  IN_REVIEW: 'IN_REVIEW',
  RESOLVED: 'RESOLVED',
  REJECTED: 'REJECTED',
} as const;
export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];

export const Platform = {
  IOS: 'IOS',
  ANDROID: 'ANDROID',
  WEB: 'WEB',
} as const;
export type Platform = (typeof Platform)[keyof typeof Platform];

// ============================================================================
// FILTER TYPES (Prisma-compatible)
// ============================================================================

export type StringFilter = string | {
  equals?: string;
  in?: string[];
  notIn?: string[];
  lt?: string;
  lte?: string;
  gt?: string;
  gte?: string;
  contains?: string;
  startsWith?: string;
  endsWith?: string;
  not?: string | StringFilter;
  mode?: 'default' | 'insensitive';
};

export type StringNullableFilter = string | null | {
  equals?: string | null;
  in?: (string | null)[];
  notIn?: (string | null)[];
  lt?: string;
  lte?: string;
  gt?: string;
  gte?: string;
  contains?: string;
  startsWith?: string;
  endsWith?: string;
  not?: string | null | StringNullableFilter;
  mode?: 'default' | 'insensitive';
};

export type IntFilter = number | {
  equals?: number;
  in?: number[];
  notIn?: number[];
  lt?: number;
  lte?: number;
  gt?: number;
  gte?: number;
  not?: number | IntFilter;
};

export type IntNullableFilter = number | null | {
  equals?: number | null;
  in?: (number | null)[];
  notIn?: (number | null)[];
  lt?: number;
  lte?: number;
  gt?: number;
  gte?: number;
  not?: number | null | IntNullableFilter;
};

export type BoolFilter = boolean | {
  equals?: boolean;
  not?: boolean | BoolFilter;
};

export type DateTimeFilter = Date | string | {
  equals?: Date | string;
  in?: (Date | string)[];
  notIn?: (Date | string)[];
  lt?: Date | string;
  lte?: Date | string;
  gt?: Date | string;
  gte?: Date | string;
  not?: Date | string | DateTimeFilter;
};

export type DateTimeNullableFilter = Date | string | null | {
  equals?: Date | string | null;
  in?: (Date | string | null)[];
  notIn?: (Date | string | null)[];
  lt?: Date | string;
  lte?: Date | string;
  gt?: Date | string;
  gte?: Date | string;
  not?: Date | string | null | DateTimeNullableFilter;
};

export type EnumFilter<T> = T | {
  equals?: T;
  in?: T[];
  notIn?: T[];
  not?: T | EnumFilter<T>;
};

// ============================================================================
// MODEL TYPES (with relations)
// ============================================================================

export interface City {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  // Relations
  users?: User[];
  proProfiles?: ProProfile[];
  bookings?: Booking[];
  boosts?: ProBoost[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  // Relations
  proServices?: ProService[];
  bookings?: Booking[];
  boosts?: ProBoost[];
}

export interface User {
  id: string;
  role: Role;
  status: UserStatus;
  phone: string;
  email: string | null;
  password: string;
  firstName: string;
  lastName: string;
  cityId: string | null;
  addressLine: string | null;
  clientLateCancelCount30d: number;
  clientSanctionTier: number;
  bookingCooldownUntil: Date | null;
  clientPenaltyResetAt: Date | null;
  bannedAt: Date | null;
  banReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  city?: City | null;
  proProfile?: ProProfile | null;
  bookingsAsClient?: Booking[];
  deviceTokens?: DeviceToken[];
  penaltyLogs?: PenaltyLog[];
  reportsAsClient?: Report[];
  reviewsAsClient?: Review[];
}

export interface ProProfile {
  userId: string;
  cityId: string;
  whatsapp: string;
  cinNumber: string | null;
  kycStatus: KycStatus;
  kycCinFrontUrl: string | null;
  kycCinBackUrl: string | null;
  kycSelfieUrl: string | null;
  kycRejectionReason: string | null;
  isPremium: boolean;
  premiumActiveUntil: Date | null;
  boostActiveUntil: Date | null;
  proCancelCount30d: number;
  proConsecutiveCancelCount: number;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  user?: User;
  city?: City;
  services?: ProService[];
  bookings?: Booking[];
  weeklyAvailability?: WeeklyAvailability[];
  availabilityExceptions?: AvailabilityException[];
  slotLocks?: SlotLock[];
  subscriptions?: ProSubscription[];
  boosts?: ProBoost[];
  reportsAsPro?: Report[];
  reviewsAsPro?: Review[];
}

export interface ProService {
  id: string;
  proUserId: string;
  categoryId: string;
  isActive: boolean;
  pricingType: string | null;
  minPriceMad: number | null;
  maxPriceMad: number | null;
  fixedPriceMad: number | null;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  pro?: ProProfile;
  category?: Category;
}

export interface Booking {
  id: string;
  status: BookingStatus;
  timeSlot: Date;
  cityId: string;
  categoryId: string;
  clientId: string;
  proId: string;
  expiresAt: Date;
  cancelledAt: Date | null;
  completedAt: Date | null;
  confirmedAt: Date | null;
  estimatedDuration: EstimatedDuration | null;
  duration: number;
  isModifiedByPro: boolean;
  cancelReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  client?: User;
  pro?: ProProfile;
  city?: City;
  category?: Category;
  slotLock?: SlotLock | null;
  events?: BookingEvent[];
  reports?: Report[];
  review?: Review | null;
  availabilityExceptions?: AvailabilityException[];
  penaltyLogs?: PenaltyLog[];
}

export interface BookingEvent {
  id: string;
  bookingId: string;
  type: BookingEventType;
  actorUserId: string | null;
  actorRole: Role | null;
  metadata: any;
  createdAt: Date;
  // Relations
  booking?: Booking;
}

export interface SlotLock {
  id: string;
  proUserId: string;
  bookingId: string;
  timeSlot: Date;
  createdAt: Date;
  // Relations
  pro?: ProProfile;
  booking?: Booking;
}

export interface WeeklyAvailability {
  id: string;
  proUserId: string;
  dayOfWeek: number;
  startMin: number;
  endMin: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  pro?: ProProfile;
}

export interface AvailabilityException {
  id: string;
  proUserId: string;
  startAt: Date;
  endAt: Date;
  reason: string;
  bookingId: string | null;
  createdAt: Date;
  // Relations
  pro?: ProProfile;
  booking?: Booking | null;
}

export interface PenaltyLog {
  id: string;
  userId: string;
  type: PenaltyType;
  bookingId: string | null;
  createdAt: Date;
  // Relations
  user?: User;
  booking?: Booking | null;
}

export interface Report {
  id: string;
  bookingId: string;
  clientId: string;
  proId: string;
  title: string;
  details: string;
  isWithinDisputeWindow: boolean;
  status: ReportStatus;
  attachments: any;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  booking?: Booking;
  client?: User;
  pro?: ProProfile;
}

export interface Review {
  id: string;
  bookingId: string;
  clientId: string;
  proId: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  // Relations
  booking?: Booking;
  client?: User;
  pro?: ProProfile;
}

export interface DeviceToken {
  id: string;
  userId: string;
  platform: Platform;
  token: string;
  revokedAt: Date | null;
  createdAt: Date;
  // Relations
  user?: User;
}

export interface ProSubscription {
  id: string;
  proUserId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  commitmentStartsAt: Date | null;
  commitmentEndsAt: Date | null;
  priceMad: number;
  introDiscountMad: number | null;
  startedAt: Date;
  endedAt: Date | null;
  transactionId: string | null;
  // Relations
  pro?: ProProfile;
}

export interface ProBoost {
  id: string;
  proUserId: string;
  cityId: string;
  categoryId: string;
  status: BoostStatus;
  startsAt: Date;
  endsAt: Date;
  stripePaymentIntentId: string | null;
  priceMad: number;
  createdAt: Date;
  // Relations
  pro?: ProProfile;
  city?: City;
  category?: Category;
}

export interface PaymentOrder {
  id: string;
  oid: string;
  proUserId: string;
  planType: string;
  amountCents: number;
  status: string;
  procReturnCode: string | null;
  response: string | null;
  transId: string | null;
  cityId: string | null;
  categoryId: string | null;
  createdAt: Date;
  paidAt: Date | null;
  rawCallback: any;
}

// ============================================================================
// PRISMA NAMESPACE
// ============================================================================

export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
export interface JsonObject { [key: string]: JsonValue }
export type JsonArray = JsonValue[];

export type InputJsonValue = string | number | boolean | null | InputJsonObject | InputJsonArray;
export interface InputJsonObject { [key: string]: InputJsonValue }
export type InputJsonArray = InputJsonValue[];

export namespace Prisma {
  export type TransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

  export interface PrismaPromise<T> extends Promise<T> {
    [Symbol.toStringTag]: 'PrismaPromise';
  }

  // Re-export filter types
  export type StringFilter = import('./client').StringFilter;
  export type IntFilter = import('./client').IntFilter;
  export type BoolFilter = import('./client').BoolFilter;
  export type DateTimeFilter = import('./client').DateTimeFilter;
}

// ============================================================================
// WHERE INPUT TYPES
// ============================================================================

export type CityWhereInput = {
  AND?: CityWhereInput | CityWhereInput[];
  OR?: CityWhereInput[];
  NOT?: CityWhereInput | CityWhereInput[];
  id?: StringFilter;
  name?: StringFilter;
  slug?: StringFilter;
  createdAt?: DateTimeFilter;
};

export type CityWhereUniqueInput = { id?: string } | { name?: string } | { slug?: string };

export type CategoryWhereInput = {
  AND?: CategoryWhereInput | CategoryWhereInput[];
  OR?: CategoryWhereInput[];
  NOT?: CategoryWhereInput | CategoryWhereInput[];
  id?: StringFilter;
  name?: StringFilter;
  slug?: StringFilter;
  createdAt?: DateTimeFilter;
};

export type CategoryWhereUniqueInput = { id?: string } | { name?: string } | { slug?: string };

export type UserWhereInput = {
  AND?: UserWhereInput | UserWhereInput[];
  OR?: UserWhereInput[];
  NOT?: UserWhereInput | UserWhereInput[];
  id?: StringFilter;
  role?: EnumFilter<Role>;
  status?: EnumFilter<UserStatus>;
  phone?: StringFilter;
  email?: StringNullableFilter;
  firstName?: StringFilter;
  lastName?: StringFilter;
  cityId?: StringNullableFilter;
  createdAt?: DateTimeFilter;
  updatedAt?: DateTimeFilter;
};

export type UserWhereUniqueInput = { id?: string; phone?: string; role?: Role; status?: UserStatus };

export type ProProfileWhereInput = {
  AND?: ProProfileWhereInput | ProProfileWhereInput[];
  OR?: ProProfileWhereInput[];
  NOT?: ProProfileWhereInput | ProProfileWhereInput[];
  userId?: StringFilter;
  cityId?: StringFilter;
  cinNumber?: StringNullableFilter;
  kycStatus?: EnumFilter<KycStatus>;
  isPremium?: BoolFilter;
  createdAt?: DateTimeFilter;
  updatedAt?: DateTimeFilter;
};

export type ProProfileWhereUniqueInput = { userId?: string } | { cinNumber?: string };

export type ProServiceWhereInput = {
  AND?: ProServiceWhereInput | ProServiceWhereInput[];
  OR?: ProServiceWhereInput[];
  NOT?: ProServiceWhereInput | ProServiceWhereInput[];
  id?: StringFilter;
  proUserId?: StringFilter;
  categoryId?: StringFilter;
  isActive?: BoolFilter;
  createdAt?: DateTimeFilter;
  updatedAt?: DateTimeFilter;
};

export type ProServiceWhereUniqueInput = { id?: string } | { proUserId_categoryId?: { proUserId: string; categoryId: string } };

export type BookingWhereInput = {
  AND?: BookingWhereInput | BookingWhereInput[];
  OR?: BookingWhereInput[];
  NOT?: BookingWhereInput | BookingWhereInput[];
  id?: StringFilter;
  status?: EnumFilter<BookingStatus>;
  timeSlot?: DateTimeFilter;
  cityId?: StringFilter;
  categoryId?: StringFilter;
  clientId?: StringFilter;
  proId?: StringFilter;
  expiresAt?: DateTimeFilter;
  cancelledAt?: DateTimeNullableFilter;
  completedAt?: DateTimeNullableFilter;
  confirmedAt?: DateTimeNullableFilter;
  estimatedDuration?: EnumFilter<EstimatedDuration> | null;
  duration?: IntFilter;
  isModifiedByPro?: BoolFilter;
  createdAt?: DateTimeFilter;
  updatedAt?: DateTimeFilter;
};

export type BookingWhereUniqueInput = { id?: string };

export type BookingEventWhereInput = {
  AND?: BookingEventWhereInput | BookingEventWhereInput[];
  OR?: BookingEventWhereInput[];
  NOT?: BookingEventWhereInput | BookingEventWhereInput[];
  id?: StringFilter;
  bookingId?: StringFilter;
  type?: EnumFilter<BookingEventType>;
  actorUserId?: StringNullableFilter;
  createdAt?: DateTimeFilter;
};

export type BookingEventWhereUniqueInput = { id?: string };

export type SlotLockWhereInput = {
  AND?: SlotLockWhereInput | SlotLockWhereInput[];
  OR?: SlotLockWhereInput[];
  NOT?: SlotLockWhereInput | SlotLockWhereInput[];
  id?: StringFilter;
  proUserId?: StringFilter;
  bookingId?: StringFilter;
  timeSlot?: DateTimeFilter;
  createdAt?: DateTimeFilter;
};

export type SlotLockWhereUniqueInput = { id?: string } | { bookingId?: string } | { proUserId_timeSlot?: { proUserId: string; timeSlot: Date } };

export type WeeklyAvailabilityWhereInput = {
  AND?: WeeklyAvailabilityWhereInput | WeeklyAvailabilityWhereInput[];
  OR?: WeeklyAvailabilityWhereInput[];
  NOT?: WeeklyAvailabilityWhereInput | WeeklyAvailabilityWhereInput[];
  id?: StringFilter;
  proUserId?: StringFilter;
  dayOfWeek?: IntFilter;
  startMin?: IntFilter;
  endMin?: IntFilter;
  isActive?: BoolFilter;
  createdAt?: DateTimeFilter;
  updatedAt?: DateTimeFilter;
};

export type WeeklyAvailabilityWhereUniqueInput = { id?: string } | { proUserId_dayOfWeek?: { proUserId: string; dayOfWeek: number } };

export type AvailabilityExceptionWhereInput = {
  AND?: AvailabilityExceptionWhereInput | AvailabilityExceptionWhereInput[];
  OR?: AvailabilityExceptionWhereInput[];
  NOT?: AvailabilityExceptionWhereInput | AvailabilityExceptionWhereInput[];
  id?: StringFilter;
  proUserId?: StringFilter;
  startAt?: DateTimeFilter;
  endAt?: DateTimeFilter;
  reason?: StringFilter;
  bookingId?: StringNullableFilter;
  createdAt?: DateTimeFilter;
};

export type AvailabilityExceptionWhereUniqueInput = { id?: string };

export type PenaltyLogWhereInput = {
  AND?: PenaltyLogWhereInput | PenaltyLogWhereInput[];
  OR?: PenaltyLogWhereInput[];
  NOT?: PenaltyLogWhereInput | PenaltyLogWhereInput[];
  id?: StringFilter;
  userId?: StringFilter;
  type?: EnumFilter<PenaltyType>;
  bookingId?: StringNullableFilter;
  createdAt?: DateTimeFilter;
};

export type PenaltyLogWhereUniqueInput = { id?: string };

export type ReportWhereInput = {
  AND?: ReportWhereInput | ReportWhereInput[];
  OR?: ReportWhereInput[];
  NOT?: ReportWhereInput | ReportWhereInput[];
  id?: StringFilter;
  bookingId?: StringFilter;
  clientId?: StringFilter;
  proId?: StringFilter;
  title?: StringFilter;
  details?: StringFilter;
  isWithinDisputeWindow?: BoolFilter;
  status?: EnumFilter<ReportStatus>;
  createdAt?: DateTimeFilter;
  updatedAt?: DateTimeFilter;
};

export type ReportWhereUniqueInput = { id?: string };

export type ReviewWhereInput = {
  AND?: ReviewWhereInput | ReviewWhereInput[];
  OR?: ReviewWhereInput[];
  NOT?: ReviewWhereInput | ReviewWhereInput[];
  id?: StringFilter;
  bookingId?: StringFilter;
  clientId?: StringFilter;
  proId?: StringFilter;
  rating?: IntFilter;
  comment?: StringNullableFilter;
  createdAt?: DateTimeFilter;
};

export type ReviewWhereUniqueInput = { id?: string } | { bookingId?: string };

export type DeviceTokenWhereInput = {
  AND?: DeviceTokenWhereInput | DeviceTokenWhereInput[];
  OR?: DeviceTokenWhereInput[];
  NOT?: DeviceTokenWhereInput | DeviceTokenWhereInput[];
  id?: StringFilter;
  userId?: StringFilter;
  platform?: EnumFilter<Platform>;
  token?: StringFilter;
  revokedAt?: DateTimeNullableFilter;
  createdAt?: DateTimeFilter;
};

export type DeviceTokenWhereUniqueInput = { id?: string } | { platform_token?: { platform: Platform; token: string } };

export type ProSubscriptionWhereInput = {
  AND?: ProSubscriptionWhereInput | ProSubscriptionWhereInput[];
  OR?: ProSubscriptionWhereInput[];
  NOT?: ProSubscriptionWhereInput | ProSubscriptionWhereInput[];
  id?: StringFilter;
  proUserId?: StringFilter;
  plan?: EnumFilter<SubscriptionPlan>;
  status?: EnumFilter<SubscriptionStatus>;
  priceMad?: IntFilter;
  startedAt?: DateTimeFilter;
  endedAt?: DateTimeNullableFilter;
};

export type ProSubscriptionWhereUniqueInput = { id?: string };

export type ProBoostWhereInput = {
  AND?: ProBoostWhereInput | ProBoostWhereInput[];
  OR?: ProBoostWhereInput[];
  NOT?: ProBoostWhereInput | ProBoostWhereInput[];
  id?: StringFilter;
  proUserId?: StringFilter;
  cityId?: StringFilter;
  categoryId?: StringFilter;
  status?: EnumFilter<BoostStatus>;
  startsAt?: DateTimeFilter;
  endsAt?: DateTimeFilter;
  createdAt?: DateTimeFilter;
};

export type ProBoostWhereUniqueInput = { id?: string };

export type PaymentOrderWhereInput = {
  AND?: PaymentOrderWhereInput | PaymentOrderWhereInput[];
  OR?: PaymentOrderWhereInput[];
  NOT?: PaymentOrderWhereInput | PaymentOrderWhereInput[];
  id?: StringFilter;
  oid?: StringFilter;
  proUserId?: StringFilter;
  planType?: StringFilter;
  amountCents?: IntFilter;
  status?: StringFilter;
  createdAt?: DateTimeFilter;
  paidAt?: DateTimeNullableFilter;
};

export type PaymentOrderWhereUniqueInput = { id?: string } | { oid?: string };

// ============================================================================
// CREATE/UPDATE INPUT TYPES (all optional except required fields)
// ============================================================================

export type CityCreateInput = {
  id?: string;
  name: string;
  slug: string;
  createdAt?: Date;
};

export type CityUpdateInput = Partial<CityCreateInput>;

export type CategoryCreateInput = {
  id?: string;
  name: string;
  slug: string;
  createdAt?: Date;
};

export type CategoryUpdateInput = Partial<CategoryCreateInput>;

export type UserCreateInput = {
  id?: string;
  role: Role;
  status?: UserStatus;
  phone: string;
  email?: string | null;
  password: string;
  firstName: string;
  lastName: string;
  cityId?: string | null;
  addressLine?: string | null;
  clientLateCancelCount30d?: number;
  clientSanctionTier?: number;
  bookingCooldownUntil?: Date | null;
  clientPenaltyResetAt?: Date | null;
  bannedAt?: Date | null;
  banReason?: string | null;
  proProfile?: { create?: ProProfileCreateInput };
};

export type UserUpdateInput = Partial<Omit<UserCreateInput, 'id'>>;

export type ProProfileCreateInput = {
  userId: string;
  cityId: string;
  whatsapp: string;
  cinNumber?: string | null;
  kycStatus?: KycStatus;
  kycCinFrontUrl?: string | null;
  kycCinBackUrl?: string | null;
  kycSelfieUrl?: string | null;
  kycRejectionReason?: string | null;
  isPremium?: boolean;
  premiumActiveUntil?: Date | null;
  boostActiveUntil?: Date | null;
  proCancelCount30d?: number;
  proConsecutiveCancelCount?: number;
  user?: { connect?: { id: string } };
  city?: { connect?: { id: string } };
};

export type ProProfileUpdateInput = Partial<Omit<ProProfileCreateInput, 'userId'>>;

export type ProServiceCreateInput = {
  id?: string;
  proUserId: string;
  categoryId: string;
  isActive?: boolean;
  pricingType?: string | null;
  minPriceMad?: number | null;
  maxPriceMad?: number | null;
  fixedPriceMad?: number | null;
  pro?: { connect?: { userId: string } };
  category?: { connect?: { id: string } };
};

export type ProServiceUpdateInput = Partial<Omit<ProServiceCreateInput, 'id'>>;

export type BookingCreateInput = {
  id?: string;
  status: BookingStatus;
  timeSlot: Date;
  cityId: string;
  categoryId: string;
  clientId: string;
  proId: string;
  expiresAt: Date;
  cancelledAt?: Date | null;
  completedAt?: Date | null;
  confirmedAt?: Date | null;
  estimatedDuration?: EstimatedDuration | null;
  duration?: number;
  isModifiedByPro?: boolean;
  cancelReason?: string | null;
  client?: { connect?: { id: string } };
  pro?: { connect?: { userId: string } };
  city?: { connect?: { id: string } };
  category?: { connect?: { id: string } };
};

export type BookingUpdateInput = Partial<Omit<BookingCreateInput, 'id'>>;

export type BookingEventCreateInput = {
  id?: string;
  bookingId: string;
  type: BookingEventType;
  actorUserId?: string | null;
  actorRole?: Role | null;
  metadata?: any;
  booking?: { connect?: { id: string } };
};

export type BookingEventUpdateInput = Partial<Omit<BookingEventCreateInput, 'id'>>;

export type SlotLockCreateInput = {
  id?: string;
  proUserId: string;
  bookingId: string;
  timeSlot: Date;
  pro?: { connect?: { userId: string } };
  booking?: { connect?: { id: string } };
};

export type SlotLockUpdateInput = Partial<Omit<SlotLockCreateInput, 'id'>>;

export type WeeklyAvailabilityCreateInput = {
  id?: string;
  proUserId: string;
  dayOfWeek: number;
  startMin: number;
  endMin: number;
  isActive?: boolean;
  pro?: { connect?: { userId: string } };
};

export type WeeklyAvailabilityUpdateInput = Partial<Omit<WeeklyAvailabilityCreateInput, 'id'>>;

export type AvailabilityExceptionCreateInput = {
  id?: string;
  proUserId: string;
  startAt: Date;
  endAt: Date;
  reason: string;
  bookingId?: string | null;
  pro?: { connect?: { userId: string } };
  booking?: { connect?: { id: string } };
};

export type AvailabilityExceptionUpdateInput = Partial<Omit<AvailabilityExceptionCreateInput, 'id'>>;

export type PenaltyLogCreateInput = {
  id?: string;
  userId: string;
  type: PenaltyType;
  bookingId?: string | null;
  user?: { connect?: { id: string } };
  booking?: { connect?: { id: string } };
};

export type PenaltyLogUpdateInput = Partial<Omit<PenaltyLogCreateInput, 'id'>>;

export type ReportCreateInput = {
  id?: string;
  bookingId: string;
  clientId: string;
  proId: string;
  title: string;
  details: string;
  isWithinDisputeWindow?: boolean;
  status?: ReportStatus;
  attachments?: any;
  booking?: { connect?: { id: string } };
  client?: { connect?: { id: string } };
  pro?: { connect?: { userId: string } };
};

export type ReportUpdateInput = Partial<Omit<ReportCreateInput, 'id'>>;

export type ReviewCreateInput = {
  id?: string;
  bookingId: string;
  clientId: string;
  proId: string;
  rating: number;
  comment?: string | null;
  booking?: { connect?: { id: string } };
  client?: { connect?: { id: string } };
  pro?: { connect?: { userId: string } };
};

export type ReviewUpdateInput = Partial<Omit<ReviewCreateInput, 'id'>>;

export type DeviceTokenCreateInput = {
  id?: string;
  userId: string;
  platform: Platform;
  token: string;
  revokedAt?: Date | null;
  user?: { connect?: { id: string } };
};

export type DeviceTokenUpdateInput = Partial<Omit<DeviceTokenCreateInput, 'id'>>;

export type ProSubscriptionCreateInput = {
  id?: string;
  proUserId?: string;
  plan: SubscriptionPlan;
  status?: SubscriptionStatus;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  commitmentStartsAt?: Date | null;
  commitmentEndsAt?: Date | null;
  priceMad: number;
  introDiscountMad?: number | null;
  startedAt?: Date;
  endedAt?: Date | null;
  endDate?: Date;
  transactionId?: string | null;
  pro?: { connect?: { userId: string } };
};

export type ProSubscriptionUpdateInput = Partial<Omit<ProSubscriptionCreateInput, 'id'>>;

export type ProBoostCreateInput = {
  id?: string;
  proUserId?: string;
  cityId?: string;
  categoryId?: string;
  status?: BoostStatus;
  startsAt: Date;
  endsAt: Date;
  stripePaymentIntentId?: string | null;
  priceMad?: number;
  pro?: { connect?: { userId: string } };
  city?: { connect?: { id: string } };
  category?: { connect?: { id: string } };
};

export type ProBoostUpdateInput = Partial<Omit<ProBoostCreateInput, 'id'>>;

export type PaymentOrderCreateInput = {
  id?: string;
  oid: string;
  proUserId: string;
  planType: string;
  amountCents: number;
  status: string;
  procReturnCode?: string | null;
  response?: string | null;
  transId?: string | null;
  cityId?: string | null;
  categoryId?: string | null;
  paidAt?: Date | null;
  rawCallback?: any;
};

export type PaymentOrderUpdateInput = Partial<Omit<PaymentOrderCreateInput, 'id'>>;

// ============================================================================
// ORDER BY TYPES
// ============================================================================

type SortOrder = 'asc' | 'desc';

export type CityOrderByInput = { [K in keyof City]?: SortOrder };
export type CategoryOrderByInput = { [K in keyof Category]?: SortOrder };
export type UserOrderByInput = { [K in keyof User]?: SortOrder };
export type ProProfileOrderByInput = { [K in keyof ProProfile]?: SortOrder };
export type ProServiceOrderByInput = { [K in keyof ProService]?: SortOrder };
export type BookingOrderByInput = { [K in keyof Booking]?: SortOrder };
export type BookingEventOrderByInput = { [K in keyof BookingEvent]?: SortOrder };
export type SlotLockOrderByInput = { [K in keyof SlotLock]?: SortOrder };
export type WeeklyAvailabilityOrderByInput = { [K in keyof WeeklyAvailability]?: SortOrder };
export type AvailabilityExceptionOrderByInput = { [K in keyof AvailabilityException]?: SortOrder };
export type PenaltyLogOrderByInput = { [K in keyof PenaltyLog]?: SortOrder };
export type ReportOrderByInput = { [K in keyof Report]?: SortOrder };
export type ReviewOrderByInput = { [K in keyof Review]?: SortOrder };
export type DeviceTokenOrderByInput = { [K in keyof DeviceToken]?: SortOrder };
export type ProSubscriptionOrderByInput = { [K in keyof ProSubscription]?: SortOrder };
export type ProBoostOrderByInput = { [K in keyof ProBoost]?: SortOrder };
export type PaymentOrderOrderByInput = { [K in keyof PaymentOrder]?: SortOrder };

// ============================================================================
// MODEL DELEGATE INTERFACE
// ============================================================================

interface ModelDelegate<T, CreateInput, UpdateInput, WhereInput, WhereUniqueInput, OrderByInput> {
  findUnique(args: { where: WhereUniqueInput; include?: any; select?: any }): Promise<T | null>;
  findUniqueOrThrow(args: { where: WhereUniqueInput; include?: any; select?: any }): Promise<T>;
  findFirst(args?: { where?: WhereInput; include?: any; select?: any; orderBy?: OrderByInput | OrderByInput[]; skip?: number; take?: number }): Promise<T | null>;
  findFirstOrThrow(args?: { where?: WhereInput; include?: any; select?: any; orderBy?: OrderByInput | OrderByInput[] }): Promise<T>;
  findMany(args?: { where?: WhereInput; include?: any; select?: any; orderBy?: OrderByInput | OrderByInput[]; skip?: number; take?: number; cursor?: WhereUniqueInput }): Promise<T[]>;
  create(args: { data: CreateInput; include?: any; select?: any }): Promise<T>;
  createMany(args: { data: CreateInput | CreateInput[]; skipDuplicates?: boolean }): Promise<{ count: number }>;
  update(args: { where: WhereUniqueInput; data: UpdateInput; include?: any; select?: any }): Promise<T>;
  updateMany(args: { where?: WhereInput; data: UpdateInput }): Promise<{ count: number }>;
  upsert(args: { where: WhereUniqueInput; create: CreateInput; update: UpdateInput; include?: any; select?: any }): Promise<T>;
  delete(args: { where: WhereUniqueInput; include?: any; select?: any }): Promise<T>;
  deleteMany(args?: { where?: WhereInput }): Promise<{ count: number }>;
  count(args?: { where?: WhereInput; cursor?: WhereUniqueInput; take?: number; skip?: number }): Promise<number>;
  aggregate(args: any): Promise<any>;
  groupBy(args: any): Promise<any>;
}

// ============================================================================
// PRISMA CLIENT
// ============================================================================

export class PrismaClient {
  constructor(options?: any) {}

  $connect(): Promise<void> {
    return Promise.resolve();
  }

  $disconnect(): Promise<void> {
    return Promise.resolve();
  }

  $on(event: string, listener: (...args: any[]) => void): void {}

  $use(middleware: any): void {}

  $extends(extension: any): any {
    return this;
  }

  $transaction<T>(
    fn: (prisma: Prisma.TransactionClient) => Promise<T>,
    options?: { maxWait?: number; timeout?: number; isolationLevel?: string }
  ): Promise<T>;
  $transaction<T extends any[]>(
    args: [...T],
    options?: { isolationLevel?: string }
  ): Promise<T>;
  $transaction(arg: any, options?: any): Promise<any> {
    if (typeof arg === 'function') {
      return arg(this as any);
    }
    return Promise.all(arg);
  }

  $queryRaw<T = any>(query: TemplateStringsArray, ...values: any[]): Promise<T> {
    return Promise.resolve([] as any);
  }

  $executeRaw(query: TemplateStringsArray, ...values: any[]): Promise<number> {
    return Promise.resolve(0);
  }

  $queryRawUnsafe<T = any>(query: string, ...values: any[]): Promise<T> {
    return Promise.resolve([] as any);
  }

  $executeRawUnsafe(query: string, ...values: any[]): Promise<number> {
    return Promise.resolve(0);
  }

  // Model delegates
  get city(): ModelDelegate<City, CityCreateInput, CityUpdateInput, CityWhereInput, CityWhereUniqueInput, CityOrderByInput> {
    return this._createDelegate();
  }

  get category(): ModelDelegate<Category, CategoryCreateInput, CategoryUpdateInput, CategoryWhereInput, CategoryWhereUniqueInput, CategoryOrderByInput> {
    return this._createDelegate();
  }

  get user(): ModelDelegate<User, UserCreateInput, UserUpdateInput, UserWhereInput, UserWhereUniqueInput, UserOrderByInput> {
    return this._createDelegate();
  }

  get proProfile(): ModelDelegate<ProProfile, ProProfileCreateInput, ProProfileUpdateInput, ProProfileWhereInput, ProProfileWhereUniqueInput, ProProfileOrderByInput> {
    return this._createDelegate();
  }

  get proService(): ModelDelegate<ProService, ProServiceCreateInput, ProServiceUpdateInput, ProServiceWhereInput, ProServiceWhereUniqueInput, ProServiceOrderByInput> {
    return this._createDelegate();
  }

  get booking(): ModelDelegate<Booking, BookingCreateInput, BookingUpdateInput, BookingWhereInput, BookingWhereUniqueInput, BookingOrderByInput> {
    return this._createDelegate();
  }

  get bookingEvent(): ModelDelegate<BookingEvent, BookingEventCreateInput, BookingEventUpdateInput, BookingEventWhereInput, BookingEventWhereUniqueInput, BookingEventOrderByInput> {
    return this._createDelegate();
  }

  get slotLock(): ModelDelegate<SlotLock, SlotLockCreateInput, SlotLockUpdateInput, SlotLockWhereInput, SlotLockWhereUniqueInput, SlotLockOrderByInput> {
    return this._createDelegate();
  }

  get weeklyAvailability(): ModelDelegate<WeeklyAvailability, WeeklyAvailabilityCreateInput, WeeklyAvailabilityUpdateInput, WeeklyAvailabilityWhereInput, WeeklyAvailabilityWhereUniqueInput, WeeklyAvailabilityOrderByInput> {
    return this._createDelegate();
  }

  get availabilityException(): ModelDelegate<AvailabilityException, AvailabilityExceptionCreateInput, AvailabilityExceptionUpdateInput, AvailabilityExceptionWhereInput, AvailabilityExceptionWhereUniqueInput, AvailabilityExceptionOrderByInput> {
    return this._createDelegate();
  }

  get penaltyLog(): ModelDelegate<PenaltyLog, PenaltyLogCreateInput, PenaltyLogUpdateInput, PenaltyLogWhereInput, PenaltyLogWhereUniqueInput, PenaltyLogOrderByInput> {
    return this._createDelegate();
  }

  get report(): ModelDelegate<Report, ReportCreateInput, ReportUpdateInput, ReportWhereInput, ReportWhereUniqueInput, ReportOrderByInput> {
    return this._createDelegate();
  }

  get review(): ModelDelegate<Review, ReviewCreateInput, ReviewUpdateInput, ReviewWhereInput, ReviewWhereUniqueInput, ReviewOrderByInput> {
    return this._createDelegate();
  }

  get deviceToken(): ModelDelegate<DeviceToken, DeviceTokenCreateInput, DeviceTokenUpdateInput, DeviceTokenWhereInput, DeviceTokenWhereUniqueInput, DeviceTokenOrderByInput> {
    return this._createDelegate();
  }

  get proSubscription(): ModelDelegate<ProSubscription, ProSubscriptionCreateInput, ProSubscriptionUpdateInput, ProSubscriptionWhereInput, ProSubscriptionWhereUniqueInput, ProSubscriptionOrderByInput> {
    return this._createDelegate();
  }

  get proBoost(): ModelDelegate<ProBoost, ProBoostCreateInput, ProBoostUpdateInput, ProBoostWhereInput, ProBoostWhereUniqueInput, ProBoostOrderByInput> {
    return this._createDelegate();
  }

  get paymentOrder(): ModelDelegate<PaymentOrder, PaymentOrderCreateInput, PaymentOrderUpdateInput, PaymentOrderWhereInput, PaymentOrderWhereUniqueInput, PaymentOrderOrderByInput> {
    return this._createDelegate();
  }

  private _createDelegate<T, C, U, W, WU, O>(): ModelDelegate<T, C, U, W, WU, O> {
    return {
      findUnique: () => Promise.resolve(null),
      findUniqueOrThrow: () => Promise.reject(new Error('Not found')),
      findFirst: () => Promise.resolve(null),
      findFirstOrThrow: () => Promise.reject(new Error('Not found')),
      findMany: () => Promise.resolve([]),
      create: () => Promise.resolve({} as T),
      createMany: () => Promise.resolve({ count: 0 }),
      update: () => Promise.resolve({} as T),
      updateMany: () => Promise.resolve({ count: 0 }),
      upsert: () => Promise.resolve({} as T),
      delete: () => Promise.resolve({} as T),
      deleteMany: () => Promise.resolve({ count: 0 }),
      count: () => Promise.resolve(0),
      aggregate: () => Promise.resolve({}),
      groupBy: () => Promise.resolve([]),
    };
  }
}

export default { PrismaClient };
