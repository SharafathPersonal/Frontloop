const fs = require('fs');
let code = fs.readFileSync('src/controllers/whatsappController.js', 'utf8');

// Replace signature
code = code.replace(
  'const startWhatsAppEngine = async (shopId) => {',
  'const startWhatsAppEngine = async (shopId, phoneNumber = null) => {'
);

// Replace browser
code = code.replace(
  "browser: ['True Attendly QR', 'Chrome', '22.04.4'],",
  "browser: ['Ubuntu', 'Chrome', '20.0.04'],"
);

// Insert pairing code logic before sock.ev.process
const pairingLogic = `
  if (phoneNumber && !sock.authState.creds.registered) {
    setTimeout(async () => {
      try {
        const pairingCode = await sock.requestPairingCode(phoneNumber);
        console.log(\`🔑 [PAIRING CODE GENERATED] Shop \${shopId}: \${pairingCode}\`);
        
        const sessionKey = \`qr_\${shopId}\`;
        const { error } = await supabase.from('whatsapp_sessions').upsert({
          shop_id: shopId,
          session_key: sessionKey,
          session_value: { pairingCode },
          updated_at: new Date().toISOString(),
        }, { onConflict: 'shop_id, session_key' });
        
        if (error) console.error(\`[STATE MACHINE] 🚨 Failed to persist Pairing Code for shop \${shopId}:\`, error);

        const resolvers = qrResolvers.get(shopId);
        if (resolvers && resolvers.length > 0) {
          resolvers.forEach(r => r({ status: 'pairing_code_ready', pairingCode }));
          qrResolvers.set(shopId, []);
        }
      } catch (codeErr) {
        console.error("🚨 Error requesting pairing code:", codeErr);
      }
    }, 3000);
  }

  sock.ev.process(async (events) => {`;
code = code.replace('  sock.ev.process(async (events) => {', pairingLogic);

// Remove QR emit from connection.update
const oldQRCatch = `      const update = events['connection.update'];
      const { connection, lastDisconnect, qr, receivedPendingNotifications } = update;
      const qrKey = \`qr_\${shopId}\`;

      console.log(\`[STATE MACHINE] Shop \${shopId} → connection=\${connection ?? 'n/a'} | qr=\${!!qr} | pendingNotifs=\${receivedPendingNotifications ?? 'n/a'}\`);

      // ── QR CODE EMITTED → WAITING_FOR_SCAN ──────────────────────────────
      // Write QR to DB for polling, but do NOT mark shop as connected.
      if (qr) {
        console.log(\`[STATE MACHINE] 📱 QR code generated for shop \${shopId} — status: WAITING_FOR_SCAN\`);
          const { error } = await supabase.from('whatsapp_sessions').upsert({
            shop_id: shopId,
            session_key: qrKey,
            session_value: { qr },
            updated_at: new Date().toISOString(),
          }, { onConflict: 'shop_id, session_key' });
          if (error) console.error(\`[STATE MACHINE] 🚨 Failed to persist QR for shop \${shopId}:\`, error);
        const resolvers = qrResolvers.get(shopId);
        if (resolvers && resolvers.length > 0) {
          resolvers.forEach(r => r(qr));
          qrResolvers.set(shopId, []);
        }
      }`;

const newQRCatch = `      const update = events['connection.update'];
      const { connection, lastDisconnect } = update;
      const qrKey = \`qr_\${shopId}\`;

      console.log(\`[STATE MACHINE] Shop \${shopId} → connection=\${connection ?? 'n/a'}\`);`;
      
code = code.replace(oldQRCatch, newQRCatch);

// Rewrite handleConnect
const oldHandleConnect = `const handleConnect = async (req, res) => {
  const { shop_id } = req.body;
  if (!shop_id) return res.status(400).json({ ok: false, error: 'Missing shop_id' });`;

const newHandleConnect = `const handleConnect = async (req, res) => {
  const { shop_id, phone_number } = req.body;
  if (!shop_id) return res.status(400).json({ ok: false, error: 'Missing shop_id' });
  
  let cleanPhone = null;
  if (phone_number) {
    cleanPhone = phone_number.replace(/\\D/g, '');
  }`;

code = code.replace(oldHandleConnect, newHandleConnect);

// update startWhatsAppEngine call in handleConnect
code = code.replace(
  'startWhatsAppEngine(shop_id).catch((err) => {',
  'startWhatsAppEngine(shop_id, cleanPhone).catch((err) => {'
);

// update handleConnect Poll block
const oldPollBlock = `        const { data: qrPoll } = await supabase
          .from('whatsapp_sessions')
          .select('session_value')
          .eq('shop_id', shop_id)
          .eq('session_key', \`qr_\${shop_id}\`)
          .maybeSingle();
        if (qrPoll?.session_value?.qr) {
          console.log(\`[CONNECT] 📋 Returning cached QR from DB poll for shop \${shop_id}.\`);
          return res.status(200).json({ ok: true, status: 'qr_ready', qr: qrPoll.session_value.qr });
        }`;

