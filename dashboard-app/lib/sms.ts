export interface SmsDeliveryResult {
  sent: boolean;
  error?: string;
  sid?: string;
}

interface SmsInput {
  to: string;
  message: string;
}

function normalizePhoneNumber(value: string): string {
  return value.replace(/[\s().-]/g, '');
}

function getTwilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromNumber = process.env.TWILIO_PHONE_NUMBER?.trim() || process.env.TWILIO_FROM_NUMBER?.trim();

  if (!accountSid || !authToken || !fromNumber) {
    return null;
  }

  return {
    accountSid,
    authToken,
    fromNumber: normalizePhoneNumber(fromNumber),
  };
}

export async function sendUsageAlertSms(input: SmsInput): Promise<SmsDeliveryResult> {
  const twilio = getTwilioConfig();
  if (!twilio) {
    return { sent: false, error: 'Twilio configuration is missing' };
  }

  const to = normalizePhoneNumber(input.to);
  if (!/^\+[1-9]\d{7,15}$/.test(to)) {
    return { sent: false, error: 'Recipient phone number must be in E.164 format' };
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilio.accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${twilio.accountSid}:${twilio.authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: new URLSearchParams({
          To: to,
          From: twilio.fromNumber,
          Body: input.message,
        }),
      }
    );

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return {
        sent: false,
        error: payload?.message || `Twilio request failed with status ${response.status}`,
      };
    }

    return {
      sent: true,
      sid: payload?.sid,
    };
  } catch (error) {
    return {
      sent: false,
      error: error instanceof Error ? error.message : 'Unknown Twilio error',
    };
  }
}
