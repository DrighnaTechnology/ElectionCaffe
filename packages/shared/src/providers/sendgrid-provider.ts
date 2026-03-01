import { NotificationProvider, MessageResult } from '../notifications.js';

interface SendGridConfig {
  apiKey: string;
  fromEmail: string;
  fromName?: string;
}

export class SendGridProvider implements NotificationProvider {
  private config: SendGridConfig;

  constructor(config: Record<string, any>) {
    this.config = config as SendGridConfig;
  }

  async sendSMS(_to: string, _message: string): Promise<MessageResult> {
    return { success: false, error: 'SMS not supported by SendGrid provider. Use MSG91 or Twilio instead.', provider: 'sendgrid' };
  }

  async sendEmail(to: string, subject: string, body: string): Promise<MessageResult> {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: {
            email: this.config.fromEmail,
            name: this.config.fromName || 'ElectionCaffe',
          },
          subject,
          content: [
            { type: 'text/html', value: body },
          ],
        }),
      });

      if (response.status === 202 || response.ok) {
        const messageId = response.headers.get('x-message-id') || `sendgrid-${Date.now()}`;
        return { success: true, messageId, provider: 'sendgrid' };
      }

      const data = await response.json().catch(() => ({}));
      return { success: false, error: (data as any)?.errors?.[0]?.message || `SendGrid error: ${response.status}`, provider: 'sendgrid' };
    } catch (error: any) {
      return { success: false, error: error.message, provider: 'sendgrid' };
    }
  }

  async sendWhatsApp(_to: string, _message: string): Promise<MessageResult> {
    return { success: false, error: 'WhatsApp not supported by SendGrid provider. Use Gupshup or Twilio instead.', provider: 'sendgrid' };
  }

  async sendVoice(_to: string, _message: string): Promise<MessageResult> {
    return { success: false, error: 'Voice calls not supported by SendGrid provider. Use Twilio instead.', provider: 'sendgrid' };
  }
}
