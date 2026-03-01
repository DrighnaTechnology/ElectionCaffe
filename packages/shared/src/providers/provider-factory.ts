import { NotificationProvider, ConsoleNotificationProvider } from '../notifications.js';
import { TwilioProvider } from './twilio-provider.js';
import { MSG91Provider } from './msg91-provider.js';
import { GupshupProvider } from './gupshup-provider.js';
import { SendGridProvider } from './sendgrid-provider.js';
import { NodemailerProvider } from './nodemailer-provider.js';

export type ChannelType = 'SMS' | 'WHATSAPP' | 'EMAIL' | 'VOICE';
export type ProviderType = 'TWILIO' | 'MSG91' | 'GUPSHUP' | 'SENDGRID' | 'NODEMAILER' | 'CUSTOM';

export interface ProviderConfig {
  provider: ProviderType;
  config: Record<string, any>;
  isActive: boolean;
}

/**
 * Creates a NotificationProvider instance based on the provider type and config.
 */
export function createProvider(providerType: ProviderType, config: Record<string, any>): NotificationProvider {
  switch (providerType) {
    case 'TWILIO':
      return new TwilioProvider(config);
    case 'MSG91':
      return new MSG91Provider(config);
    case 'GUPSHUP':
      return new GupshupProvider(config);
    case 'SENDGRID':
      return new SendGridProvider(config);
    case 'NODEMAILER':
      return new NodemailerProvider(config);
    case 'CUSTOM':
    default:
      return new ConsoleNotificationProvider();
  }
}

/**
 * Get the notification provider for a specific channel from tenant DB config.
 * Pass the messaging provider record from the database.
 * Falls back to ConsoleNotificationProvider (mock) if no config found.
 */
export function getProviderFromConfig(providerRecord: ProviderConfig | null | undefined): NotificationProvider {
  if (!providerRecord || !providerRecord.isActive) {
    return new ConsoleNotificationProvider();
  }
  return createProvider(providerRecord.provider, providerRecord.config as Record<string, any>);
}

/**
 * Returns which providers support which channels.
 * Used by the Settings UI to show appropriate provider options per channel.
 */
export function getSupportedProviders(channel: ChannelType): ProviderType[] {
  switch (channel) {
    case 'SMS':
      return ['TWILIO', 'MSG91'];
    case 'WHATSAPP':
      return ['TWILIO', 'MSG91', 'GUPSHUP'];
    case 'EMAIL':
      return ['SENDGRID', 'NODEMAILER'];
    case 'VOICE':
      return ['TWILIO'];
    default:
      return [];
  }
}

/**
 * Returns the config fields required for each provider type.
 * Used by the Settings UI to render the correct form fields.
 */
export function getProviderConfigFields(providerType: ProviderType): Array<{ key: string; label: string; type: 'text' | 'password'; required: boolean; placeholder: string }> {
  switch (providerType) {
    case 'TWILIO':
      return [
        { key: 'accountSid', label: 'Account SID', type: 'text', required: true, placeholder: 'AC...' },
        { key: 'authToken', label: 'Auth Token', type: 'password', required: true, placeholder: 'Your auth token' },
        { key: 'fromNumber', label: 'From Number', type: 'text', required: true, placeholder: '+91...' },
        { key: 'messagingServiceSid', label: 'Messaging Service SID', type: 'text', required: false, placeholder: 'MG... (optional)' },
        { key: 'whatsappFromNumber', label: 'WhatsApp Number', type: 'text', required: false, placeholder: '+91... (for WhatsApp)' },
      ];
    case 'MSG91':
      return [
        { key: 'authKey', label: 'Auth Key', type: 'password', required: true, placeholder: 'Your MSG91 auth key' },
        { key: 'senderId', label: 'Sender ID', type: 'text', required: true, placeholder: '6-char sender ID' },
        { key: 'templateId', label: 'Template ID', type: 'text', required: false, placeholder: 'DLT template ID for SMS' },
        { key: 'whatsappIntegratedNumber', label: 'WhatsApp Number', type: 'text', required: false, placeholder: 'For WhatsApp messages' },
      ];
    case 'GUPSHUP':
      return [
        { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'Your Gupshup API key' },
        { key: 'appName', label: 'App Name', type: 'text', required: true, placeholder: 'Your Gupshup app name' },
        { key: 'sourceNumber', label: 'Source Number', type: 'text', required: true, placeholder: '91...' },
      ];
    case 'SENDGRID':
      return [
        { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'SG...' },
        { key: 'fromEmail', label: 'From Email', type: 'text', required: true, placeholder: 'campaigns@yourdomain.com' },
        { key: 'fromName', label: 'From Name', type: 'text', required: false, placeholder: 'Your Campaign Name' },
      ];
    case 'NODEMAILER':
      return [
        { key: 'host', label: 'SMTP Host', type: 'text', required: true, placeholder: 'smtp.gmail.com' },
        { key: 'port', label: 'SMTP Port', type: 'text', required: true, placeholder: '587' },
        { key: 'user', label: 'Username', type: 'text', required: true, placeholder: 'your@email.com' },
        { key: 'pass', label: 'Password', type: 'password', required: true, placeholder: 'App password' },
        { key: 'fromEmail', label: 'From Email', type: 'text', required: true, placeholder: 'your@email.com' },
        { key: 'fromName', label: 'From Name', type: 'text', required: false, placeholder: 'Your Campaign Name' },
      ];
    default:
      return [];
  }
}
