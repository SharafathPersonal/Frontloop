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

// 1. Strict Dynamic CORS Configuration (Fixed for perfect Localhost testing)
const allowedOrigin = process.env.NEXT_JS_FRONTEND_URL || 'http://localhost:3000';
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin === allowedOrigin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:') || origin.startsWith('http://192.168.')) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by Secured CORS Policy Architecture'));
    }
  },
  credentials: true
}));

// 2. Strict Supabase Client Guard
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  logger.error("FATAL: Missing critical Supabase environment properties.");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// ── In-Memory Registries ───────────────────────────────────────────────────
const activeSessions = new Map();
const connectionOpenSessions = new Set();
const reconnectTimers = new Map();
const qrResolvers = new Map();
const initializingShops = {};
const messageStatusStore = new Map();


// ── Helper functions ───────────────────────────────────────────────────────
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withTimeout = (promise, timeoutMs) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);

const isSocketLive = (shopId) => {
  const sock = activeSessions.get(shopId);
  if (!sock) return false;
  const wsOpen = sock.ws?.readyState === 1 || sock.ws?.isOpen === true;
  const baileysOpen = connectionOpenSessions.has(shopId);
  return wsOpen && baileysOpen;
};

const waitForSocketOpen = (shopId, timeoutMs = 25_000) => {
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

const fixBuffers = (obj) => {
  if (!obj) return obj;
  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return Buffer.from(obj.data);
  }
  if (typeof obj === 'object') {
    for (const key in obj) {
      if (obj[key] && obj[key].type === 'Buffer' && Array.isArray(obj[key].data)) {
        obj[key] = Buffer.from(obj[key].data);
      } else if (typeof obj[key] === 'object') {
        obj[key] = fixBuffers(obj[key]);
      }
    }
  }
  return obj;
};

