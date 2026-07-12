require('dotenv').config();
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const express = require('express');
const cors = require('cors');
const pino = require('pino');
const whatsappRoutes = require('./src/routes/whatsappRoutes');
const { hydrateActiveSessions, startWhatsAppEngine } = require('./src/controllers/whatsappController');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();

app.use(express.json());
app.use((req, res, next) => {
  console.log(`[EXPRESS HTTP] ${req.method} ${req.url}`);
  next();
});

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

app.post('/api/whatsapp/test-mock-lead', async (req, res) => {
    console.log("🚀 [MOCK TRIGGER] Explicitly forcing a manual QR Lead simulation payload!");
    const { shop_id, test_phone, test_name } = req.body;
    
    if (!shop_id) return res.status(400).json({ ok: false, error: "Missing shop_id in payload" });
    
    const mockJid = `${test_phone || '919999999999'}@s.whatsapp.net`;
    const mockMsg = {
        key: { remoteJid: mockJid, fromMe: false, id: 'mock_msg_' + Date.now() },
        message: { conversation: "✨ add me to broadcast" },
        pushName: test_name || "Mock Test Customer"
    };

    try {
        console.log(`🔗 [MOCK ROUTER] Injecting mock payload into processInboundLead for shop: ${shop_id}`);
        // Import and execute the lead controller immediately with a mock empty socket shell
        const { processInboundLead } = require('./src/controllers/leadController');
        
        const mockSockShell = {
            sendMessage: async (jid, content) => {
                console.log(`📡 [MOCK SOCKET OUTBOUND] Simulated voucher dispatch sent to ${jid}:`, content);
                return true;
            }
        };

        await processInboundLead(mockMsg, shop_id, mockSockShell);
        return res.status(200).json({ ok: true, message: "Mock lead executed! Check your terminal and Supabase table." });
    } catch (err) {
        console.error("🚨 [MOCK CRASH] Simulation failed:", err);
        return res.status(500).json({ ok: false, error: String(err) });
    }
});

app.use('/api/whatsapp', whatsappRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`Inbound QR Lead Listener active on port ${PORT}`);
  // hydrateActiveSessions restores inbound listeners for all shops previously marked
  // as 'connected' in the DB. First-time connections are started on-demand via
  // POST /api/whatsapp/connect when the user clicks "Generate QR Code" in the UI.
  hydrateActiveSessions();
});