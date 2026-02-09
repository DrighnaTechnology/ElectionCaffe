export interface NotificationProvider {
  sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string }>;
  sendEmail(to: string, subject: string, body: string): Promise<{ success: boolean; messageId?: string }>;
}

/**
 * Console-based notification provider for development.
 * Logs notifications to stdout instead of sending them.
 */
export class ConsoleNotificationProvider implements NotificationProvider {
  async sendSMS(to: string, message: string) {
    if (process.env.NODE_ENV !== 'test') {
      process.stdout.write(
        `[NotificationProvider] SMS to ${to}: ${message}\n`
      );
    }
    return { success: true, messageId: `dev-sms-${Date.now()}` };
  }

  async sendEmail(to: string, subject: string, body: string) {
    if (process.env.NODE_ENV !== 'test') {
      process.stdout.write(
        `[NotificationProvider] Email to ${to}: ${subject}\n${body}\n`
      );
    }
    return { success: true, messageId: `dev-email-${Date.now()}` };
  }
}

let _provider: NotificationProvider | null = null;

/**
 * Returns the configured notification provider.
 * In production, set NOTIFICATION_PROVIDER env var to use a real provider.
 * Falls back to ConsoleNotificationProvider for development.
 */
export function getNotificationProvider(): NotificationProvider {
  if (_provider) return _provider;
  _provider = new ConsoleNotificationProvider();
  return _provider;
}

/**
 * Override the notification provider (useful for testing or custom integrations).
 */
export function setNotificationProvider(provider: NotificationProvider): void {
  _provider = provider;
}
