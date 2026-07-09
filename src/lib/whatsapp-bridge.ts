import { Boom } from '@hapi/boom';
import makeWASocket, { 
  DisconnectReason, 
  AuthenticationCreds, 
  SignalDataTypeMap,
  initAuthCreds,
  BufferJSON,
  AuthenticationState
} from '@whiskeysockets/baileys';
import pino from 'pino';
import type { SupabaseClient } from '@supabase/supabase-js';

const logger = pino({ level: 'silent' });

/**
 * Robust Baileys Auth State synced atomically to Supabase.
 */
export const getSupabaseAuthState = async (
  shopId: string, 
  supabase: SupabaseClient
): Promise<{ state: AuthenticationState, saveCreds: () => Promise<void> }> => {
  const writeData = async (data: unknown, key: string) => {
    await supabase.from('whatsapp_sessions').upsert({
      shop_id: shopId,
      session_key: key,
      session_value: JSON.parse(JSON.stringify(data, BufferJSON.replacer)) as Record<string, unknown>,
      updated_at: new Date().toISOString()
    }, { onConflict: 'shop_id, session_key' });
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
            })
          );
          return data;
        },
        set: async (data) => {
          const tasks: Promise<void>[] = [];
          for (const category in data) {
            for (const id in data[category as keyof SignalDataTypeMap]) {
              const value = data[category as keyof SignalDataTypeMap]?.[id];
              const key = `${category}-${id}`;
              if (value) {
                tasks.push(writeData(value, key));
              } else {
                tasks.push(removeData(key));
              }
            }
          }
          await Promise.all(tasks);
        }
      }
    },
    saveCreds: () => writeData(creds, 'creds')
  };
};

// Global in-memory registry of active sockets (for hot container reuse)
export const activeSessions = new Map<string, ReturnType<typeof makeWASocket>>();

export const getWhatsAppSocket = async (shopId: string, supabase: SupabaseClient) => {
  let sock = activeSessions.get(shopId);
  if (!sock) {
    sock = await startWhatsAppEngine(shopId, supabase);
  }
  return sock;
};

/**
 * Bulletproof WhatsApp Web Connection Engine
 */
export const startWhatsAppEngine = async (shopId: string, supabase: SupabaseClient) => {
  const { state, saveCreds } = await getSupabaseAuthState(shopId, supabase);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger,
    keepAliveIntervalMs: 25000, // Live Connection Heartbeat (Ping)
    defaultQueryTimeoutMs: 60000,
    retryRequestDelayMs: 250,
  });

  // Track the active socket in-memory
  activeSessions.set(shopId, sock);

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log(`[WhatsApp Engine] New QR code generated for Shop ${shopId}`);
      await supabase.from('whatsapp_sessions').upsert({
        shop_id: shopId,
        session_key: 'qr',
        session_value: { qr },
        updated_at: new Date().toISOString()
      }, { onConflict: 'shop_id, session_key' });
    }

    if (connection === 'close') {
      const error = lastDisconnect?.error as Boom;
      const statusCode = error?.output?.statusCode;
      const reason = statusCode;

      if (reason === DisconnectReason.loggedOut) {
        // GRACEFUL LOGOUT & QUEUE PAUSING MANAGEMENT
        console.error(`[WhatsApp Engine] Shop ${shopId} explicitly logged out.`);
        
        // 1. Immediately update database status to NONE / DISCONNECTED
        await supabase.from('shops').update({ 
          whatsapp_mode: 'NONE',
          qr_express_status: 'disconnected' // Alert trigger
        }).eq('id', shopId);

        // 2. Clear credentials from database securely
        await supabase.from('whatsapp_sessions').delete().eq('shop_id', shopId);

        // 3. Pause active broadcast campaigns
        await supabase.from('campaigns')
          .update({ status: 'paused_logout' })
          .eq('shop_id', shopId)
          .eq('status', 'processing')
          .eq('dispatch_mode', 'QR_EXPRESS');

        // 4. Remove active socket session from map
        activeSessions.delete(shopId);

      } else {
        // Temporary network drop -> Silent reconnect strategy
        console.log(`[WhatsApp Engine] Connection closed for Shop ${shopId}, reconnecting... Reason: ${reason}`);
        setTimeout(() => startWhatsAppEngine(shopId, supabase), 5000);
      }
    } else if (connection === 'open') {
      console.log(`[WhatsApp Engine] Connected successfully for Shop ${shopId}`);
      await supabase.from('shops').update({ qr_express_status: 'connected' }).eq('id', shopId);
      await supabase.from('whatsapp_sessions').delete().eq('shop_id', shopId).eq('session_key', 'qr');
    }
  });

  return sock;
};
