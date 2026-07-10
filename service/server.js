require('dotenv').config();
const path = require('path');

// Load fallback `.env.local` from Next.js root if available
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const express = require('express');
const cors = require('cors');
const makeWASocket = require('@whiskeysockets/baileys').default || require('@whiskeysockets/baileys');
const {
  DisconnectReason,
  initAuthCreds,
  BufferJSON,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const { createClient } = require('@supabase/supabase-js');
const pino = require('pino');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();
app.use(express.json());

// 1. Strict Dynamic CORS Configuration
const allowedOrigin = process.env.NEXT_JS_FRONTEND_URL || 'http://localhost:3000';
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin === allowedOrigin || origin.startsWith('http://localhost:') || origin.startsWith('http://192.168.')) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by Secured CORS Policy Architecture'));
    }
  },
  credentials: true
}));

// 2. Strict Supabase Client Guard
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  logger.error("FATAL: Missing critical Supabase environment properties.");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// ── In-Memory Registries ───────────────────────────────────────────────────

/** Live socket instances keyed by shopId */
const activeSessions = new Map();

/** Tracks which shopIds have reached the 'open' state */
const connectionOpenSessions = new Set();

/** Reconnection timers to avoid race conditions */
const reconnectTimers = new Map();

/** Pending QR code resolvers: shopId -> array of resolve functions */
const qrResolvers = new Map();

// ── Helper functions ───────────────────────────────────────────────────────

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withTimeout = (promise, timeoutMs) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`Operation timed out after ${timeoutMs}ms`)),
        timeoutMs,
      ),
    ),
  ]);

const isSocketLive = (shopId) => {
  const sock = activeSessions.get(shopId);
  if (!sock) return false;

  const wsOpen = sock.ws?.readyState === 1 || sock.ws?.isOpen === true;
  const baileysOpen = connectionOpenSessions.has(shopId);

  return wsOpen && baileysOpen;
};

