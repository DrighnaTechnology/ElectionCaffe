import { NotificationProvider, MessageResult } from '../notifications.js';

interface GupshupConfig {
  apiKey: string;
  appName: string;
  sourceNumber: string;
}

export class GupshupProvider implements NotificationProvider {
  private config: GupshupConfig;

  constructor(config: Record<string, any>) {
    this.config = config as GupshupConfig;
  }

  async sendSMS(_to: string, _message: string): Promise<MessageResult> {
    return { success: false, error: 'SMS not supported by Gupshup provider. Use MSG91 or Twilio instead.', provider: 'gupshup' };
  }

  async sendEmail(_to: string, _subject: string, _body: string): Promise<MessageResult> {
    return { success: false, error: 'Email not supported by Gupshup provider. Use SendGrid instead.', provider: 'gupshup' };
  }

  async sendWhatsApp(to: string, message: string, mediaUrl?: string): Promise<MessageResult> {
    try {
      const phone = to.replace(/[^0-9]/g, '');
      const destination = phone.startsWith('91') ? phone : `91${phone}`;

      const body = new URLSearchParams({
        channel: 'whatsapp',
        source: this.config.sourceNumber,
        destination: destination,
        'src.name': this.config.appName,
      });

      if (mediaUrl) {
        body.set('message.type', 'image');
        body.set('message.url', mediaUrl);
        body.set('message.caption', message);
      } else {
        body.set('message.type', 'text');
        body.set('message.text', message);
      }

      const response = await fetch('https://api.gupshup.io/wa/api/v1/msg', {
        method: 'POST',
        headers: {
          'apikey': this.config.apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const data = await response.json() as any;

      if (data.status === 'submitted' || response.ok) {
        return { success: true, messageId: data.messageId || `gupshup-${Date.now()}`, provider: 'gupshup' };
      }

      return { success: false, error: data.message || 'Gupshup send failed', provider: 'gupshup' };
    } catch (error: any) {
      return { success: false, error: error.message, provider: 'gupshup' };
    }
  }

  async sendVoice(_to: string, _message: string): Promise<MessageResult> {
    return { success: false, error: 'Voice calls not supported by Gupshup provider. Use Twilio instead.', provider: 'gupshup' };
  }
}
