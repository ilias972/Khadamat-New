import { Injectable, Logger } from '@nestjs/common';

interface LoginAttempt {
  count: number;
  lockedUntil: number | null;
}

/**
 * Extension point for production deployments.
 * TODO(prod): replace in-memory store with a distributed backend (Redis/DB)
 * so lockouts survive restarts and work across multiple API instances.
 */
interface FailedLoginStore {
  get(key: string): LoginAttempt | undefined;
  set(key: string, value: LoginAttempt): void;
  delete(key: string): void;
  entries(): IterableIterator<[string, LoginAttempt]>;
}

class InMemoryFailedLoginStore implements FailedLoginStore {
  private readonly attempts = new Map<string, LoginAttempt>();

  get(key: string): LoginAttempt | undefined {
    return this.attempts.get(key);
  }

  set(key: string, value: LoginAttempt): void {
    this.attempts.set(key, value);
  }

  delete(key: string): void {
    this.attempts.delete(key);
  }

  entries(): IterableIterator<[string, LoginAttempt]> {
    return this.attempts.entries();
  }
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

@Injectable()
export class FailedLoginService {
  private readonly logger = new Logger(FailedLoginService.name);
  private readonly store: FailedLoginStore = new InMemoryFailedLoginStore();

  constructor() {
    // Periodic cleanup of stale entries
    setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
  }

  /**
   * Check if a login identifier is currently locked out.
   * Returns the remaining lockout seconds, or 0 if not locked.
   */
  isLocked(identifier: string): number {
    const key = identifier.toLowerCase().trim();
    const entry = this.store.get(key);
    if (!entry?.lockedUntil) return 0;

    const remaining = entry.lockedUntil - Date.now();
    if (remaining <= 0) {
      this.store.delete(key);
      return 0;
    }

    return Math.ceil(remaining / 1000);
  }

  /**
   * Record a failed login attempt. Returns true if the account is now locked.
   */
  recordFailure(identifier: string): boolean {
    const key = identifier.toLowerCase().trim();
    const entry = this.store.get(key) || { count: 0, lockedUntil: null };

    entry.count += 1;

    if (entry.count >= MAX_ATTEMPTS) {
      entry.lockedUntil = Date.now() + LOCKOUT_MS;
      this.store.set(key, entry);
      this.logger.warn(
        `Login lockout activated: ${MAX_ATTEMPTS} failed attempts (identifier hash: ${this.hash(key)})`,
      );
      return true;
    }

    this.store.set(key, entry);
    return false;
  }

  /**
   * Reset the counter after a successful login.
   */
  resetAttempts(identifier: string): void {
    const key = identifier.toLowerCase().trim();
    this.store.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.lockedUntil && entry.lockedUntil < now) {
        this.store.delete(key);
      }
    }
  }

  /** Hash identifier for logging (no PII in logs) */
  private hash(value: string): string {
    return Buffer.from(value).toString('base64').slice(0, 8) + '...';
  }
}
