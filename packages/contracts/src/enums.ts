import { z } from 'zod';

// Role
export const RoleSchema = z.enum(['CLIENT', 'PRO', 'ADMIN']);
export type Role = z.infer<typeof RoleSchema>;

// UserStatus
export const UserStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']);
export type UserStatus = z.infer<typeof UserStatusSchema>;

// KycStatus
export const KycStatusSchema = z.enum([
  'NOT_SUBMITTED',
  'PENDING',
  'APPROVED',
  'REJECTED',
]);
export type KycStatus = z.infer<typeof KycStatusSchema>;

// BookingStatus
export const BookingStatusSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'DECLINED',
  'CANCELLED_BY_CLIENT',
  'CANCELLED_BY_CLIENT_LATE',
  'CANCELLED_BY_PRO',
  'CANCELLED_AUTO_FIRST_CONFIRMED',
  'EXPIRED',
  'COMPLETED',
]);
export type BookingStatus = z.infer<typeof BookingStatusSchema>;

// BookingEventType
export const BookingEventTypeSchema = z.enum([
  'CREATED',
  'CONFIRMED',
  'DECLINED',
  'EXPIRED',
  'CANCELLED',
  'COMPLETED',
  'SLOTS_RELEASED',
]);
export type BookingEventType = z.infer<typeof BookingEventTypeSchema>;

// PenaltyType
export const PenaltyTypeSchema = z.enum([
  'CLIENT_CANCEL_LATE',
  'PRO_CANCEL_CONFIRMED',
]);
export type PenaltyType = z.infer<typeof PenaltyTypeSchema>;

// SubscriptionPlan
export const SubscriptionPlanSchema = z.enum([
  'PREMIUM_MONTHLY_NO_COMMIT',
  'PREMIUM_ANNUAL_COMMIT',
]);
export type SubscriptionPlan = z.infer<typeof SubscriptionPlanSchema>;

// SubscriptionStatus
export const SubscriptionStatusSchema = z.enum([
  'ACTIVE',
  'CANCELLED',
  'EXPIRED',
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

// BoostStatus
export const BoostStatusSchema = z.enum(['ACTIVE', 'EXPIRED']);
export type BoostStatus = z.infer<typeof BoostStatusSchema>;

// EstimatedDuration
export const EstimatedDurationSchema = z.enum(['H1', 'H2', 'H3', 'H4', 'H8']);
export type EstimatedDuration = z.infer<typeof EstimatedDurationSchema>;

// ReportStatus
export const ReportStatusSchema = z.enum([
  'OPEN',
  'IN_REVIEW',
  'RESOLVED',
  'REJECTED',
]);
export type ReportStatus = z.infer<typeof ReportStatusSchema>;

// Platform
export const PlatformSchema = z.enum(['IOS', 'ANDROID', 'WEB']);
export type Platform = z.infer<typeof PlatformSchema>;
