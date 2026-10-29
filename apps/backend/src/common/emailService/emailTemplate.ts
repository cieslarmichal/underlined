import type { Config } from '../../core/config.ts';

export type EmailTemplateName = keyof Config['resend']['emails'];

interface VerifyAccountEmailTemplateData {
  readonly verificationLink: string;
}

interface ResetPasswordEmailTemplateData {
  readonly resetLink: string;
}

export interface EmailTemplateDataMap extends Record<EmailTemplateName, unknown> {
  readonly verifyAccount: VerifyAccountEmailTemplateData;
  readonly resetPassword: ResetPasswordEmailTemplateData;
}

export type EmailTemplate = {
  [K in keyof EmailTemplateDataMap]: {
    readonly name: K;
    readonly data: EmailTemplateDataMap[K];
  };
}[keyof EmailTemplateDataMap];
