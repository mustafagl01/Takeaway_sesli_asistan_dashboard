import nodemailer from 'nodemailer';

interface CustomerInviteEmailInput {
  email: string;
  name: string;
  password: string;
  loginUrl: string;
  packageSummary?: string | null;
}

export interface MailDeliveryResult {
  sent: boolean;
  error?: string;
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const portRaw = process.env.SMTP_PORT?.trim();
  const secureRaw = process.env.SMTP_SECURE?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM_EMAIL?.trim();
  const fromName = process.env.SMTP_FROM_NAME?.trim() || 'MGL Systems';

  if (!host || !portRaw || !user || !pass || !fromEmail) {
    return null;
  }

  const port = Number(portRaw);
  if (!Number.isFinite(port)) {
    return null;
  }

  return {
    host,
    port,
    secure: secureRaw ? secureRaw.toLowerCase() === 'true' : port === 465,
    auth: {
      user,
      pass,
    },
    from: {
      name: fromName,
      address: fromEmail,
    },
  };
}

export async function sendCustomerInviteEmail(input: CustomerInviteEmailInput): Promise<MailDeliveryResult> {
  const smtpConfig = getSmtpConfig();
  if (!smtpConfig) {
    return { sent: false, error: 'SMTP configuration is missing' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: smtpConfig.auth,
    });

    const packageLine = input.packageSummary
      ? `<p style="margin:0 0 16px;">Tanimlanan paket: <strong>${input.packageSummary}</strong></p>`
      : '';

    await transporter.sendMail({
      from: smtpConfig.from,
      to: input.email,
      subject: 'UK Takeaway Dashboard giris bilgileriniz',
      text: [
        `Merhaba ${input.name},`,
        '',
        'Dashboard hesabiniz olusturuldu.',
        `Giris linki: ${input.loginUrl}`,
        `Email: ${input.email}`,
        `Sifre: ${input.password}`,
        input.packageSummary ? `Paket: ${input.packageSummary}` : '',
        '',
        'Isterseniz giris yaptiktan sonra profil sayfasindan sifrenizi degistirebilirsiniz.',
      ].filter(Boolean).join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
          <p style="margin:0 0 16px;">Merhaba ${input.name},</p>
          <p style="margin:0 0 16px;">Dashboard hesabiniz olusturuldu.</p>
          ${packageLine}
          <div style="background:#f3f4f6; border-radius:12px; padding:16px; margin:0 0 16px;">
            <p style="margin:0 0 8px;"><strong>Giris linki:</strong> <a href="${input.loginUrl}">${input.loginUrl}</a></p>
            <p style="margin:0 0 8px;"><strong>Email:</strong> ${input.email}</p>
            <p style="margin:0;"><strong>Sifre:</strong> ${input.password}</p>
          </div>
          <p style="margin:0;">Isterseniz giris yaptiktan sonra profil sayfasindan sifrenizi degistirebilirsiniz.</p>
        </div>
      `,
    });

    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      error: error instanceof Error ? error.message : 'Unknown SMTP error',
    };
  }
}
