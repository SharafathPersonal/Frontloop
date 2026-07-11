const fs = require('fs');
const file = 'src/app/dashboard/settings/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add State and Functions for QR
const stateInsertPos = content.indexOf('const [passwordForm, setPasswordForm] = useState');
const qrFunctions = `
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  const fetchLiveStatus = useCallback(async () => {
    if (!shop) return;
    try {
      const renderServerUrl = process.env.NEXT_PUBLIC_RENDER_SERVER_URL || 'http://localhost:3001';
      const res = await fetch(\`\${renderServerUrl}/api/whatsapp/status?shop_id=\${shop.id}\`);
      if (res.ok) {
        const data = await res.json();
        setConnectionStatus(data.status);
        if (data.status === 'qr_ready' && data.qr) {
          setQrCode(data.qr);
        } else {
          setQrCode(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [shop]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (connectionStatus !== 'CONNECTED') {
      interval = setInterval(fetchLiveStatus, 5000);
    }
    return () => clearInterval(interval);
  }, [connectionStatus, fetchLiveStatus]);

  const handleGenerateQR = async () => {
    if (!shop) return;
    setConnectionStatus('INITIALIZING');
    try {
      const renderServerUrl = process.env.NEXT_PUBLIC_RENDER_SERVER_URL || 'http://localhost:3001';
      const res = await fetch(\`\${renderServerUrl}/api/whatsapp/connect?shop_id=\${shop.id}\`);
      const data = await res.json();
      if (data.ok) {
        setConnectionStatus(data.status.toUpperCase());
        if (data.qr) setQrCode(data.qr);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDisconnectQrConnection = async () => {
    if (!shop) return;
    try {
      const renderServerUrl = process.env.NEXT_PUBLIC_RENDER_SERVER_URL || 'http://localhost:3001';
      await fetch(\`\${renderServerUrl}/api/whatsapp/disconnect\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_id: shop.id })
      });
      setConnectionStatus('DISCONNECTED');
      setQrCode(null);
      await fetchLiveStatus();
    } catch (err) {
      console.error(err);
    }
  };
`;
content = content.slice(0, stateInsertPos) + qrFunctions + content.slice(stateInsertPos);

