import { NotificationProvider, MessageResult } from '../notifications.js';

interface MSG91Config {
  authKey: string;
  senderId: string;
  route?: string;
  templateId?: string;
  whatsappTemplateId?: string;
  whatsappIntegratedNumber?: string;
}

export class MSG91Provider implements NotificationProvider {
  private config: MSG91Config;

  constructor(config: Record<string, any>) {
    this.config = config as MSG91Config;
  }

  async sendSMS(to: string, message: string): Promise<MessageResult> {
    try {
      const phone = to.replace(/[^0-9]/g, '');
      const mobiles = phone.startsWith('91') ? phone : `91${phone}`;

      const response = await fetch('https://control.msg91.com/api/v5/flow/', {
        method: 'POST',
        headers: {
          'authkey': this.config.authKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_id: this.config.templateId,
          sender: this.config.senderId,
          short_url: '0',
          mobiles: mobiles,
          message: message,
        }),
      });

      const data = await response.json() as any;

      if (data.type === 'success' || response.ok) {
        return { success: true, messageId: data.request_id || `msg91-${Date.now()}`, provider: 'msg91' };
      }

      return { success: false, error: data.message || 'MSG91 send failed', provider: 'msg91' };
    } catch (error: any) {
      return { success: false, error: error.message, provider: 'msg91' };
    }
  }

  async sendEmail(_to: string, _subject: string, _body: string): Promise<MessageResult> {
    return { success: false, error: 'Email not supported by MSG91 provider. Use SendGrid instead.', provider: 'msg91' };
  }

  async sendWhatsApp(to: string, message: string): Promise<MessageResult> {
    try {
      const phone = to.replace(/[^0-9]/g, '');
      const mobiles = phone.startsWith('91') ? phone : `91${phone}`;

      const response = await fetch('https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/', {
        method: 'POST',
        headers: {
          'authkey': this.config.authKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          integrated_number: this.config.whatsappIntegratedNumber,
          content_type: 'text',
          payload: {
            to: mobiles,
            type: 'text',
            messaging_product: 'whatsapp',
            text: { body: message },
          },
        }),
      });

      const data = await response.json() as any;

      if (response.ok) {
        return { success: true, messageId: data.request_id || `msg91-wa-${Date.now()}`, provider: 'msg91' };
      }

      return { success: false, error: data.message || 'MSG91 WhatsApp send failed', provider: 'msg91' };
    } catch (error: any) {
      return { success: false, error: error.message, provider: 'msg91' };
    }
  }

  async sendVoice(_to: string, _message: string): Promise<MessageResult> {
    return { success: false, error: 'Voice calls not supported by MSG91 provider. Use Twilio instead.', provider: 'msg91' };
  }
}
