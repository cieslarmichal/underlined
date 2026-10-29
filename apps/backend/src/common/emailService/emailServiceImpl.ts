import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resend } from 'resend';

import type { Config } from '../../core/config.ts';
import { ExternalServiceError } from '../errors/externalServiceError.ts';

import type { EmailService, SendEmailPayload } from './emailService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class EmailServiceImpl implements EmailService {
  private readonly config: Config;
  private readonly resendClient: Resend;
  private readonly templateCache: Map<string, string> = new Map();

  public constructor(config: Config) {
    this.config = config;
    this.resendClient = new Resend(this.config.resend.apiKey);
  }

  public async sendEmail(payload: SendEmailPayload): Promise<void> {
    const { toEmail, template } = payload;

    const emailTemplate = this.config.resend.emails[template.name];

    let htmlTemplate = this.templateCache.get(template.name);

    if (!htmlTemplate) {
      const htmlTemplateFilePath = path.join(__dirname, '../../../emails', emailTemplate.templateFile);
      htmlTemplate = readFileSync(htmlTemplateFilePath, 'utf-8');
      this.templateCache.set(template.name, htmlTemplate);
    }

    const htmlContent = htmlTemplate.replace(/{{\s*(\w+)\s*}}/g, (_, key: string) => {
      if (typeof template.data === 'object' && key in template.data) {
        return String((template.data as unknown as Record<string, unknown>)[key]);
      }
      return '';
    });

    const subject = emailTemplate.subject.replace(/{{\s*(\w+)\s*}}/g, (_, key: string) => {
      if (typeof template.data === 'object' && key in template.data) {
        return String((template.data as unknown as Record<string, unknown>)[key]);
      }
      return '';
    });

    const response = await this.resendClient.emails.send({
      from: this.config.resend.fromEmail,
      to: [toEmail],
      subject,
      html: htmlContent,
    });

    if (response.error) {
      throw new ExternalServiceError({
        service: 'Resend',
        originalError: response.error,
        message: `Failed to send email to ${toEmail}`,
        template: template.name,
      });
    }
  }
}