// 2. Add UI Section
const uiInsertPos = content.indexOf('{/* ── SHOP PROFILE ─────────────────────────────────────────── */}');
const qrUi = `
      {/* ── QR LEADS INBOUND LISTENER ──────────────────────────────── */}
      <section className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-[#E8E3DA] flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
            <Smartphone size={14} className="text-amber-600" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="lexend-subheading text-sm font-medium text-[#3E3B36]">🔌 Connect your WhatsApp to get In-store QR Leads</h2>
            <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase">Zero ban-risk listener for inbound traffic</p>
          </div>
          <div className="ml-auto">
            {connectionStatus === 'CONNECTED' ? (
               <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                 <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                 <span className="text-[10px] font-bold tracking-[0.15em] uppercase">Listening</span>
               </div>
            ) : (
               <div className="flex items-center gap-1.5 text-[#8B8378] bg-[#F5F1EA] px-3 py-1 rounded-full border border-[#E8E3DA]">
                 <span className="text-[10px] font-bold tracking-[0.15em] uppercase">Offline</span>
               </div>
            )}
          </div>
        </div>
        <div className="p-6">
          <div className="bg-[#F9F7F4] border border-[#E8E3DA] rounded-xl p-5 mb-5 flex flex-col items-center justify-center min-h-[250px] transition-all">
            {connectionStatus === 'CONNECTED' ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} />
                </div>
                <h3 className="text-lg font-bold text-[#3E3B36] mb-2">Listener Active</h3>
                <p className="text-xs text-[#8B8378] max-w-sm mx-auto leading-relaxed">
                  Your WhatsApp is actively listening for "Add me to Broadcast" messages. Outbound marketing is disabled on this socket to guarantee sender safety.
                </p>
                <button
                  onClick={() => setShowDisconnectModal(true)}
                  className="mt-6 text-[10px] font-bold text-rose-600 tracking-[0.1em] uppercase hover:underline"
                >
                  Disconnect Listener
                </button>
              </div>
            ) : qrCode && (connectionStatus === 'QR_READY' || connectionStatus === 'qr_ready') ? (
              <div className="text-center animate-fade-in">
                <p className="text-xs font-bold text-[#3E3B36] mb-4 uppercase tracking-[0.1em]">Scan with WhatsApp</p>
                <div className="bg-white p-3 rounded-xl shadow-sm inline-block border border-[#E8E3DA]">
                  {/* Since QRCode component isn't strictly imported in this snippet, use an img for external generation if needed, or import QRCode */}
                  <img src={\`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=\${encodeURIComponent(qrCode)}\`} alt="QR Code" width={200} height={200} className="rounded-lg" />
                </div>
                <p className="text-[10px] text-[#8B8378] mt-4 uppercase tracking-wider animate-pulse flex items-center justify-center gap-2">
                  <RefreshCw size={10} className="animate-spin" /> Awaiting scan...
                </p>
              </div>
            ) : (
              <div className="text-center">
                <Smartphone size={32} className="text-[#C4A896] mx-auto mb-4 opacity-50" />
                <h3 className="text-sm font-bold text-[#3E3B36] mb-2 uppercase tracking-wide">Socket Disconnected</h3>
                <p className="text-xs text-[#8B8378] max-w-xs mx-auto mb-6">
                  Generate a QR code to sync your device. This will establish an inbound-only listener for your retail counter.
                </p>
                <button
                  onClick={() => setShowConnectModal(true)}
                  disabled={connectionStatus === 'INITIALIZING'}
                  className="btn-primary rounded-lg flex items-center gap-2 mx-auto disabled:opacity-50"
                >
                  {connectionStatus === 'INITIALIZING' ? (
                    <><Spinner /> Initializing...</>
                  ) : (
                    <><QrCode size={14} /> Generate QR Code</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

`;
content = content.slice(0, uiInsertPos) + qrUi + content.slice(uiInsertPos);

// 3. Add Modals at the end
const modalsPos = content.indexOf('{/* MODALS */}');
const modalsUi = `
      {showConnectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 transition-opacity duration-300">
          <div className="bg-white rounded-2xl p-6 max-w-md shadow-xl scale-100 transition-transform duration-300">
            <h3 className="text-lg font-bold text-[#3E3B36] mb-3">⚠️ Listener Requirements</h3>
            <ul className="list-disc pl-5 text-sm text-[#8B8378] space-y-2 mb-6">
              <li>This mode operates purely as an INBOUND socket for QR leads.</li>
              <li>You cannot send bulk marketing campaigns through this connection.</li>
              <li>Keep your WhatsApp app open during the QR scan.</li>
            </ul>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConnectModal(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">Cancel</button>
              <button onClick={() => { setShowConnectModal(false); handleGenerateQR(); }} className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium shadow-sm">Proceed to Scan</button>
            </div>
          </div>
        </div>
      )}

      {showDisconnectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 transition-opacity duration-300">
          <div className="bg-white rounded-2xl p-6 max-w-md shadow-xl border-t-4 border-red-500 scale-100 transition-transform duration-300">
            <h3 className="text-lg font-bold text-red-600 mb-3">🚨 Disconnect Listener?</h3>
            <p className="text-sm text-[#8B8378] mb-6">This will stop processing incoming QR lead scans immediately.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDisconnectModal(false)} className="px-4 py-2 bg-[#3E3B36] text-white rounded-lg hover:bg-black transition-colors text-sm font-medium shadow-sm">Keep Connected</button>
              <button onClick={() => { setShowDisconnectModal(false); handleDisconnectQrConnection(); }} className="px-4 py-2 border border-red-200 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium">Force Disconnect</button>
            </div>
          </div>
        </div>
      )}

`;
content = content.slice(0, modalsPos) + modalsUi + content.slice(modalsPos);

fs.writeFileSync(file, content);
