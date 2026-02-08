import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

/** Token expires after 48 hours */
const TOKEN_EXPIRY_MS = 48 * 60 * 60 * 1000;

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl =
      this.config.get<string>('FRONTEND_URL') || 'https://khadamat.ma';

    // Validate FRONTEND_URL at startup
    this.validateFrontendUrl(this.baseUrl);
  }

  /** Return the frontend base URL (used by controller for redirects). */
  getFrontendUrl(): string {
    return this.baseUrl;
  }

  /**
   * Subscribe an email to the newsletter.
   * - If already active: silently return success (no email enumeration)
   * - If pending: resend confirmation
   * - If unsubscribed: reset to pending + new token
   * - If new: create pending + send confirmation
   */
  async subscribe(
    email: string,
    ip?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      if (existing.status === 'ACTIVE') {
        // Don't reveal that the email is already subscribed
        return { message: 'confirmation_sent' };
      }

      // Pending or Unsubscribed: generate new token and resend
      const token = uuidv4();
      await this.prisma.newsletterSubscriber.update({
        where: { id: existing.id },
        data: {
          status: 'PENDING',
          token,
          tokenCreatedAt: new Date(),
          ip: ip || existing.ip,
          userAgent: userAgent || existing.userAgent,
          confirmedAt: null,
        },
      });

      await this.sendConfirmationEmail(normalizedEmail, token);
      return { message: 'confirmation_sent' };
    }

    // New subscriber
    const token = uuidv4();
    await this.prisma.newsletterSubscriber.create({
      data: {
        email: normalizedEmail,
        status: 'PENDING',
        token,
        ip,
        userAgent,
      },
    });

    await this.sendConfirmationEmail(normalizedEmail, token);
    return { message: 'confirmation_sent' };
  }

  /**
   * Confirm a subscription via token.
   * Token expires after 48h based on tokenCreatedAt.
   */
  async confirm(token: string): Promise<{ message: string }> {
    const subscriber = await this.prisma.newsletterSubscriber.findFirst({
      where: { token },
    });

    if (!subscriber) {
      return { message: 'invalid_or_expired_token' };
    }

    // Check 48h expiry using tokenCreatedAt (not createdAt)
    const tokenAge = Date.now() - subscriber.tokenCreatedAt.getTime();
    if (tokenAge > TOKEN_EXPIRY_MS) {
      return { message: 'invalid_or_expired_token' };
    }

    if (subscriber.status === 'ACTIVE') {
      return { message: 'already_confirmed' };
    }

    await this.prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: {
        status: 'ACTIVE',
        confirmedAt: new Date(),
      },
    });

    this.logger.log(`Newsletter confirmed: ${subscriber.email}`);
    return { message: 'confirmed' };
  }

  /**
   * Unsubscribe an email using its token.
   */
  async unsubscribe(
    email: string,
    token: string,
  ): Promise<{ message: string }> {
    const normalizedEmail = email.toLowerCase().trim();

    const subscriber = await this.prisma.newsletterSubscriber.findFirst({
      where: { email: normalizedEmail, token },
    });

    if (!subscriber) {
      // Don't reveal if email exists
      return { message: 'unsubscribed' };
    }

    await this.prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: { status: 'UNSUBSCRIBED' },
    });

    this.logger.log(`Newsletter unsubscribed: ${normalizedEmail}`);
    return { message: 'unsubscribed' };
  }

  /**
   * Export active subscribers as CSV (admin only).
   */
  async exportCSV(): Promise<string> {
    const subscribers = await this.prisma.newsletterSubscriber.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { confirmedAt: 'desc' },
    });

    const header = 'email,confirmed_at,created_at';
    const rows = subscribers.map(
      (s) =>
        `${s.email},${s.confirmedAt?.toISOString() || ''},${s.createdAt.toISOString()}`,
    );

    return [header, ...rows].join('\n');
  }

  /**
   * Send double opt-in confirmation email.
   */
  private async sendConfirmationEmail(
    email: string,
    token: string,
  ): Promise<void> {
    const apiBaseUrl =
      this.config.get<string>('API_URL') ||
      this.config.get<string>('NEXT_PUBLIC_API_URL') ||
      'https://khadamat.ma/api';
    const confirmUrl = `${apiBaseUrl}/newsletter/confirm?token=${encodeURIComponent(token)}`;

    const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Confirmez votre inscription</h2>
        <p>Vous avez demandé à recevoir la newsletter Khadamat.</p>
        <p>
          <a href="${confirmUrl}"
             style="display: inline-block; padding: 12px 24px; background-color: #F08C1B; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Confirmer mon inscription
          </a>
        </p>
        <p style="color: #666; font-size: 13px;">
          Ce lien expire dans 48 heures.<br/>
          Si vous n'avez pas demandé cette inscription, ignorez cet e-mail.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 11px;">
          Khadamat — La plateforme marocaine des services de confiance.
        </p>
      </div>
    `.trim();

    try {
      await this.notifications.sendEmail(
        email,
        'Confirmez votre inscription à la newsletter Khadamat',
        html,
      );
    } catch (error) {
      this.logger.error(`Failed to send confirmation email`, error);
    }
  }

  /**
   * Validate that FRONTEND_URL is a proper URL with allowed protocol.
   */
  private validateFrontendUrl(url: string): void {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error(`Invalid protocol: ${parsed.protocol}`);
      }
    } catch (error) {
      this.logger.error(`FRONTEND_URL validation failed: ${url}`);
      throw new Error(
        `FATAL: FRONTEND_URL is invalid ("${url}"). Must be a valid http/https URL.`,
      );
    }
  }
}
