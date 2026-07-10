/**
 * TRUE ATTENDLY — WhatsApp Bridge (Baileys Engine)
 *
 * ARCHITECTURE NOTES:
 *
 * 1. SERVERLESS SOCKET REGISTRY
 *    `activeSessions` is an in-memory Map. In a long-running Node.js server
 *    (self-hosted / Railway / DigitalOcean) this persists across requests.
 *    On Vercel Serverless, each cold start gets an empty Map — the socket is
 *    rebuilt from Supabase-persisted credentials on first use, then cached
 *    for the duration of the warm container.
 *
 * 2. LIVENESS MODEL
 *    A socket is "live" only when BOTH conditions are true:
 *      a) sock.ws.readyState === WebSocket.OPEN (transport layer open)
 *      b) the Baileys connection state is 'open' (protocol authenticated)
 *    We track (b) via the `connectionOpenSessions` Set, populated inside the
 *    'connection.update' event handler when connection === 'open'.
 *
 * 3. CREDENTIAL SAVE BUG FIX
 *    The onConflict clause must NOT have a space: 'shop_id,session_key'
 *    (space causes Supabase to silently ignore the upsert → credentials
 *    are never saved → every cold start prompts a new QR scan).
 */

import { Boom } from '@hapi/boom';
import makeWASocket, {
  DisconnectReason,
  AuthenticationCreds,
  SignalDataTypeMap,
  initAuthCreds,
  BufferJSON,
  AuthenticationState,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import type { SupabaseClient } from '@supabase/supabase-js';

// Silent logger — Baileys is very noisy at default level
const logger = pino({ level: 'silent' });

// ── In-memory registries ────────────────────────────────────────────────────

/** Live socket instances keyed by shopId */
export const activeSessions = new Map<string, ReturnType<typeof makeWASocket>>();

/**
 * Tracks which shopIds have reached the 'open' (fully authenticated) state.
 * A socket in `activeSessions` but NOT in this set is still handshaking.
 */
export const connectionOpenSessions = new Set<string>();

// ── Auth State (Supabase-persisted) ────────────────────────────────────────

export const getSupabaseAuthState = async (
  shopId: string,
  supabase: SupabaseClient,
): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> => {

  const writeData = async (data: unknown, key: string) => {
    await supabase.from('whatsapp_sessions').upsert(
      {
        shop_id:       shopId,
        session_key:   key,
        session_value: JSON.parse(JSON.stringify(data, BufferJSON.replacer)) as Record<string, unknown>,
        updated_at:    new Date().toISOString(),
      },
      // ⚠️ NO SPACE — Supabase requires comma-separated, no spaces
      { onConflict: 'shop_id,session_key' },
    );
  };

  const readData = async (key: string) => {
    const { data } = await supabase
      .from('whatsapp_sessions')
      .select('session_value')
      .eq('shop_id', shopId)
      .eq('session_key', key)
      .maybeSingle();

    if (data?.session_value) {
      return JSON.parse(JSON.stringify(data.session_value), BufferJSON.reviver);
    }
    return null;
  };

  const removeData = async (key: string) => {
    await supabase
      .from('whatsapp_sessions')
      .delete()
      .eq('shop_id', shopId)
      .eq('session_key', key);
  };

  const credsData = await readData('creds');
  const creds: AuthenticationCreds = credsData || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data: { [key: string]: any } = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`);
              if (type === 'app-state-sync-key' && value) {
                value = Buffer.from(value.data || value);
              }
              data[id] = value;
            }),
          );
          return data;
        },
        set: async (data) => {
          const tasks: Promise<void>[] = [];
          for (const category in data) {
            for (const id in data[category as keyof SignalDataTypeMap]) {
              const value = data[category as keyof SignalDataTypeMap]?.[id];
              const key   = `${category}-${id}`;
              if (value) {
                tasks.push(writeData(value, key));
              } else {
                tasks.push(removeData(key));
              }
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: () => writeData(creds, 'creds'),
  };
};

// ── Liveness helpers ────────────────────────────────────────────────────────

/**
 * Returns true ONLY when the socket exists, the WS transport is OPEN (readyState 1),
 * AND Baileys has confirmed the connection reached 'open' state (fully authenticated).
 */
export const isSocketLive = (shopId: string): boolean => {
  const sock = activeSessions.get(shopId);
  if (!sock) return false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wsOpen = (sock as any).ws?.readyState === 1 || (sock as any).ws?.isOpen === true;
  const baileysOpen = connectionOpenSessions.has(shopId);

  return wsOpen && baileysOpen;
};

/**
 * Waits up to `timeoutMs` milliseconds for the socket to reach fully-open state.
 * Polls every 500 ms. Useful after a cold-start socket creation.
 * Returns true if open within timeout, false otherwise.
 */
export const waitForSocketOpen = (shopId: string, timeoutMs = 20_000): Promise<boolean> => {
  return new Promise((resolve) => {
    if (isSocketLive(shopId)) {
      resolve(true);
      return;
    }

    const POLL_MS  = 500;
    const maxPolls = Math.ceil(timeoutMs / POLL_MS);
    let   polls    = 0;

    const interval = setInterval(() => {
      polls++;
      if (isSocketLive(shopId)) {
        clearInterval(interval);
        resolve(true);
        return;
      }
      if (polls >= maxPolls) {
        clearInterval(interval);
        resolve(false);
      }
    }, POLL_MS);
  });
};

// ── Socket resolution ───────────────────────────────────────────────────────

/**
 * Returns the live, authenticated Baileys socket for the given shop.
 *
 * - If a live socket exists in the registry → returns it immediately.
 * - If none exists → starts the engine, waits up to timeoutMs for authentication,
 *   then returns the socket (caller must check isSocketLive() after return).
 */
export const getWhatsAppSocket = async (
  shopId: string,
  supabase: SupabaseClient,
  timeoutMs = 20_000,
): Promise<ReturnType<typeof makeWASocket> | null> => {
  // Return cached live socket immediately
  if (isSocketLive(shopId)) {
    return activeSessions.get(shopId)!;
  }

  // Socket exists but not yet open (handshaking) — wait for it
  if (activeSessions.has(shopId)) {
    const opened = await waitForSocketOpen(shopId, timeoutMs);
    return opened ? activeSessions.get(shopId)! : null;
  }

  // No socket at all — bootstrap from persisted credentials
  await startWhatsAppEngine(shopId, supabase);

  // Wait for the newly created socket to reach 'open'
  const opened = await waitForSocketOpen(shopId, timeoutMs);
  return opened ? activeSessions.get(shopId)! : null;
};

/**
 * Ensures that a socket is active, open, and fully authenticated.
 * If not, it will bootstrap/reconnect the socket, blocking until connection open.
 */
export const ensureSocketLive = async (
  shopId: string,
  supabase: SupabaseClient,
  timeoutMs = 20_000,
): Promise<ReturnType<typeof makeWASocket> | null> => {
  let sock = activeSessions.get(shopId);
  const isDown = !sock || (sock as any).ws?.isOpen !== true || !connectionOpenSessions.has(shopId);

  if (isDown) {
    console.log(`[WA Engine] Socket for shop ${shopId} is down/disconnected (isOpen !== true or not authenticated). Re-authenticating...`);
    
    // Evict old session to avoid stale handlers/state
    if (sock) {
      try { sock.ev.removeAllListeners('connection.update'); } catch {}
      try { sock.ws.close(); } catch {}
      activeSessions.delete(shopId);
      connectionOpenSessions.delete(shopId);
    }
    
    // Initialize new socket (reads credentials and calls makeWASocket)
    await startWhatsAppEngine(shopId, supabase);
    
    // Block until connection.update event fires a successful 'open' state
    const opened = await waitForSocketOpen(shopId, timeoutMs);
    if (!opened) {
      console.error(`[WA Engine] Re-connection handshake timed out for shop ${shopId} after ${timeoutMs}ms`);
      return null;
    }
  }
  return activeSessions.get(shopId) || null;
};


// ── Engine bootstrap ────────────────────────────────────────────────────────

/**
 * Creates a new Baileys socket, registers all event handlers, and stores
 * it in `activeSessions`. Does NOT block until 'open' — use waitForSocketOpen().
 */
export const startWhatsAppEngine = async (
  shopId: string,
  supabase: SupabaseClient,
): Promise<ReturnType<typeof makeWASocket>> => {
  const { state, saveCreds } = await getSupabaseAuthState(shopId, supabase);

  const sock = makeWASocket({
    auth:                  state,
    printQRInTerminal:     false,
    logger,
    keepAliveIntervalMs:   25_000,  // WS ping heartbeat
    defaultQueryTimeoutMs: 60_000,
    retryRequestDelayMs:   250,
  });

  // Register in registry immediately (before 'open' event)
  activeSessions.set(shopId, sock);
  // Remove from open set — it's handshaking, not yet confirmed open
  connectionOpenSessions.delete(shopId);

  // ── Credential persistence ──────────────────────────────────────────────
  sock.ev.on('creds.update', saveCreds);

  // ── Connection lifecycle ────────────────────────────────────────────────
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // New QR code → persist to Supabase for the Settings QR scanner
    if (qr) {
      console.log(`[WA Engine] QR generated for shop ${shopId}`);
      await supabase.from('whatsapp_sessions').upsert(
        {
          shop_id:       shopId,
          session_key:   'qr',
          session_value: { qr },
          updated_at:    new Date().toISOString(),
        },
        // ⚠️ NO SPACE
        { onConflict: 'shop_id,session_key' },
      );
    }

    if (connection === 'open') {
      // ── Fully authenticated ────────────────────────────────────────────
      console.log(`[WA Engine] Connection OPEN for shop ${shopId}`);
      connectionOpenSessions.add(shopId);
      await supabase.from('shops').update({ qr_express_status: 'connected' }).eq('id', shopId);
      // Clear QR code from session store — no longer needed
      await supabase.from('whatsapp_sessions').delete()
        .eq('shop_id', shopId).eq('session_key', 'qr');
    }

    if (connection === 'close') {
      // Mark as not open immediately
      connectionOpenSessions.delete(shopId);

      const error      = lastDisconnect?.error as Boom;
      const statusCode = error?.output?.statusCode;

      if (statusCode === DisconnectReason.loggedOut) {
        // ── Explicit logout — purge everything ──────────────────────────
        console.error(`[WA Engine] Shop ${shopId} logged out. Purging session.`);

        activeSessions.delete(shopId);
        connectionOpenSessions.delete(shopId);

        await supabase.from('shops').update({
          whatsapp_mode:     'NONE',
          qr_express_status: 'disconnected',
        }).eq('id', shopId);

        await supabase.from('whatsapp_sessions').delete().eq('shop_id', shopId);

        // Pause any in-flight QR Express campaigns
        await supabase.from('campaigns')
          .update({ status: 'paused_logout' })
          .eq('shop_id', shopId)
          .eq('status', 'processing')
          .eq('dispatch_mode', 'QR_EXPRESS');

      } else {
        // ── Transient network drop — attempt silent reconnect ───────────
        console.warn(
          `[WA Engine] Connection closed for shop ${shopId} (code ${statusCode}). ` +
          `Reconnecting in 5 s…`,
        );
        setTimeout(() => startWhatsAppEngine(shopId, supabase), 5_000);
      }
    }
  });

  return sock;
};
