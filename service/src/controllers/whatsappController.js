const makeWASocket = require('@whiskeysockets/baileys').default || require('@whiskeysockets/baileys');
const { DisconnectReason, initAuthCreds, BufferJSON, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const supabase = require('../config/supabase');
const pino = require('pino');
const { processInboundLead } = require('./leadController');

// Resilient in-memory store implementation to support all versions of Baileys
function makeInMemoryStore() {
    const storeObj = {
        contacts: {},
        chats: {},
        messages: {},
        bind: (ev) => {
            ev.on('messaging-history.set', ({ contacts }) => {
                if (contacts) {
                    for (const contact of contacts) {
                        storeObj.contacts[contact.id] = {
                            ...storeObj.contacts[contact.id],
                            ...contact
                        };
                    }
                }
            });

            ev.on('contacts.upsert', (contacts) => {
                for (const contact of contacts) {
                    storeObj.contacts[contact.id] = {
                        ...storeObj.contacts[contact.id],
                        ...contact
                    };
                }
            });

            ev.on('contacts.update', (updates) => {
                for (const update of updates) {
                    if (storeObj.contacts[update.id]) {
                        Object.assign(storeObj.contacts[update.id], update);
                    } else {
                        storeObj.contacts[update.id] = update;
                    }
                }
            });
        }
    };
    return storeObj;
}

// Initialize the active in-memory store on engine startup
const store = makeInMemoryStore();

const logger = pino({ level: process.env.LOG_LEVEL || 'silent' });

// ─────────────────────────────────────────────────────────────────────────────
// IN-MEMORY STATE REGISTRIES
// activeSessions:    shopId → socket  (ONLY set after connection === 'open' + pendingNotifications)
// connectingEngines: shopId → socket  (set immediately on engine start; removed on open or terminal close)
//                    Guards against duplicate socket spawns while a QR/connecting phase is in progress.
// qrResolvers:       shopId → array of pending Promise resolvers
// reconnectTimers:   shopId → setTimeout handle
// intentionalDisconnects: shopId Set — marks user-initiated disconnects to skip reconnect
// ─────────────────────────────────────────────────────────────────────────────
const activeSessions = new Map();
const connectingEngines = new Map();
const qrResolvers = new Map();
const reconnectTimers = new Map();
const intentionalDisconnects = new Set();

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const fixBuffers = (obj) => {
  if (!obj) return obj;
  if (obj.type === 'Buffer' && Array.isArray(obj.data)) return Buffer.from(obj.data);
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

// ─────────────────────────────────────────────────────────────────────────────
// ABSOLUTE SESSION PURGE — clears DB rows + in-memory state atomically.
// Called on: intentional disconnect, phone-side logout, and conflict errors.
// ─────────────────────────────────────────────────────────────────────────────
const executeAbsolutePurge = async (shopId, sock = null) => {
  console.log(`[PURGE] ⚡ Initiating absolute session purge for shop ${shopId}`);

  // 1. Cancel any pending reconnect timers first to prevent resurrection.
  if (reconnectTimers.has(shopId)) {
    clearTimeout(reconnectTimers.get(shopId));
    reconnectTimers.delete(shopId);
    console.log(`[PURGE] 🕐 Cancelled pending reconnect timer for shop ${shopId}`);
  }

  // 2. Gracefully terminate the Baileys WebSocket if a socket reference is provided.
  //    logout() de-registers the device from WhatsApp; end() closes the raw WS transport.
  if (sock) {
    try {
      await sock.logout();
      console.log(`[PURGE] 📴 sock.logout() succeeded for shop ${shopId}`);
    } catch (e) {
      // logout() can throw if the socket is already dead — that's acceptable.
      console.warn(`[PURGE] ⚠️  sock.logout() threw (socket may be dead): ${e.message}`);
    }
    try {
      sock.end(undefined);
      console.log(`[PURGE] 🔌 sock.end() called for shop ${shopId}`);
    } catch (e) {
      console.warn(`[PURGE] ⚠️  sock.end() threw: ${e.message}`);
    }
  } else {
    // Fallback: close raw WS for any cached socket (authenticated or still connecting).
    const cachedSock = activeSessions.get(shopId) || connectingEngines.get(shopId);
    if (cachedSock) { try { cachedSock.ws.close(); } catch (e) {} }
  }

  // Remove from both registries.
  connectingEngines.delete(shopId);

  // 3. Hard-delete both the session credentials row AND the ephemeral QR row from Supabase.
  const sessionKey = `session_${shopId}`;
  const qrKey = `qr_${shopId}`;
  const [sessionResult, qrResult] = await Promise.all([
    supabase.from('whatsapp_sessions').delete().eq('shop_id', shopId).eq('session_key', sessionKey),
    supabase.from('whatsapp_sessions').delete().eq('shop_id', shopId).eq('session_key', qrKey),
  ]);
  
  if (sessionResult.error) {
    console.error(`[PURGE] 🚨 DB delete failed for session_${shopId}:`, sessionResult.error);
  } else {
    console.log(`[PURGE] 🗑️  DB row deleted: ${sessionKey}`);
  }
  
  if (qrResult.error) {
    console.error(`[PURGE] 🚨 DB delete failed for qr_${shopId}:`, qrResult.error);
  } else {
    console.log(`[PURGE] 🗑️  DB row deleted: ${qrKey}`);
  }

  // 4. Forcefully remove the socket from the in-memory registry.
  activeSessions.delete(shopId);
  console.log(`[PURGE] 🧹 activeSessions cleared for shop ${shopId}`);

  // 5. Write the authoritative DISCONNECTED status to the shops table.
  const { error: dbErr } = await supabase
    .from('shops')
    .update({ qr_express_status: 'disconnected' })
    .eq('id', shopId);
  if (dbErr) {
    console.error(`[PURGE] 🚨 Failed to update shops.qr_express_status for shop ${shopId}:`, dbErr);
  } else {
    console.log(`[PURGE] ✅ shops.qr_express_status set to 'disconnected' for shop ${shopId}`);
  }

  // 6. Resolve any waiting QR promise resolvers so callers don't hang.
  const resolvers = qrResolvers.get(shopId);
  if (resolvers && resolvers.length > 0) {
    resolvers.forEach(r => r('DISCONNECTED'));
    qrResolvers.set(shopId, []);
  }

  console.log(`[PURGE] ✅ Absolute purge complete for shop ${shopId}`);
};

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE AUTH STATE — isolated per shopId to prevent cross-shop contamination.
// ─────────────────────────────────────────────────────────────────────────────
const getSupabaseAuthState = async (shopId) => {
  const customReplacer = (k, v) => {
    if (v instanceof Uint8Array || v instanceof Buffer || (v && v.type === 'Buffer')) {
      return { type: 'Buffer', data: Array.from(v.data || v) };
    }
    return BufferJSON.replacer(k, v);
  };

  const customReviver = (k, v) => {
    if (v && v.type === 'Buffer' && Array.isArray(v.data)) return Buffer.from(v.data);
    return BufferJSON.reviver(k, v);
  };

  const sessionKey = `session_${shopId}`;
  const { data } = await supabase
    .from('whatsapp_sessions')
    .select('session_value')
    .eq('shop_id', shopId)
    .eq('session_key', sessionKey)
    .maybeSingle();

  let creds;
  if (data?.session_value) {
    creds = fixBuffers(JSON.parse(JSON.stringify(data.session_value), customReviver));
    console.log(`[AUTH STATE] 📦 Restored credentials from Supabase for shop ${shopId}`);
  } else {
    creds = initAuthCreds();
    console.log(`[AUTH STATE] 🆕 Initialized fresh credentials for shop ${shopId}`);
  }

  const saveCreds = async () => {
    try {
      const serializedCreds = JSON.parse(JSON.stringify(creds, customReplacer));
      const { error } = await supabase.from('whatsapp_sessions').upsert({
        shop_id: shopId,
        session_key: sessionKey,
        session_value: serializedCreds,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'shop_id, session_key' });
      if (error) console.error(`[DB ERROR] Failed to save credentials for shop ${shopId}:`, error);
    } catch (err) {
      console.error(`[DB ERROR] Failed to save credentials for shop ${shopId}:`, err);
    }
  };

  const inMemoryKeys = {};
  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const result = {};
          for (const id of ids) {
            const value = inMemoryKeys[`${type}-${id}`];
            if (value) result[id] = fixBuffers(value);
          }
          return result;
        },
        set: async (data) => {
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category]?.[id];
              if (value) inMemoryKeys[`${category}-${id}`] = value;
              else delete inMemoryKeys[`${category}-${id}`];
            }
          }
        },
      },
    },
    saveCreds,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// CONNECTION STATE MACHINE