const waitForSocketOpen = (shopId, timeoutMs = 20_000) => {
  return new Promise((resolve) => {
    if (isSocketLive(shopId)) {
      resolve(true);
      return;
    }

    const POLL_MS = 500;
    const maxPolls = Math.ceil(timeoutMs / POLL_MS);
    let polls = 0;

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

// ── Baileys Supabase Auth Storage Layer ─────────────────────────────────────

const getSupabaseAuthState = async (shopId) => {
  const customReplacer = (k, v) => {
    if (v instanceof Uint8Array || v instanceof Buffer) {
      return { type: 'Buffer', data: Array.from(v) };
    }
    return BufferJSON.replacer(k, v);
  };

  const customReviver = (k, v) => {
    if (v && v.type === 'Buffer' && Array.isArray(v.data)) {
      return Buffer.from(v.data);
    }
    return BufferJSON.reviver(k, v);
  };

  const writeData = async (data, key) => {
    const { error } = await supabase.from('whatsapp_sessions').upsert(
      {
        shop_id: shopId,
        session_key: key,
        session_value: JSON.parse(JSON.stringify(data, customReplacer)),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'shop_id,session_key' },
    );
    if (error) {
      console.error(`[WA Engine] Failed to write session data for key ${key}:`, error.message);
    }
  };

  const readData = async (key) => {
    const { data } = await supabase
      .from('whatsapp_sessions')
      .select('session_value')
      .eq('shop_id', shopId)
      .eq('session_key', key)
      .maybeSingle();

    if (data?.session_value) {
      return JSON.parse(JSON.stringify(data.session_value), customReviver);
    }
    return null;
  };

  const removeData = async (key) => {
    await supabase
      .from('whatsapp_sessions')
      .delete()
      .eq('shop_id', shopId)
      .eq('session_key', key);
  };

  const credsData = await readData('creds');
  const creds = credsData || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
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
          const tasks = [];
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category]?.[id];
              const key = `${category}-${id}`;
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

// ── Connection Bootstrap Engine ────────────────────────────────────────────

const startWhatsAppEngine = async (shopId) => {
  // Clear any existing reconnect timer to avoid concurrent starts
  if (reconnectTimers.has(shopId)) {
    clearTimeout(reconnectTimers.get(shopId));
    reconnectTimers.delete(shopId);
  }

  // Pre-existing session check
  let existingSock = activeSessions.get(shopId);
  if (existingSock) {
    const wsOpen = existingSock.ws?.readyState === 1 || existingSock.ws?.isOpen === true;
    if (wsOpen && connectionOpenSessions.has(shopId)) {
      console.log(`[WA Engine] Engine for shop ${shopId} is already active and open.`);
      return existingSock;
    }
    // Clean up stale socket before restarting
    console.log(`[WA Engine] Cleaning up stale engine for shop ${shopId} before start.`);
    try { existingSock.ev.removeAllListeners(); } catch (e) {}
    try { existingSock.end(new Error('Atomic fresh start guard invoked')); } catch (e) {}
    try { existingSock.ws.close(); } catch (e) {}
    activeSessions.delete(shopId);
    connectionOpenSessions.delete(shopId);
  }

  const { state, saveCreds } = await getSupabaseAuthState(shopId);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger,
    keepAliveIntervalMs: 25_000,
    defaultQueryTimeoutMs: 60_000,
    retryRequestDelayMs: 250,
    browser: ['Mac OS', 'Chrome', '111.0.5563.64'],
  });

  activeSessions.set(shopId, sock);
  connectionOpenSessions.delete(shopId);

  // Credential updates listener
  sock.ev.on('creds.update', saveCreds);

  // Connection lifecycle listener (Self-Healing)
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log(`[WA Engine] QR generated for shop ${shopId}`);
      
      // Save QR to DB for settings page fallback polling
      await supabase.from('whatsapp_sessions').upsert(
        {
          shop_id: shopId,
          session_key: 'qr',
          session_value: { qr },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'shop_id,session_key' },
      );

      // Instantly resolve pending GET /connect calls with the raw QR code
      const resolvers = qrResolvers.get(shopId);
      if (resolvers && resolvers.length > 0) {
        resolvers.forEach((resolve) => resolve(qr));
        qrResolvers.set(shopId, []);
      }
    }

    if (connection === 'open') {
      console.log(`[WA Engine] Connection OPEN for shop ${shopId}`);
      connectionOpenSessions.add(shopId);
      
      // Update shops table with connected status
      await supabase.from('shops').update({ qr_express_status: 'connected' }).eq('id', shopId);
      
      // Clear QR code from session store
      await supabase.from('whatsapp_sessions').delete()
        .eq('shop_id', shopId).eq('session_key', 'qr');

      // Resolve pending GET /connect calls as connected status
      const resolvers = qrResolvers.get(shopId);
      if (resolvers && resolvers.length > 0) {
        resolvers.forEach((resolve) => resolve("CONNECTED"));
        qrResolvers.set(shopId, []);
      }
    }

    if (connection === 'close') {
      connectionOpenSessions.delete(shopId);

      const error = lastDisconnect?.error;
      const statusCode = error?.output?.statusCode || error?.output?.payload?.statusCode;

      if (statusCode === DisconnectReason.loggedOut) {
        // Explicit logout -> Purge all auth tokens & reset shop fields
        console.error(`[WA Engine] Shop ${shopId} logged out explicitly (code ${statusCode}). Purging session.`);

        activeSessions.delete(shopId);
        connectionOpenSessions.delete(shopId);

        await supabase.from('shops').update({
          whatsapp_mode: 'NONE',
          qr_express_status: 'disconnected',
        }).eq('id', shopId);

        await supabase.from('whatsapp_sessions').delete().eq('shop_id', shopId);

        // Pause campaigns
        await supabase.from('campaigns')
          .update({ status: 'paused_logout' })
          .eq('shop_id', shopId)
          .eq('status', 'processing')
          .eq('dispatch_mode', 'QR_EXPRESS');

        // Resolve pending GET /connect calls
        const resolvers = qrResolvers.get(shopId);
        if (resolvers && resolvers.length > 0) {
          resolvers.forEach((resolve) => resolve("DISCONNECTED"));
          qrResolvers.set(shopId, []);
        }
      } else {
        // Transient network drop -> Self-Healing reconnect in 2.5 seconds
        console.warn(
          `[WA Engine] Connection closed for shop ${shopId} (code ${statusCode}). ` +
          `Reconnecting in 2.5 seconds…`,
        );
        
        if (reconnectTimers.has(shopId)) {
          clearTimeout(reconnectTimers.get(shopId));
        }
        
        const timer = setTimeout(() => {
          reconnectTimers.delete(shopId);
          startWhatsAppEngine(shopId).catch(err => {
            console.error(`[WA Engine] Reconnection failed for shop ${shopId}:`, err);
          });
        }, 2500);
        
        reconnectTimers.set(shopId, timer);
      }
    }
  });

  return sock;
};