const newPollBlock = `        const { data: qrPoll } = await supabase
          .from('whatsapp_sessions')
          .select('session_value')
          .eq('shop_id', shop_id)
          .eq('session_key', \`qr_\${shop_id}\`)
          .maybeSingle();
        if (qrPoll?.session_value?.pairingCode) {
          console.log(\`[CONNECT] 📋 Returning cached pairing code from DB poll for shop \${shop_id}.\`);
          return res.status(200).json({ ok: true, status: 'pairing_code_ready', pairingCode: qrPoll.session_value.pairingCode });
        }`;
code = code.replace(oldPollBlock, newPollBlock);

// update handleConnect Timeout Block
const oldTimeoutBlock = `    const { data: timeoutQrCheck } = await supabase
      .from('whatsapp_sessions')
      .select('session_value')
      .eq('shop_id', shop_id)
      .eq('session_key', \`qr_\${shop_id}\`)
      .maybeSingle();
    if (timeoutQrCheck?.session_value?.qr) {
      console.log(\`[CONNECT] 📋 Timeout-fallback DB check found QR for shop \${shop_id}.\`);
      return res.status(200).json({ ok: true, status: 'qr_ready', qr: timeoutQrCheck.session_value.qr });
    }`;
const newTimeoutBlock = `    const { data: timeoutQrCheck } = await supabase
      .from('whatsapp_sessions')
      .select('session_value')
      .eq('shop_id', shop_id)
      .eq('session_key', \`qr_\${shop_id}\`)
      .maybeSingle();
    if (timeoutQrCheck?.session_value?.pairingCode) {
      console.log(\`[CONNECT] 📋 Timeout-fallback DB check found Pairing Code for shop \${shop_id}.\`);
      return res.status(200).json({ ok: true, status: 'pairing_code_ready', pairingCode: timeoutQrCheck.session_value.pairingCode });
    }`;
code = code.replace(oldTimeoutBlock, newTimeoutBlock);

// update signal handling
const oldSignalHandling = `    const displaySignal = signal && signal.length > 20 ? 'QR_STRING' : signal;
    console.log(\`[CONNECT] Shop \${shop_id} signal received: \${displaySignal}\`);

    if (signal === 'CONNECTED') {
      return res.status(200).json({ ok: true, status: 'connected', qr: null });
    }
    if (signal === 'DISCONNECTED') {
      return res.status(200).json({ ok: true, status: 'disconnected', qr: null });
    }
    if (signal && signal !== 'TIMEOUT') {
      return res.status(200).json({ ok: true, status: 'qr_ready', qr: signal });
    }`;

const newSignalHandling = `    const displaySignal = (typeof signal === 'object' && signal.pairingCode) ? 'PAIRING_CODE' : signal;
    console.log(\`[CONNECT] Shop \${shop_id} signal received: \${displaySignal}\`);

    if (signal === 'CONNECTED') {
      return res.status(200).json({ ok: true, status: 'connected' });
    }
    if (signal === 'DISCONNECTED') {
      return res.status(200).json({ ok: true, status: 'disconnected' });
    }
    if (signal && signal !== 'TIMEOUT' && signal.pairingCode) {
      return res.status(200).json({ ok: true, status: 'pairing_code_ready', pairingCode: signal.pairingCode });
    }`;
code = code.replace(oldSignalHandling, newSignalHandling);

// update handleStatus
const oldHandleStatus = `  // Not connected — check if a QR code is currently live (waiting for scan).
  const { data: qrSession } = await supabase
    .from('whatsapp_sessions')
    .select('session_value')
    .eq('shop_id', shop_id)
    .eq('session_key', \`qr_\${shop_id}\`)
    .maybeSingle();

  if (qrSession?.session_value?.qr) {
    const qr = qrSession.session_value.qr;
    const qrImageUrl = \`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=\${encodeURIComponent(qr)}\`;
    return res.json({
      status: 'WAITING_FOR_SCAN',
      qr,
      qrImageUrl,
      connected: false,
    });
  }`;
const newHandleStatus = `  // Not connected — check if a pairing code is currently live.
  const { data: qrSession } = await supabase
    .from('whatsapp_sessions')
    .select('session_value')
    .eq('shop_id', shop_id)
    .eq('session_key', \`qr_\${shop_id}\`)
    .maybeSingle();

  if (qrSession?.session_value?.pairingCode) {
    return res.json({
      status: 'pairing_code_ready',
      pairingCode: qrSession.session_value.pairingCode,
      connected: false,
    });
  }`;
code = code.replace(oldHandleStatus, newHandleStatus);

fs.writeFileSync('src/controllers/whatsappController.js', code);
console.log('✅ Replaced backend logic successfully.');