const getSupabaseAuthState = async (shopId) => {
  const customReplacer = (k, v) => {
    if (v instanceof Uint8Array || v instanceof Buffer || (v && v.type === 'Buffer')) {
      return { type: 'Buffer', data: Array.from(v.data || v) };
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
    const serializedValue = JSON.parse(JSON.stringify(data, customReplacer));
    const { error } = await supabase.from('whatsapp_sessions').upsert(
      {
        shop_id: shopId,
        session_key: key,
        session_value: serializedValue,
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
      let parsed = JSON.parse(JSON.stringify(data.session_value), customReviver);
      return fixBuffers(parsed);
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
    purgeEntireSession: async () => {
      console.log(`[WA Engine] Executing complete session wipe for shop ${shopId} due to fatal corruption.`);
      await supabase.from('whatsapp_sessions').delete().eq('shop_id', shopId);
    }
  };
};

// ── Connection Bootstrap Engine (Multi-Device Optimized) ───────────────────

const startWhatsAppEngine = async (shopId) => {
  if (reconnectTimers.has(shopId)) {
    clearTimeout(reconnectTimers.get(shopId));
    reconnectTimers.delete(shopId);
  }

  let existingSock = activeSessions.get(shopId);
  if (existingSock) {
    const wsOpen = existingSock.ws?.readyState === 1 || existingSock.ws?.isOpen === true;
    if (wsOpen && connectionOpenSessions.has(shopId)) {
      console.log(`[WA Engine] Engine for shop ${shopId} is already active.`);
      return existingSock;
    }
    console.log(`[WA Engine] Cleaning up stale engine for shop ${shopId} before start.`);
    try { existingSock.ev.removeAllListeners(); } catch (e) {}
    try { existingSock.end(new Error('Atomic fresh start guard invoked')); } catch (e) {}
    activeSessions.delete(shopId);
    connectionOpenSessions.delete(shopId);
  }

  const { state, saveCreds, purgeEntireSession } = await getSupabaseAuthState(shopId);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger,
    keepAliveIntervalMs: 30_000,       // Boosted for strong connection holding
    defaultQueryTimeoutMs: 120_000,    // 120s Extended timeout for all device history syncing 🎯
    retryRequestDelayMs: 500,          // Balanced retry delay
    browser: ['Ubuntu', 'Chrome', '22.04.4'],
  });

  activeSessions.set(shopId, sock);
  connectionOpenSessions.delete(shopId);

  sock.ev.on('creds.update', saveCreds);

  const handleMessageRead = async (metaMessageId) => {
    if (!metaMessageId) return;
    try {
      // 1. Resolve campaign mapping via message_logs
      const { data: logData, error: fetchError } = await supabase
        .from('message_logs')
        .select('campaign_id, status')
        .eq('meta_message_id', metaMessageId)
        .maybeSingle();

      if (fetchError || !logData?.campaign_id) return;
      const campaignId = logData.campaign_id;

      // Prevent duplicate increments if status already matched
      if (logData.status?.toUpperCase() === 'READ') return;

      // 2. Update the database status to 'READ' instantly
      const { error: updateError } = await supabase
        .from('message_logs')
        .update({ status: 'READ' })
        .eq('meta_message_id', metaMessageId);

      if (updateError) {
        console.error(`[DB Receipt Error] Failed to update read state:`, updateError.message);
        return;
      }

      console.log(`[DB Receipt Success] Message ${metaMessageId} successfully updated to READ.`);

      // 3. Increment Campaign Aggregates atomically via RPC
      const { error: rpcError } = await supabase.rpc('increment_campaign_metric', {
        campaign_row_id: campaignId,
        metric_name: 'read',
        quantity: 1
      });

      if (rpcError) {
        console.error(`[WA Engine] Failed to increment read metric for campaign ${campaignId}:`, rpcError.message);
      }
    } catch (err) {
      console.error(`[WA Engine] Exception handling message receipt update:`, err);
    }
  };

  // ── Message receipts (Blue Ticks tracking) ──────────────────────────────
  sock.ev.on('message-receipt.update', async (receipts) => {
    for (const receipt of receipts) {
      const id = receipt.key.id;
      if (id) {
        let shopMap = messageStatusStore.get(shopId);
        if (!shopMap) {
          shopMap = new Map();
          messageStatusStore.set(shopId, shopMap);
        }
        if (receipt.receiptType === 'read') {
          shopMap.set(id, 4); // 4 = READ
        } else if (!shopMap.has(id)) {
          shopMap.set(id, 3); // 3 = DELIVERED
        }
      }
      if (receipt.receiptType === 'read') {
        console.log(`[BAILEYS AUDIT] Message read by user. Message ID: ${receipt.key.id}`);
        await handleMessageRead(receipt.key.id);
      }
    }
  });

  // ── Messages status updates (delivery + read tracking) ─────────────────
  sock.ev.on('messages.update', async (updates) => {
    for (const update of updates) {
      const id = update.key.id;
      const status = update.update.status;
      if (id && status !== undefined) {
        let shopMap = messageStatusStore.get(shopId);
        if (!shopMap) {
          shopMap = new Map();
          messageStatusStore.set(shopId, shopMap);
        }
        shopMap.set(id, status);
      }
      // 4 = READ (blue tick) — update DB immediately
      if (status === 4 || status === 'read') {
        console.log(`[BAILEYS AUDIT] Message read. ID: ${update.key.id}`);
        await handleMessageRead(update.key.id);
      }
      // 3 = DELIVERY_ACK — update DB to 'delivered' immediately
      else if (status === 3) {
        if (!update.key.id) continue;
        try {
          const { data: logRow } = await supabase
            .from('message_logs')
            .select('status')
            .eq('meta_message_id', update.key.id)
            .maybeSingle();
          const current = logRow?.status?.toLowerCase();
          if (current && current !== 'delivered' && current !== 'read') {
            await supabase
              .from('message_logs')
              .update({ status: 'delivered' })
              .eq('meta_message_id', update.key.id);
            console.log(`[BAILEYS AUDIT] Message delivered. ID: ${update.key.id}`);
          }
        } catch (err) {
          console.error(`[WA Engine] Failed to write delivered status:`, err);
        }
      }
    }
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Handle Unhandled Noise Handshake Error (TypeError Fix)
    if (
      lastDisconnect?.error && 
      lastDisconnect.error.name === 'TypeError' && 
      String(lastDisconnect.error.message).includes("reading 'public'")
    ) {
      console.error(`[WA Engine] Structural TypeError caught for shop ${shopId}. Purging corrupt auth row.`);
      connectionOpenSessions.delete(shopId);
      activeSessions.delete(shopId);
      try { sock.ws.close(); } catch(e){}
      await purgeEntireSession();
      return;
    }

    if (qr) {
      console.log(`[WA Engine] QR generated for shop ${shopId}`);
      await supabase.from('whatsapp_sessions').upsert(
        {
          shop_id: shopId,
          session_key: 'qr',
          session_value: { qr },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'shop_id,session_key' },
      );

      const resolvers = qrResolvers.get(shopId);
      if (resolvers && resolvers.length > 0) {
        resolvers.forEach((resolve) => resolve(qr));
        qrResolvers.set(shopId, []);
      }
    }

    if (connection === 'open') {
      console.log(`[WA Engine] Connection OPEN for shop ${shopId}. Synchronizing to Supabase DB...`);
      connectionOpenSessions.add(shopId);
      
      const { error: dbError } = await supabase
        .from('shops')
        .update({ qr_express_status: 'connected' })
        .eq('id', shopId);

      if (dbError) {
        console.error(`[DB ERROR] Failed to update qr_express_status in shops table for shop ${shopId}:`, dbError.message);
      } else {
        console.log(`[DB SUCCESS] shops table successfully updated to 'connected' for shop ${shopId}`);
      }

      await supabase.from('whatsapp_sessions').delete().eq('shop_id', shopId).eq('session_key', 'qr');

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

      // Check if it's a structural 408 query timeout on high-volume device syncs
      if (error?.message === 'Timed Out' || statusCode === 408) {
        console.warn(`[WA Engine] Initial query handshake timed out for shop ${shopId}. Recovering instance smoothly...`);
        if (reconnectTimers.has(shopId)) clearTimeout(reconnectTimers.get(shopId));
        
        const timer = setTimeout(() => {
          reconnectTimers.delete(shopId);
          startWhatsAppEngine(shopId).catch(err => {});
        }, 3000); // 3s stable cooling down phase before spinning socket up
        reconnectTimers.set(shopId, timer);
        return;
      }

      if (statusCode === DisconnectReason.loggedOut) {
        console.error(`[WA Engine] Shop ${shopId} logged out explicitly (code ${statusCode}). Purging session.`);
        activeSessions.delete(shopId);
        await supabase.from('shops').update({
          whatsapp_mode: 'NONE',
          qr_express_status: 'disconnected',
        }).eq('id', shopId);
        await purgeEntireSession();

        await supabase.from('campaigns')
          .update({ status: 'paused_logout' })
          .eq('shop_id', shopId)
          .eq('status', 'processing')
          .eq('dispatch_mode', 'QR_EXPRESS');

        const resolvers = qrResolvers.get(shopId);
        if (resolvers && resolvers.length > 0) {
          resolvers.forEach((resolve) => resolve("DISCONNECTED"));
          qrResolvers.set(shopId, []);
        }
      } else {
        console.warn(`[WA Engine] Connection closed for shop ${shopId} (code ${statusCode}). Reconnecting...`);
        if (reconnectTimers.has(shopId)) clearTimeout(reconnectTimers.get(shopId));
        
        const timer = setTimeout(() => {
          reconnectTimers.delete(shopId);
          startWhatsAppEngine(shopId).catch(err => {});
        }, 3000); // 3s stable cooling down phase before spinning socket up
        reconnectTimers.set(shopId, timer);
      }
    }
  });

  return sock;
};

const ensureSocketLive = async (shopId, timeoutMs = 25_000) => {
  let sock = activeSessions.get(shopId);
  const isDown = !sock || sock.ws?.readyState !== 1 || !connectionOpenSessions.has(shopId);

  if (isDown) {
    console.log(`[WA Engine] Socket for shop ${shopId} is down. Bootstrapping connection...`);
    if (sock) {
      try { sock.ev.removeAllListeners('connection.update'); } catch {}
      try { sock.ws.close(); } catch {}
      activeSessions.delete(shopId);
      connectionOpenSessions.delete(shopId);
    }
    await startWhatsAppEngine(shopId);
    await waitForSocketOpen(shopId, timeoutMs);
  }
  return activeSessions.get(shopId) || null;
};

// ── REST API Endpoints ─────────────────────────────────────────────────────

app.get('/api/whatsapp/connect', async (req, res) => {
  const { shop_id } = req.query;
  if (!shop_id) return res.status(400).json({ ok: false, error: 'Missing shop_id parameter' });

  if (initializingShops[shop_id]) {
    return res.status(429).json({ ok: false, error: 'Engine initialization already in progress.' });
  }

  try {
    initializingShops[shop_id] = true;
    if (isSocketLive(shop_id)) {
      delete initializingShops[shop_id];
      return res.status(200).json({ ok: true, status: "connected", qr: null });
    }

    startWhatsAppEngine(shop_id).catch(err => {});

    // Wait up to 15 seconds for QR to compile gracefully
    const qrCodeString = await new Promise((resolve) => {
      if (!qrResolvers.has(shop_id)) qrResolvers.set(shop_id, []);
      qrResolvers.get(shop_id).push(resolve);
      setTimeout(() => resolve(""), 15000);
    });

    delete initializingShops[shop_id];

    if (qrCodeString && qrCodeString !== "CONNECTED" && qrCodeString !== "DISCONNECTED") {
      return res.status(200).json({ ok: true, status: "qr_ready", qr: qrCodeString });
    }
    if (isSocketLive(shop_id) || qrCodeString === "CONNECTED") {
      return res.status(200).json({ ok: true, status: "connected", qr: null });
    }
    return res.status(200).json({ ok: true, status: "disconnected", qr: null });
  } catch (error) {
    delete initializingShops[shop_id];
    return res.status(500).json({ ok: false, error: String(error) });
  }
});

app.get('/api/whatsapp/status', async (req, res) => {
  const { shop_id } = req.query;
  if (!shop_id) return res.status(400).json({ error: 'Missing shop_id parameter' });

  let status = 'DISCONNECTED';
  if (isSocketLive(shop_id)) status = 'CONNECTED';
  else if (activeSessions.has(shop_id)) status = 'CONNECTING';

  let qr = null;
  if (status !== 'CONNECTED') {
    const { data: qrSession } = await supabase.from('whatsapp_sessions')
      .select('session_value').eq('shop_id', shop_id).eq('session_key', 'qr').maybeSingle();
    if (qrSession?.session_value?.qr) qr = qrSession.session_value.qr;
  }
  return res.json({ status, qr });
});

app.post('/api/whatsapp/send-message', async (req, res) => {
  const { shop_id, to, message, image_url } = req.body;
  if (!shop_id || !to || !message) return res.status(400).json({ error: 'Missing parameters' });

  try {
    const sock = await ensureSocketLive(shop_id, 25000);
    if (!sock || !isSocketLive(shop_id)) return res.status(503).json({ error: 'WhatsApp socket connection offline' });

    const recipientJid = `${to.split('@')[0]}@s.whatsapp.net`;
    let sendReceipt;
    if (image_url) {
      sendReceipt = await withTimeout(sock.sendMessage(recipientJid, { 
        image: { url: image_url }, 
        caption: message 
      }), 15000);
    } else {
      sendReceipt = await withTimeout(sock.sendMessage(recipientJid, { text: message }), 12000);
    }

    if (sendReceipt && sendReceipt.key && sendReceipt.key.id) {
      let shopMap = messageStatusStore.get(shop_id);
      if (!shopMap) {
        shopMap = new Map();
        messageStatusStore.set(shop_id, shopMap);
      }
      shopMap.set(sendReceipt.key.id, 1); // 1 = sent
    }

    return res.json({ ok: true, log: sendReceipt });
  } catch (error) {
    return res.status(500).json({ error: String(error) });
  }
});

app.post('/api/whatsapp/sync-status', async (req, res) => {
  const { shop_id, messages } = req.body;
  if (!shop_id || !messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const updated = [];
  try {
    const shopMap = messageStatusStore.get(shop_id);
    if (!shopMap) {
      return res.json({ updated: [] });
    }

    for (const msg of messages) {
      const msgId = msg.meta_message_id;
      if (!msgId) continue;

      const cachedStatus = shopMap.get(msgId);
      if (cachedStatus !== undefined) {
        // status 4 is READ, 5 is PLAYED
        if (cachedStatus === 4 || cachedStatus === 5 || cachedStatus === 'read') {
          let campaignId = msg.campaign_id;
          
          const { data: logData } = await supabase
            .from('message_logs')
            .select('campaign_id, status')
            .eq('meta_message_id', msgId)
            .maybeSingle();
            
          if (logData && logData.status?.toUpperCase() !== 'READ') {
            campaignId = campaignId || logData.campaign_id;
            
            const { error: updateError } = await supabase
              .from('message_logs')
              .update({ status: 'READ' })
              .eq('meta_message_id', msgId);

            if (!updateError) {
              if (campaignId) {
                await supabase.rpc('increment_campaign_metric', {
                  campaign_row_id: campaignId,
                  metric_name: 'read',
                  quantity: 1
                });
              }
              updated.push({ meta_message_id: msgId, status: 'READ' });
              shopMap.delete(msgId);
            }
          } else if (logData && logData.status?.toUpperCase() === 'READ') {
            shopMap.delete(msgId);
          }
        } 
        // status 3 = DELIVERY_ACK (delivered) — case-insensitive guard
        else if (cachedStatus === 3 || cachedStatus === 'delivered') {
          const { data: logData } = await supabase
            .from('message_logs')
            .select('status')
            .eq('meta_message_id', msgId)
            .maybeSingle();

          const currentStatus = logData?.status?.toLowerCase();
          if (currentStatus && currentStatus !== 'read' && currentStatus !== 'delivered') {
            const { error: updateError } = await supabase
              .from('message_logs')
              .update({ status: 'delivered' })
              .eq('meta_message_id', msgId);

            if (!updateError) {
              updated.push({ meta_message_id: msgId, status: 'DELIVERED' });
            }
          }
        }
      }
    }
  } catch (err) {
    console.error(`[WA Engine] Error syncing status:`, err);
  }

  return res.json({ updated });
});

const hydrateActiveSessions = async () => {
  console.log('[WA Engine] Starting auto-hydration...');
  try {
    const { data: shops } = await supabase.from('shops')
      .select('id').eq('whatsapp_mode', 'QR_EXPRESS').eq('qr_express_status', 'connected');
    if (shops && shops.length > 0) {
      for (const shop of shops) {
        startWhatsAppEngine(shop.id).catch(err => {});
      }
    }
  } catch (err) {}
};

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`WhatsApp Edge Engine running flawlessly on port ${PORT}`);
  hydrateActiveSessions();
});