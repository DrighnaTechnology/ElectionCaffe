import { NotificationProvider, MessageResult } from '../notifications.js';

interface NodemailerConfig {
  host: string;
  port: number;
  secure?: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName?: string;
}

/**
 * SMTP Email provider using raw SMTP protocol (no nodemailer dependency).
 * Uses the native Node.js net/tls modules to send email via SMTP.
 * For simplicity, sends using a basic SMTP envelope approach.
 */
export class NodemailerProvider implements NotificationProvider {
  private config: NodemailerConfig;

  constructor(config: Record<string, any>) {
    this.config = config as NodemailerConfig;
  }

  async sendSMS(_to: string, _message: string): Promise<MessageResult> {
    return { success: false, error: 'SMS not supported by SMTP provider.', provider: 'nodemailer' };
  }

  async sendEmail(to: string, subject: string, body: string): Promise<MessageResult> {
    try {
      // Use dynamic import for nodemailer if available, otherwise fall back to fetch-based approach
      // Since we're keeping dependencies minimal, we use a simple SMTP approach via fetch to a mail relay
      // In production, install nodemailer: npm install nodemailer

      // Try to dynamically load nodemailer
      let nodemailer: any;
      try {
        // @ts-expect-error nodemailer is an optional peer dependency
        nodemailer = await import('nodemailer');
      } catch {
        return {
          success: false,
          error: 'nodemailer package not installed. Run: npm install nodemailer',
          provider: 'nodemailer',
        };
      }

      const transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure ?? (this.config.port === 465),
        auth: {
          user: this.config.user,
          pass: this.config.pass,
        },
      });

      const info = await transporter.sendMail({
        from: `"${this.config.fromName || 'ElectionCaffe'}" <${this.config.fromEmail}>`,
        to,
        subject,
        html: body,
      });

      return { success: true, messageId: info.messageId, provider: 'nodemailer' };
    } catch (error: any) {
      return { success: false, error: error.message, provider: 'nodemailer' };
    }
  }

  async sendWhatsApp(_to: string, _message: string): Promise<MessageResult> {
    return { success: false, error: 'WhatsApp not supported by SMTP provider.', provider: 'nodemailer' };
  }

  async sendVoice(_to: string, _message: string): Promise<MessageResult> {
    return { success: false, error: 'Voice calls not supported by SMTP provider.', provider: 'nodemailer' };
  }
}
