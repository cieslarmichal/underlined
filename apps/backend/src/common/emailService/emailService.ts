import type { EmailTemplate } from './emailTemplate.ts';

export interface SendEmailPayload {
  readonly toEmail: string;
  readonly template: EmailTemplate;
}

export interface EmailService {
  sendEmail(payload: SendEmailPayload): Promise<void>;
}
