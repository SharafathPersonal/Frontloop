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
  const apiVersion = env.GRAPH_API_VERSION || 'v22.0';
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