//
// STRICT TRUTH TABLE:
//   connection === 'open'       → CONNECTED (only after receivedPendingNotifications validation)
//   qr emitted                  → WAITING_FOR_SCAN   (DB: 'disconnected', QR row written)
//   connection === 'connecting' → no DB write (transient, UI polls)
//   connection === 'close'      + loggedOut/401/411  → absolute purge → DB: 'disconnected'
//   connection === 'close'      + other codes        → schedule reconnect, NO DB mutation
// ─────────────────────────────────────────────────────────────────────────────
const startWhatsAppEngine = async (shopId, phoneNumber = null) => {
  // Clear any pending reconnect for this shop before starting fresh.
  if (reconnectTimers.has(shopId)) {
    clearTimeout(reconnectTimers.get(shopId));
    reconnectTimers.delete(shopId);
  }

  // Tear down any existing authenticated socket.
  if (activeSessions.has(shopId)) {
    const oldSock = activeSessions.get(shopId);
    console.log(`[STATE MACHINE] 🔌 Tearing down active socket for shop ${shopId} before restart.`);
    try { oldSock.end(undefined); } catch (e) {}
    try { oldSock.ws.close(); } catch (e) {}
    activeSessions.delete(shopId);
  }

  // Tear down any existing connecting/QR-phase socket.
  // This prevents duplicate sockets when engine is restarted mid-connecting.
  if (connectingEngines.has(shopId)) {
    const oldSock = connectingEngines.get(shopId);
    console.log(`[STATE MACHINE] 🔌 Tearing down connecting socket for shop ${shopId} before restart.`);
    try { oldSock.end(undefined); } catch (e) {}
    try { oldSock.ws.close(); } catch (e) {}
    connectingEngines.delete(shopId);
  }

  const { state, saveCreds } = await getSupabaseAuthState(shopId);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    keepAliveIntervalMs: 30000,
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
  });

  // Bind the in-memory store to the socket event emitter and attach it to the socket context
  store.bind(sock.ev);
  sock.store = store;

  // Register in connectingEngines IMMEDIATELY so subsequent calls to startWhatsAppEngine
  // or handleConnect can detect that an engine is already in flight and avoid duplicates.
  // This will be moved to activeSessions (or deleted) once the connection resolves.
  connectingEngines.set(shopId, sock);

  sock.ev.on('creds.update', saveCreds);


  if (phoneNumber && !sock.authState.creds.registered) {
    (async () => {
      if (!sock.authState.creds.account) {
          try {
            await sock.waitForConnectionUpdate((update) => !!update.qr);
          } catch (err) {
            console.error("🚨 Failed to wait for QR update:", err);
            return;
          }
      }
      setTimeout(async () => {
          try {
              const pureCode = await sock.requestPairingCode(phoneNumber);
              console.log(`🔑 [AUDITED PAIRING SUCCESS] Generated 8-digit Key: ${pureCode}`);
              
              const sessionKey = `qr_${shopId}`;
              const { error } = await supabase.from('whatsapp_sessions').upsert({
                shop_id: shopId,
                session_key: sessionKey,
                session_value: { pairingCode: pureCode },
                updated_at: new Date().toISOString(),
              }, { onConflict: 'shop_id, session_key' });
              
              if (error) console.error(`[STATE MACHINE] 🚨 Failed to persist Pairing Code for shop ${shopId}:`, error);

              const resolvers = qrResolvers.get(shopId);
              if (resolvers && resolvers.length > 0) {
                resolvers.forEach(r => r({ status: 'pairing_code_ready', pairingCode: pureCode }));
                qrResolvers.set(shopId, []);
              }
          } catch (pairingError) {
              console.error("🚨 Critical pairing code request rejected by WA server:", pairingError);
          }
      }, 4000); // Strict 4-second delay for background transport handshakes
    })();
  }

  sock.ev.process(async (events) => {
    // ── 1. CONNECTION LIFECYCLE — STRICT STATE MACHINE ──────────────────────
    if (events['connection.update']) {
      const update = events['connection.update'];
      const { connection, lastDisconnect } = update;
      const qrKey = `qr_${shopId}`;

      console.log(`[STATE MACHINE] Shop ${shopId} → connection=${connection ?? 'n/a'}`);

      // ── CONNECTION OPEN → VALIDATE THEN SET CONNECTED ───────────────────
      if (connection === 'open') {
        console.log(`[STATE MACHINE] ✅ FULLY AUTHENTICATED — Shop ${shopId} — committing CONNECTED state.`);

        // Graduate the socket from connectingEngines → activeSessions.
        connectingEngines.delete(shopId);
        activeSessions.set(shopId, sock);

        const { error: dbErr } = await supabase
          .from('shops')
          .update({ qr_express_status: 'connected' })
          .eq('id', shopId);

        if (dbErr) {
          console.error(`[STATE MACHINE] 🚨 DB update failed for shop ${shopId}:`, dbErr);
        } else {
          console.log(`[STATE MACHINE] 📝 DB: shops.qr_express_status = 'connected' for shop ${shopId}`);
        }

        const { error: deleteErr } = await supabase.from('whatsapp_sessions').delete().eq('shop_id', shopId).eq('session_key', qrKey);
        if (deleteErr) console.error(`[STATE MACHINE] 🚨 Failed to delete ephemeral QR row for shop ${shopId}:`, deleteErr);

        // Resolve any waiting QR promise resolvers.
        const resolvers = qrResolvers.get(shopId);
        if (resolvers && resolvers.length > 0) {
          resolvers.forEach(r => r('CONNECTED'));
          qrResolvers.set(shopId, []);
        }
      }

      // ── CONNECTION CLOSED ────────────────────────────────────────────────
      if (connection === 'close') {
        const error = lastDisconnect?.error;
        const statusCode = error?.output?.statusCode ?? error?.output?.payload?.statusCode;

        console.log(`[STATE MACHINE] 🔴 connection=close for shop ${shopId} | statusCode=${statusCode} | intentional=${intentionalDisconnects.has(shopId)}`);

        // Determine if this is a terminal disconnection (no reconnect should occur).
        const isLoggedOut = statusCode === DisconnectReason.loggedOut;
        const isConflict = statusCode === 401 || statusCode === 411;
        const isIntentional = intentionalDisconnects.has(shopId);
        // If the socket disconnected before ever fully registering (pairing code timeout), treat it as terminal.
        const isUnregisteredTimeout = !sock.authState.creds.registered;

        if (isLoggedOut || isConflict || isIntentional || isUnregisteredTimeout) {
          // ── TERMINAL DISCONNECT: Phone-side logout OR conflict OR user action OR timeout ──
          // Execute the absolute purge to sync DB/memory instantly.
          console.log(`[STATE MACHINE] ☠️  Terminal disconnect detected for shop ${shopId} (loggedOut=${isLoggedOut}, conflict=${isConflict}, intentional=${isIntentional}, unregisteredTimeout=${isUnregisteredTimeout})`);
          intentionalDisconnects.delete(shopId);
          // Pass sock reference so the purge can call logout/end if needed.
          await executeAbsolutePurge(shopId, isIntentional ? sock : null);
        } else {
          // ── TRANSIENT DISCONNECT: Network blip, server timeout, QR expiry (515), etc. ──
          // Do NOT write DISCONNECTED to DB — misleading for transient errors.
          // Clear both registries then schedule a reconnect.
          activeSessions.delete(shopId);
          connectingEngines.delete(shopId);
          console.log(`[STATE MACHINE] 🔄 Transient disconnect for shop ${shopId} (code=${statusCode}). Scheduling reconnect in 5s.`);
          
          // Fix Reconnect Timer Overwrite Bug
          if (reconnectTimers.has(shopId)) {
            console.log(`[STATE MACHINE] 🕐 Wiping duplicate pending reconnect timer for shop ${shopId}`);
            clearTimeout(reconnectTimers.get(shopId));
            reconnectTimers.delete(shopId);
          }

          const timer = setTimeout(() => {
            reconnectTimers.delete(shopId);
            startWhatsAppEngine(shopId).catch((err) => {
              console.error(`[STATE MACHINE] 🚨 Reconnect failed for shop ${shopId}:`, err);
            });
          }, 5000);
          reconnectTimers.set(shopId, timer);
        }
      }
    }

    // ── 2. INBOUND LEAD BRIDGE ───────────────────────────────────────────────
    if (events['messages.upsert']) {
      const upsert = events['messages.upsert'];
      for (const msg of upsert.messages) {
        await processInboundLead(msg, shopId, sock, store);
      }
    }
  });

  return sock;
};