const ensureSocketLive = async (shopId, timeoutMs = 20_000) => {
  let sock = activeSessions.get(shopId);
  const isDown = !sock || sock.ws?.readyState !== 1 || !connectionOpenSessions.has(shopId);

  if (isDown) {
    console.log(`[WA Engine] Socket for shop ${shopId} is down or not authenticated. Bootstrapping connection...`);
    
    if (sock) {
      try { sock.ev.removeAllListeners('connection.update'); } catch {}
      try { sock.ws.close(); } catch {}
      activeSessions.delete(shopId);
      connectionOpenSessions.delete(shopId);
    }

    await startWhatsAppEngine(shopId);
    
    const opened = await waitForSocketOpen(shopId, timeoutMs);
    if (!opened) {
      console.error(`[WA Engine] Re-connection timed out for shop ${shopId} after ${timeoutMs}ms`);
      return null;
    }
  }
  return activeSessions.get(shopId) || null;
};

// ── REST API Endpoints ─────────────────────────────────────────────────────

const initializingShops = {};

// Endpoint 1: Connect / Initialize Engine & Return QR Code
app.get('/api/whatsapp/connect', async (req, res) => {
  const { shop_id } = req.query;
  if (!shop_id) {
    return res.status(400).json({ ok: false, error: 'Missing shop_id parameter' });
  }

  if (initializingShops[shop_id]) {
    return res.status(429).json({ ok: false, error: 'Engine initialization already in progress.' });
  }

  try {
    initializingShops[shop_id] = true;
    // If already connected
    if (isSocketLive(shop_id)) {
      delete initializingShops[shop_id];
      return res.status(200).json({ ok: true, status: "connected", qr: null });
    }

    // Initialize/Ensure engine starts up
    startWhatsAppEngine(shop_id).catch(err => {
      console.error(`[WA Engine] Connect request engine start error:`, err);
    });

    // Check if there is already a QR code generated in DB
    const { data: qrSession } = await supabase
      .from('whatsapp_sessions')
      .select('session_value')
      .eq('shop_id', shop_id)
      .eq('session_key', 'qr')
      .maybeSingle();

    const dbQr = qrSession?.session_value?.qr;
    if (dbQr) {
      delete initializingShops[shop_id];
      return res.status(200).json({ ok: true, status: "qr_ready", qr: dbQr });
    }

    // Wait up to 10 seconds for the next QR code event to fire
    const qrCodeString = await new Promise((resolve) => {
      if (!qrResolvers.has(shop_id)) {
        qrResolvers.set(shop_id, []);
      }
      qrResolvers.get(shop_id).push(resolve);

      setTimeout(() => {
        resolve("");
      }, 10000);
    });

    if (qrCodeString && qrCodeString !== "CONNECTED" && qrCodeString !== "DISCONNECTED") {
      delete initializingShops[shop_id];
      return res.status(200).json({ ok: true, status: "qr_ready", qr: qrCodeString });
    }

    // Double-check if opened in the meantime
    if (isSocketLive(shop_id) || qrCodeString === "CONNECTED") {
      delete initializingShops[shop_id];
      return res.status(200).json({ ok: true, status: "connected", qr: null });
    }

    delete initializingShops[shop_id];
    return res.status(200).json({ ok: true, status: "disconnected", qr: null });
  } catch (error) {
    delete initializingShops[shop_id];
    console.error(`[Connect Endpoint Error] shop_id: ${shop_id}, error:`, error);
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Endpoint 2: Connection Status
app.get('/api/whatsapp/status', async (req, res) => {
  const { shop_id } = req.query;
  if (!shop_id) {
    return res.status(400).json({ error: 'Missing shop_id parameter' });
  }

  let status = 'DISCONNECTED';
  if (isSocketLive(shop_id)) {
    status = 'CONNECTED';
  } else if (activeSessions.has(shop_id)) {
    status = 'CONNECTING';
  }

  let qr = null;
  if (status !== 'CONNECTED') {
    try {
      const { data: qrSession } = await supabase
        .from('whatsapp_sessions')
        .select('session_value')
        .eq('shop_id', shop_id)
        .eq('session_key', 'qr')
        .maybeSingle();
      if (qrSession?.session_value?.qr) {
        qr = qrSession.session_value.qr;
      }
    } catch (err) {
      console.error('Error fetching fallback QR:', err);
    }
  }

  return res.json({ status, qr });
});

// Endpoint 3: Send Message Gateway Relay
app.post('/api/whatsapp/send-message', async (req, res) => {
  const { shop_id, to, message } = req.body;
  if (!shop_id || !to || !message) {
    return res.status(400).json({ error: 'Missing required parameters: shop_id, to, message' });
  }

  try {
    const sock = await ensureSocketLive(shop_id, 15000);
    if (!sock || !isSocketLive(shop_id)) {
      return res.status(503).json({ error: 'WhatsApp socket connection is offline' });
    }

    const recipientJid = `${to.split('@')[0]}@s.whatsapp.net`;

    // Dispatch message with 12s timeout
    const sendReceipt = await withTimeout(
      sock.sendMessage(recipientJid, { text: message }),
      12000
    );

    return res.json({
      ok: true,
      log: sendReceipt
    });
  } catch (error) {
    console.error(`[Send Message Error] shop_id: ${shop_id}, to: ${to}, error:`, error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// ── Active Sessions Hydration ──────────────────────────────────────────────

const hydrateActiveSessions = async () => {
  console.log('[WA Engine] Starting auto-hydration of active WhatsApp sessions...');
  try {
    const { data: shops, error } = await supabase
      .from('shops')
      .select('id')
      .eq('whatsapp_mode', 'QR_EXPRESS')
      .eq('qr_express_status', 'connected');

    if (error) {
      throw error;
    }

    if (shops && shops.length > 0) {
      console.log(`[WA Engine] Found ${shops.length} active sessions to hydrate.`);
      for (const shop of shops) {
        console.log(`[WA Engine] Hydrating session for shop: ${shop.id}`);
        startWhatsAppEngine(shop.id).catch((err) => {
          console.error(`[WA Engine] Hydration failed for shop ${shop.id}:`, err);
        });
      }
    } else {
      console.log('[WA Engine] No active sessions found to hydrate.');
    }
  } catch (err) {
    console.error('[WA Engine] Failed to auto-hydrate sessions:', err);
  }
};

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`WhatsApp Edge Engine running flawlessly on port ${PORT}`);
  hydrateActiveSessions();
});

module.exports = {
  activeSessions,
  connectionOpenSessions,
  isSocketLive,
  waitForSocketOpen,
  getSupabaseAuthState,
  startWhatsAppEngine,
  ensureSocketLive,
};
