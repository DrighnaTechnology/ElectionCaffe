export interface MessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
}

export interface NotificationProvider {
  sendSMS(to: string, message: string, opts?: Record<string, any>): Promise<MessageResult>;
  sendEmail(to: string, subject: string, body: string, opts?: Record<string, any>): Promise<MessageResult>;
  sendWhatsApp(to: string, message: string, mediaUrl?: string, opts?: Record<string, any>): Promise<MessageResult>;
  sendVoice(to: string, message: string, opts?: Record<string, any>): Promise<MessageResult>;
}

/**
 * Console-based notification provider for development/testing.
 * Logs notifications to stdout instead of sending them.
 */
export class ConsoleNotificationProvider implements NotificationProvider {
  async sendSMS(to: string, message: string): Promise<MessageResult> {
    if (process.env.NODE_ENV !== 'test') {
      process.stdout.write(
        `[MockProvider] SMS to ${to}: ${message}\n`
      );
    }
    return { success: true, messageId: `mock-sms-${Date.now()}`, provider: 'console' };
  }

  async sendEmail(to: string, subject: string, _body: string): Promise<MessageResult> {
    if (process.env.NODE_ENV !== 'test') {
      process.stdout.write(
        `[MockProvider] Email to ${to}: ${subject}\n`
      );
    }
    return { success: true, messageId: `mock-email-${Date.now()}`, provider: 'console' };
  }

  async sendWhatsApp(to: string, message: string, mediaUrl?: string): Promise<MessageResult> {
    if (process.env.NODE_ENV !== 'test') {
      process.stdout.write(
        `[MockProvider] WhatsApp to ${to}: ${message}${mediaUrl ? ` [media: ${mediaUrl}]` : ''}\n`
      );
    }
    return { success: true, messageId: `mock-wa-${Date.now()}`, provider: 'console' };
  }

  async sendVoice(to: string, message: string): Promise<MessageResult> {
    if (process.env.NODE_ENV !== 'test') {
      process.stdout.write(
        `[MockProvider] Voice to ${to}: ${message}\n`
      );
    }
    return { success: true, messageId: `mock-voice-${Date.now()}`, provider: 'console' };
  }
}

let _provider: NotificationProvider | null = null;

export function getNotificationProvider(): NotificationProvider {
  if (_provider) return _provider;
  _provider = new ConsoleNotificationProvider();
  return _provider;
}

export function setNotificationProvider(provider: NotificationProvider): void {
  _provider = provider;
}