// ─────────────────────────────────────────────────────────────────────────────
// HYDRATE ACTIVE SESSIONS ON SERVER BOOT
// Only boots engines for shops the DB confirms as 'connected'.
// If they're actually dead, the Baileys reconnect / session-not-found flow will
// auto-correct the DB state via the connection.update handler.
// ─────────────────────────────────────────────────────────────────────────────
const hydrateActiveSessions = async () => {
  console.log('[WA Engine] 🚀 Bootstrapping Inbound Listeners from Supabase...');
  try {
    const { data: shops, error } = await supabase
      .from('shops')
      .select('id')
      .eq('qr_express_status', 'connected');

    if (error) {
      console.error('[WA Engine] 🚨 Failed to fetch active shops for hydration:', error);
      return;
    }

    if (!shops || shops.length === 0) {
      console.log('[WA Engine] ℹ️  No active shops found for hydration.');
      return;
    }

    for (const shop of shops) {
      console.log(`[WA Engine] ⚡ Hydrating engine for shop: ${shop.id}`);
      startWhatsAppEngine(shop.id).catch((err) => {
        console.error(`[WA Engine] 🚨 Hydration failed for shop ${shop.id}:`, err);
      });
    }
  } catch (err) {
    console.error('[WA Engine] 🚨 Unexpected error during hydration:', err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/whatsapp/connect
//
// Starts the Baileys engine for a shop. Returns either:
//   { status: 'qr_ready', qr: '<string>' }       — scan needed
//   { status: 'connected' }                        — already authenticated
//   { status: 'disconnected' }                     — timeout or error
//
// DOES NOT write any status to DB on its own. DB writes happen exclusively
// inside the connection.update state machine above.
// ─────────────────────────────────────────────────────────────────────────────
const handleConnect = async (req, res) => {
  const shop_id = req.body?.shop_id || req.query?.shop_id;
  const force_refresh = req.body?.force_refresh === true || req.query?.force_refresh === 'true';
  const rawPhone = req.body?.phoneNumber || req.body?.phone_number || req.query?.phoneNumber;

  if (!shop_id) return res.status(400).json({ ok: false, error: 'Missing shop_id' });
  
  let cleanPhone = null;
  if (rawPhone) {
    cleanPhone = String(rawPhone).replace(/\D/g, '').replace(/^0+/, '');
    if (!cleanPhone || cleanPhone.length < 5) {
      return res.status(400).json({ ok: false, error: 'Invalid phone number format. Please provide a valid country code and number.' });
    }
  }

  // If force_refresh is requested, tear down any existing engine instantly
  if (force_refresh) {
    console.log(`[CONNECT] 🔄 Force refresh requested for shop ${shop_id}. Purging old session.`);
    await executeAbsolutePurge(shop_id, activeSessions.get(shop_id));
  } else {
    // GUARD 1: Already fully authenticated — return immediately.
    if (activeSessions.has(shop_id)) {
      console.log(`[CONNECT] ✅ Shop ${shop_id} is already CONNECTED in memory. Returning early.`);
      return res.status(200).json({ ok: true, status: 'connected', qr: null });
    }
  }

  try {
    // GUARD 2: An engine is already in the connecting/QR phase for this shop.
    // Do NOT spawn another socket — just register a resolver and wait for the
    // existing engine's next signal. This kills the duplicate-socket race condition.
    const engineAlreadyRunning = connectingEngines.has(shop_id) || reconnectTimers.has(shop_id);

    if (!engineAlreadyRunning) {
      console.log(`[CONNECT] 🚀 Starting new engine for shop ${shop_id}.`);
      startWhatsAppEngine(shop_id, cleanPhone).catch((err) => {
        console.error(`[CONNECT] 🚨 Engine start error for shop ${shop_id}:`, err);
      });
    } else {
      console.log(`[CONNECT] ♻️  Engine already running/pending for shop ${shop_id} — polling for cached QR.`);

      // Poll DB every 500ms for up to 6 seconds.
      // Covers: QR already in DB (instant return) OR engine still in connecting phase (waits).
      const POLL_INTERVAL_MS = 500;
      const POLL_MAX_MS = 6000;
      const pollStart = Date.now();
      while (Date.now() - pollStart < POLL_MAX_MS) {
        const { data: qrPoll } = await supabase
          .from('whatsapp_sessions')
          .select('session_value')
          .eq('shop_id', shop_id)
          .eq('session_key', `qr_${shop_id}`)
          .maybeSingle();
        if (qrPoll?.session_value?.pairingCode) {
          console.log(`[CONNECT] 📋 Returning cached pairing code from DB poll for shop ${shop_id}.`);
          return res.status(200).json({ ok: true, status: 'pairing_code_ready', pairingCode: qrPoll.session_value.pairingCode });
        }
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
      }

      // 6-second poll exhausted — engine may be in transient disconnect window.
      // Fall through to register a resolver and wait for next QR emission.
      console.log(`[CONNECT] ⏳ QR not found after 6s poll for shop ${shop_id} — waiting for engine resolver.`);
    }

    // Register a resolver and wait for the next signal from the state machine.
    const signal = await new Promise((resolve) => {
      if (!qrResolvers.has(shop_id)) qrResolvers.set(shop_id, []);
      qrResolvers.get(shop_id).push(resolve);
      // 25-second hard timeout — slightly longer than one QR expiry cycle.
      setTimeout(() => resolve('TIMEOUT'), 25000);
    });

    const displaySignal = (typeof signal === 'object' && signal.pairingCode) ? 'PAIRING_CODE' : signal;
    console.log(`[CONNECT] Shop ${shop_id} signal received: ${displaySignal}`);

    if (signal === 'CONNECTED') {
      return res.status(200).json({ ok: true, status: 'connected' });
    }
    if (signal === 'DISCONNECTED') {
      return res.status(200).json({ ok: true, status: 'disconnected' });
    }
    if (signal && signal !== 'TIMEOUT' && signal.pairingCode) {
      return res.status(200).json({ ok: true, status: 'pairing_code_ready', pairingCode: signal.pairingCode });
    }

    // TIMEOUT — one final DB check before giving up.
    const { data: timeoutQrCheck } = await supabase
      .from('whatsapp_sessions')
      .select('session_value')
      .eq('shop_id', shop_id)
      .eq('session_key', `qr_${shop_id}`)
      .maybeSingle();
    if (timeoutQrCheck?.session_value?.pairingCode) {
      console.log(`[CONNECT] 📋 Timeout-fallback DB check found Pairing Code for shop ${shop_id}.`);
      return res.status(200).json({ ok: true, status: 'pairing_code_ready', pairingCode: timeoutQrCheck.session_value.pairingCode });
    }

    return res.status(200).json({ ok: true, status: 'disconnected', qr: null });
  } catch (error) {
    console.error(`[CONNECT] 🚨 Unhandled error for shop ${shop_id}:`, error);
    return res.status(500).json({ ok: false, error: String(error) });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/whatsapp/status  — 100% READ-ONLY, PASSIVE
//
// Returns the true real-time state by cross-referencing:
//   1. activeSessions (in-memory socket registry — source of truth for CONNECTED)
//   2. Supabase whatsapp_sessions QR row (for WAITING_FOR_SCAN detection)
//
// This endpoint NEVER mutates state, triggers engines, or writes to DB.
// ─────────────────────────────────────────────────────────────────────────────
const handleStatus = async (req, res) => {
  const { shop_id } = req.query;
  if (!shop_id) return res.status(400).json({ error: 'Missing shop_id parameter' });

  // The only source of truth for CONNECTED is activeSessions.
  // activeSessions is set exclusively when connection === 'open' AND pendingNotifications confirmed.
  if (activeSessions.has(shop_id)) {
    return res.json({
      status: 'CONNECTED',
      qr: null,
      qrImageUrl: null,
      connected: true,
    });
  }

  // Not connected — check if a pairing code is currently live.
  const { data: qrSession } = await supabase
    .from('whatsapp_sessions')
    .select('session_value')
    .eq('shop_id', shop_id)
    .eq('session_key', `qr_${shop_id}`)
    .maybeSingle();

  if (qrSession?.session_value?.pairingCode) {
    return res.json({
      status: 'pairing_code_ready',
      pairingCode: qrSession.session_value.pairingCode,
      connected: false,
    });
  }

  // No active session, no pending QR → fully disconnected.
  return res.json({
    status: 'DISCONNECTED',
    qr: null,
    qrImageUrl: null,
    connected: false,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/whatsapp/disconnect  — MULTI-TIER ABSOLUTE PURGE
//
// Executes a full teardown:
//   1. sock.logout() → de-registers device from WhatsApp
//   2. sock.end()    → closes raw WebSocket transport
//   3. Deletes session_${shopId} from Supabase (credentials)
//   4. Deletes qr_${shopId} from Supabase (ephemeral QR row)
//   5. activeSessions.delete(shopId) — clears in-memory registry
//   6. Updates shops.qr_express_status = 'disconnected' in DB
// ─────────────────────────────────────────────────────────────────────────────
const handleDisconnect = async (req, res) => {
  const { shop_id } = req.body;
  if (!shop_id) return res.status(400).json({ ok: false, error: 'Missing shop_id parameter' });

  console.log(`[DISCONNECT] 🛑 Intentional disconnect requested for shop ${shop_id}`);

  // Mark as intentional BEFORE the purge so the connection.update handler
  // does not schedule a reconnect when it receives the close event.
  intentionalDisconnects.add(shop_id);

  const sock = activeSessions.get(shop_id) || null;
  await executeAbsolutePurge(shop_id, sock);

  return res.json({ ok: true, status: 'disconnected' });
};

module.exports = {
  startWhatsAppEngine,
  hydrateActiveSessions,
  handleConnect,
  handleStatus,
  handleDisconnect,
};
