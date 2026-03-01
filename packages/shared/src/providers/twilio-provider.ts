import { NotificationProvider, MessageResult } from '../notifications.js';

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  messagingServiceSid?: string;
  whatsappFromNumber?: string;
  twimlUrl?: string;
}

export class TwilioProvider implements NotificationProvider {
  private config: TwilioConfig;
  private baseUrl: string;

  constructor(config: Record<string, any>) {
    this.config = config as TwilioConfig;
    this.baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}`;
  }

  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString('base64');
    return `Basic ${credentials}`;
  }

  private async makeRequest(endpoint: string, body: URLSearchParams): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      throw new Error(data.message || `Twilio error: ${response.status}`);
    }

    return data;
  }

  async sendSMS(to: string, message: string): Promise<MessageResult> {
    try {
      const body = new URLSearchParams({
        To: to.startsWith('+') ? to : `+91${to}`,
        Body: message,
      });

      if (this.config.messagingServiceSid) {
        body.set('MessagingServiceSid', this.config.messagingServiceSid);
      } else {
        body.set('From', this.config.fromNumber);
      }

      const data = await this.makeRequest('/Messages.json', body);
      return { success: true, messageId: data.sid, provider: 'twilio' };
    } catch (error: any) {
      return { success: false, error: error.message, provider: 'twilio' };
    }
  }

  async sendEmail(_to: string, _subject: string, _body: string): Promise<MessageResult> {
    return { success: false, error: 'Email not supported by Twilio provider. Use SendGrid instead.', provider: 'twilio' };
  }

  async sendWhatsApp(to: string, message: string, mediaUrl?: string): Promise<MessageResult> {
    try {
      const whatsappTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to.startsWith('+') ? to : `+91${to}`}`;
      const whatsappFrom = this.config.whatsappFromNumber
        ? `whatsapp:${this.config.whatsappFromNumber}`
        : `whatsapp:${this.config.fromNumber}`;

      const body = new URLSearchParams({
        To: whatsappTo,
        From: whatsappFrom,
        Body: message,
      });

      if (mediaUrl) {
        body.set('MediaUrl', mediaUrl);
      }

      const data = await this.makeRequest('/Messages.json', body);
      return { success: true, messageId: data.sid, provider: 'twilio' };
    } catch (error: any) {
      return { success: false, error: error.message, provider: 'twilio' };
    }
  }

  async sendVoice(to: string, message: string): Promise<MessageResult> {
    try {
      const twiml = `<Response><Say language="hi-IN">${message}</Say></Response>`;
      const body = new URLSearchParams({
        To: to.startsWith('+') ? to : `+91${to}`,
        From: this.config.fromNumber,
        Twiml: twiml,
      });

      const data = await this.makeRequest('/Calls.json', body);
      return { success: true, messageId: data.sid, provider: 'twilio' };
    } catch (error: any) {
      return { success: false, error: error.message, provider: 'twilio' };
    }
  }
}
