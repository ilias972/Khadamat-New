import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

/**
 * NotificationsService
 *
 * Service centralisé pour l'envoi de notifications (Email, Push, SMS).
 * Découplé de la logique métier via le système d'événements.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private resendClient: Resend | null = null;

  constructor(private readonly config: ConfigService) {
    // Initialiser Resend seulement si la clé API est présente
    const resendApiKey = this.config.get<string>('RESEND_API_KEY');

    if (resendApiKey) {
      this.resendClient = new Resend(resendApiKey);
      this.logger.log('✉️ Resend client initialisé avec succès');
    } else {
      this.logger.warn('⚠️ RESEND_API_KEY non configurée - Mode développement (emails loggés)');
    }
  }

  /**
   * Envoie un email via Resend.
   * En mode dev (sans API key), loggue l'email dans la console.
   *
   * @param to - Adresse email du destinataire
   * @param subject - Sujet de l'email
   * @param html - Contenu HTML de l'email
   */
  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      if (this.resendClient) {
        // Mode production : Envoyer via Resend
        const fromEmail = this.config.get<string>('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';

        const result = await this.resendClient.emails.send({
          from: fromEmail,
          to,
          subject,
          html,
        });

        this.logger.log(`✅ Email envoyé via Resend`, {
          to,
          subject,
          emailId: result.data?.id,
        });
      } else {
        // Mode développement : Logger l'email
        this.logger.log(`📧 [DEV MODE] Email à envoyer:`, {
          to,
          subject,
          preview: html.substring(0, 100) + '...',
        });

        // En dev, on peut aussi écrire dans un fichier ou afficher dans la console
        console.log('\n=== EMAIL (DEV MODE) ===');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`HTML:\n${html}`);
        console.log('========================\n');
      }
    } catch (error: unknown) {
      // Ne pas crasher si l'email échoue
      this.logger.error('❌ Erreur lors de l\'envoi de l\'email', {
        to,
        subject,
        error: error instanceof Error ? error.message : String(error),
      });

      // On pourrait aussi enregistrer l'échec dans une table de logs
      // ou envoyer une alerte à Sentry, etc.
    }
  }

  /**
   * Envoie une notification push via Firebase Cloud Messaging.
   * Pour l'instant, c'est un mock qui loggue simplement.
   *
   * @param userId - ID de l'utilisateur cible
   * @param title - Titre de la notification
   * @param body - Corps de la notification
   * @param data - Données optionnelles (deeplink, etc.)
   */
  async sendPush(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    try {
      // TODO: Implémenter Firebase Cloud Messaging (FCM)
      // 1. Récupérer les device tokens de l'utilisateur depuis la DB
      // 2. Envoyer via FCM à chaque device token
      // 3. Logger les succès/échecs

      this.logger.log(`📱 [PUSH SIMULÉ]`, {
        userId,
        title,
        body,
        data,
      });

      console.log('\n=== PUSH NOTIFICATION (SIMULÉE) ===');
      console.log(`User ID: ${userId}`);
      console.log(`Title: ${title}`);
      console.log(`Body: ${body}`);
      if (data) {
        console.log(`Data:`, data);
      }
      console.log('====================================\n');
    } catch (error: unknown) {
      this.logger.error('❌ Erreur lors de l\'envoi de push', {
        userId,
        title,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Envoie un SMS via Twilio ou autre provider.
   * Mock pour l'instant.
   *
   * @param phoneNumber - Numéro de téléphone (format international)
   * @param message - Contenu du SMS
   */
  async sendSMS(phoneNumber: string, message: string): Promise<void> {
    try {
      // TODO: Implémenter Twilio ou autre provider SMS
      this.logger.log(`📱 [SMS SIMULÉ]`, {
        phoneNumber,
        message,
      });

      console.log('\n=== SMS (SIMULÉ) ===');
      console.log(`To: ${phoneNumber}`);
      console.log(`Message: ${message}`);
      console.log('====================\n');
    } catch (error: unknown) {
      this.logger.error('❌ Erreur lors de l\'envoi de SMS', {
        phoneNumber,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
