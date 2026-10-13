import 'server-only';
import { getEnv } from './env';

export interface MetaGraphError {
  message: string;
  type: string;
  code: number;
  error_subcode?: number;
  fbtrace_id?: string;
}

export interface SendWhatsAppTextResult {
  ok: boolean;
  messageId?: string;
  error?: MetaGraphError;
  status: number;
}

/**
 * Sends outbound text message to a user via Meta Graph API.
 * Uses native fetch with 10s AbortSignal timeout.
 * Gracefully captures errors (e.g., 131047 outside 24h window, 190 expired/invalid token).
 */
export async function sendWhatsAppText(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  body: string,
): Promise<SendWhatsAppTextResult> {
  const env = getEnv();
  const apiVersion = env.GRAPH_API_VERSION;
  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: {
      preview_url: false,
      body,
    },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const graphError: MetaGraphError = data?.error ?? {
        message: `HTTP ${res.status}: ${res.statusText}`,
        type: 'GraphAPIError',
        code: res.status,
      };

      console.warn(
        `[Meta Graph API error] Status: ${res.status}, Code: ${graphError.code}, Subcode: ${graphError.error_subcode}, Message: ${graphError.message}`,
      );

      return {
        ok: false,
        error: graphError,
        status: res.status,
      };
    }

    const messageId = data?.messages?.[0]?.id;
    return {
      ok: true,
      messageId,
      status: res.status,
    };
  } catch (err: unknown) {
    const isTimeout =
      err instanceof DOMException && err.name === 'TimeoutError';
    const message = isTimeout
      ? 'Meta Graph API call timed out after 10000ms'
      : err instanceof Error
        ? err.message
        : 'Unknown network error';

    console.error(`[Meta Graph API network failure] ${message}`);

    return {
      ok: false,
      error: {
        message,
        type: isTimeout ? 'TimeoutError' : 'NetworkError',
        code: isTimeout ? 408 : 500,
      },
      status: isTimeout ? 408 : 500,
    };
  }
}


export type LinkWhatsAppResult =
  | { ok: true; displayPhoneNumber: string; verifiedName: string }
  | { ok: false; error: string };

const GRAPH_TIMEOUT_MS = 10000;

/** Maps Graph error codes to merchant-facing guidance; raw Meta messages stay in server logs. */
function describeGraphError(error: MetaGraphError | undefined, status: number): string {
  switch (error?.code) {
    case 190:
      return 'Meta rejected the access token. It is invalid or expired. Generate a permanent System User token and try again.';
    case 10:
    case 200:
      return 'The access token is missing WhatsApp permissions. Grant whatsapp_business_messaging and whatsapp_business_management to the System User.';
    case 100:
      return 'Meta could not find that Phone Number ID for this token. Check the ID in WhatsApp Manager → API Setup.';
    case 4:
    case 80007:
      return 'Meta is rate limiting requests for this account. Wait a few minutes and try again.';
    default:
      return status >= 500 || status === 408
        ? 'Could not reach Meta right now. Please try again in a minute.'
        : 'Meta rejected these credentials. Check the IDs and token and try again.';
  }
}

async function graphRequest(
  path: string,
  accessToken: string,
  method: 'GET' | 'POST' = 'GET',
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> {
  const url = `https://graph.facebook.com/${getEnv().GRAPH_API_VERSION}/${path}`;
  try {
    // Bearer header rather than ?access_token= so the token never lands in URL logs.
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(GRAPH_TIMEOUT_MS),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const graphError: MetaGraphError | undefined = data?.error;
      console.warn(`[Meta Graph API] ${method} ${path.split('?')[0]} -> ${res.status}, code ${graphError?.code}: ${graphError?.message}`);
      return { ok: false, error: describeGraphError(graphError, res.status) };
    }
    return { ok: true, data: data ?? {} };
  } catch (err: unknown) {
    console.error(`[Meta Graph API network failure] ${err instanceof Error ? err.message : err}`);
    return { ok: false, error: 'Could not reach Meta right now. Please try again in a minute.' };
  }
}

/**
 * Live handshake run before credentials are stored: the token must read the phone
 * number, the number must belong to the WABA, and the app is subscribed to the
 * WABA so inbound messages reach our webhook. The subscription call is idempotent.
 */
export async function linkWhatsAppNumber(
  phoneNumberId: string,
  wabaId: string,
  accessToken: string,
): Promise<LinkWhatsAppResult> {
  const [phone, wabaNumbers] = await Promise.all([
    graphRequest(`${phoneNumberId}?fields=display_phone_number,verified_name`, accessToken),
    graphRequest(`${wabaId}/phone_numbers?fields=id&limit=100`, accessToken),
  ]);
  if (!phone.ok) return phone;
  if (!wabaNumbers.ok) return wabaNumbers;

  const numbers = Array.isArray(wabaNumbers.data.data) ? (wabaNumbers.data.data as Array<{ id?: unknown }>) : [];
  if (!numbers.some((n) => n.id === phoneNumberId)) {
    return { ok: false, error: 'This Phone Number ID does not belong to that WhatsApp Business Account ID.' };
  }

  const subscribe = await graphRequest(`${wabaId}/subscribed_apps`, accessToken, 'POST');
  if (!subscribe.ok) return subscribe;

  return {
    ok: true,
    displayPhoneNumber: typeof phone.data.display_phone_number === 'string' ? phone.data.display_phone_number : '',
    verifiedName: typeof phone.data.verified_name === 'string' ? phone.data.verified_name : '',
  };
}
