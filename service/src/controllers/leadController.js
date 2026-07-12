const supabase = require('../config/supabase');

// ── GATE 1: ACTIVE IN-MEMORY DE-DUPLICATION CACHE ────────────────────────────
const processedMessageIds = new Map(); // messageId -> timestamp

const isInMemoryDuplicate = (messageId) => {
    if (!messageId) return false;
    const now = Date.now();
    
    // Purge entries older than 5 minutes to keep memory footprint low
    for (const [id, timestamp] of processedMessageIds.entries()) {
        if (now - timestamp > 5 * 60 * 1000) {
            processedMessageIds.delete(id);
        }
    }
    
    if (processedMessageIds.has(messageId)) {
        return true;
    }
    processedMessageIds.set(messageId, now);
    return false;
};

const extractText = (msg) => {
    if (!msg || !msg.message) return "";

    const m = msg.message;
    
    // Direct text fields
    if (m.conversation) return m.conversation;
    if (m.extendedTextMessage?.text) return m.extendedTextMessage.text;
    if (m.text) return m.text;

    // Media captions
    if (m.imageMessage?.caption) return m.imageMessage.caption;
    if (m.videoMessage?.caption) return m.videoMessage.caption;
    if (m.documentMessage?.caption) return m.documentMessage.caption;

    // Ephemeral & ViewOnce wrappers
    if (m.ephemeralMessage?.message) {
        return extractText({ message: m.ephemeralMessage.message });
    }
    if (m.viewOnceMessage?.message) {
        return extractText({ message: m.viewOnceMessage.message });
    }
    if (m.viewOnceMessageV2?.message) {
        return extractText({ message: m.viewOnceMessageV2.message });
    }
    if (m.documentWithCaptionMessage?.message) {
        return extractText({ message: m.documentWithCaptionMessage.message });
    }
    if (m.editMessage?.message) {
        return extractText({ message: m.editMessage.message });
    }

    // Interactive response structures
    if (m.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
        try {
            const params = JSON.parse(m.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson);
            if (params?.id) return params.id;
        } catch (e) {}
    }
    if (m.templateButtonReplyMessage?.selectedId) {
        return m.templateButtonReplyMessage.selectedId;
    }
    if (m.buttonsResponseMessage?.selectedButtonId) {
        return m.buttonsResponseMessage.selectedButtonId;
    }
    if (m.listResponseMessage?.singleSelectReply?.selectedRowId) {
        return m.listResponseMessage.singleSelectReply.selectedRowId;
    }
    if (m.interactive?.button_reply?.title) {
        return m.interactive.button_reply.title;
    }
    if (m.interactive?.button_reply?.id) {
        return m.interactive.button_reply.id;
    }
    if (m.interactive?.list_reply?.title) {
        return m.interactive.list_reply.title;
    }
    if (m.interactive?.list_reply?.id) {
        return m.interactive.list_reply.id;
    }
    if (m.button?.text) {
        return m.button.text;
    }

    return "";
};

const sanitizeText = (text) => {
    if (!text) return "";
    
    // Remove markdown formatting: *, _, ~
    let clean = String(text).replace(/[\*\_~]/g, '');
    
    // Remove emojis
    clean = clean.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
    
    // Replace multiple spaces/tabs/newlines with a single space
    clean = clean.replace(/\s+/g, ' ');
    
    return clean.toLowerCase().trim();
};

const processInboundLead = async (msg, shopId, sock, store) => {
    try {
        // ── GATE 1: IMMEDIATE SYNC BOUNDARY (IN-MEMORY CACHE) ────────────────────────────
        const messageId = msg?.key?.id;
        if (!messageId) return;

        if (isInMemoryDuplicate(messageId)) {
            console.log(`[GATE 1] Duplicate message ID ${messageId} detected in-memory. Aborting.`);
            return;
        }

        // ── GATE 2: RIGOROUS INGRESS & SENDER SCOPE FILTER ────────────────────────────────
        const remoteJid = msg?.key?.remoteJid || "";
        const participant = msg?.key?.participant || msg?.participant;

        // Block group, broadcast, newsletter contexts, and own messages
        if (participant || remoteJid.endsWith('@g.us') || remoteJid.endsWith('@broadcast') || remoteJid.endsWith('@newsletter') || msg?.key?.fromMe) {
            console.log(`[GATE 2] Non-individual or self context blocked (participant: ${participant}, remoteJid: ${remoteJid})`);
            return;
        }

        // ── GATE 3: SENDER JID MASK VALIDATION ──────────────────────────────────────────
        if (!/^\d+@s\.whatsapp\.net$/.test(remoteJid) && !/^\d+@lid$/.test(remoteJid)) {
            console.log(`[GATE 3] Invalid individual JID format blocked: ${remoteJid}`);
            return;
        }

        // Keep the check for missing message structure
        if (!msg?.message) {
            return;
        }

        // ── GATE 4: MARKOV-SAFE MEDIA & CAPTION INTENT GATEWAY ──────────────────────────
        const rawText = extractText(msg);
        const cleanText = sanitizeText(rawText);

        const allowedKeywordsSanitized = [
            "add me to broadcast",
            "true attendly connect",
            "addmetobroadcast",
            "trueattendlyconnect"
        ];
        
        const isExactMatch = allowedKeywordsSanitized.some(k => k === cleanText);
        if (!isExactMatch) {
            console.log(`[GATE 4] Intent check failed. Clean text: "${cleanText}" does not match keywords.`);
            return;
        }

        console.log("📨 [RAW INBOUND TRIGGER] A validated QR Lead message hit the backend server!");
        console.log("📝 Message Text Content:", cleanText);

        // ── GATE 6: ADVANCED LID-TO-MSISDN FOOTPRINT RESOLUTION ───────────────────────
        let resolvedJid = remoteJid;

        if (resolvedJid.endsWith('@lid')) {
            console.log(`[GATE 6] Attempting to resolve LID JID: ${resolvedJid}`);
            
            let mappedJid = null;
            const storeContacts = store?.contacts || sock?.store?.contacts;

            if (storeContacts) {
                // 1. Direct lookup in store.contacts
                const contact = storeContacts[resolvedJid];
                if (contact) {
                    if (contact.id && contact.id.endsWith('@s.whatsapp.net')) {
                        mappedJid = contact.id;
                        console.log(`[GATE 6] Resolved LID via contact.id: ${mappedJid}`);
                    } else if (contact.phoneNumber) {
                        mappedJid = contact.phoneNumber.includes('@') ? contact.phoneNumber : `${contact.phoneNumber}@s.whatsapp.net`;
                        console.log(`[GATE 6] Resolved LID via contact.phoneNumber: ${mappedJid}`);
                    }
                }
                
                // 2. Scan all store contacts for LID mapping
                if (!mappedJid) {
                    for (const [jid, c] of Object.entries(storeContacts)) {
                        if (c.lid === resolvedJid || c.id === resolvedJid) {
                            if (jid.endsWith('@s.whatsapp.net')) {
                                mappedJid = jid;
                                console.log(`[GATE 6] Resolved LID via store key mapping: ${mappedJid}`);
                                break;
                            } else if (c.id && c.id.endsWith('@s.whatsapp.net')) {
                                mappedJid = c.id;
                                console.log(`[GATE 6] Resolved LID via store value ID: ${mappedJid}`);
                                break;
                            } else if (c.phoneNumber) {
                                mappedJid = c.phoneNumber.includes('@') ? c.phoneNumber : `${c.phoneNumber}@s.whatsapp.net`;
                                console.log(`[GATE 6] Resolved LID via store value phoneNumber: ${mappedJid}`);
                                break;
                            }
                        }
                    }
                }
            }
            
            if (mappedJid) {
                resolvedJid = mappedJid;
            }
        }

        // If the LID cannot be resolved to a standard MSISDN format, drop execution instantly BEFORE writing database rows
        if (resolvedJid.endsWith('@lid') || !resolvedJid.endsWith('@s.whatsapp.net')) {
            console.warn(`[GATE 6 WARNING] Could not resolve LID to standard MSISDN JID: ${resolvedJid}. Aborting to prevent DB poisoning.`);
            return;
        }

        // Extract and sanitize digits
        const cleanPhone = resolvedJid.split('@')[0].replace(/\D/g, '');
        let sanitizedNumber = cleanPhone;
        if (sanitizedNumber.length === 10) {
            sanitizedNumber = '91' + sanitizedNumber;
        }

        if (sanitizedNumber.length < 10 || sanitizedNumber.length > 15) {
            console.error(`[GATE 6] Sanitized phone number length invalid: ${sanitizedNumber}. Aborting.`);
            return;
        }

        // ── GATE 5: ATOMIC DB DEDUPLICATION (THE TRANS-LOCK) ───────────────────────────
        try {
            const { error: insertError } = await supabase.from('whatsapp_sessions').insert({
                shop_id: shopId,
                session_key: `msg_dedup_${messageId}`,
                session_value: { created_at: new Date().toISOString() },
                updated_at: new Date().toISOString()
            });

            if (insertError) {
                if (insertError.code === '23505') {
                    console.log(`[GATE 5] Duplicate message ID ${messageId} detected via DB constraint (23505). Aborting.`);
                    return;
                }
                throw insertError;
            }
        } catch (dbErr) {
            if (dbErr && (dbErr.code === '23505' || dbErr.message?.includes('23505'))) {
                console.log(`[GATE 5] Duplicate message ID ${messageId} detected via caught DB constraint (23505). Aborting.`);
                return;
            }
            console.error(`[GATE 5] DB insertion error during de-duplication check:`, dbErr);
            return;
        }

        // Asynchronously clear message deduplication logs older than 24 hours (TTL: 24h)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        supabase.from('whatsapp_sessions')
            .delete()
            .eq('shop_id', shopId)
            .like('session_key', 'msg_dedup_%')
            .lt('updated_at', oneDayAgo)
            .then(({ error }) => {
                if (error) console.error("Error cleaning up old message deduplication keys:", error);
            });

        // ── GATE 7: COOLDOWN PRE-FLIGHT MERCHANT BALANCE CHECKS ───────────────────────
        const cooldownKey = `cooldown_${sanitizedNumber}`;
        const { data: cooldownSession } = await supabase
            .from('whatsapp_sessions')
            .select('updated_at')
            .eq('shop_id', shopId)
            .eq('session_key', cooldownKey)
            .maybeSingle();

        if (cooldownSession) {
            const lastInteraction = new Date(cooldownSession.updated_at).getTime();
            const now = Date.now();
            if (now - lastInteraction < 24 * 60 * 60 * 1000) {
                console.log(`[GATE 7 COOLDOWN] Outreach already sent within 24h for ${sanitizedNumber}. Aborting quietly.`);
                return;
            }
        }

        const { data: existingContact } = await supabase
            .from('customers_master')
            .select('id, created_at')
            .eq('shop_id', shopId)
            .eq('whatsapp_number', sanitizedNumber)
            .maybeSingle();

        const pushName = msg.pushName || 'Store Customer';

        if (existingContact) {
            // Update/insert the cooldown timestamp
            await supabase.from('whatsapp_sessions').upsert({
                shop_id: shopId,
                session_key: cooldownKey,
                session_value: { last_sent: new Date().toISOString() },
                updated_at: new Date().toISOString()
            }, { onConflict: 'shop_id, session_key' });

            // Send "Already connected" notification once
            const { data: shopInfo } = await supabase
                .from('shops')
                .select('shop_name')
                .eq('id', shopId)
                .maybeSingle();
            
            const shopName = shopInfo?.shop_name || 'Our Store';
            const alreadyConnectedMsg = `Your number is already saved / You are already connected to ${shopName}!`;

            try {
                await sock.sendMessage(remoteJid, { text: alreadyConnectedMsg });
            } catch (sendError) {
                console.error(`[GATE 7 ERROR] Failed to send duplicate message:`, sendError);
            }
            console.log(`[GATE 7] Customer ${sanitizedNumber} is already connected. Notice sent, aborting early.`);
            return;
        }

        // Wallet Solvent check
        const { data: wallet } = await supabase
            .from('wallets')
            .select('credits_remaining')
            .eq('shop_id', shopId)
            .maybeSingle();

        const creditsRemaining = wallet ? Number(wallet.credits_remaining) : 0;

        const { data: settingData } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'qr_leads_credit_cost')
            .maybeSingle();
        const qrCost = settingData && settingData.value ? Number(settingData.value) : 10.0;

        if (creditsRemaining < qrCost) {
            console.log(`[GATE 7 WALLET INSOLVENCY] Pre-flight insolvency for shop ${shopId}. Registering missed lead.`);
            try {
                await supabase.from('customers_master').insert({
                    shop_id: shopId,
                    whatsapp_number: sanitizedNumber,
                    customer_name: pushName,
                    tags: ['MISSED_LEAD'],
                    source: 'QR_SCAN'
                });
            } catch (insertError) {
                console.error(`[GATE 7] Missed lead insert failed:`, insertError);
            }
            return;
        }

        // ── GATE 8: ATOMIC LEAD INSERTION & DEFERRED WALLET BILLING ────────────────────
        try {
            // 1. Insert customer lead first
            const { error: insertError } = await supabase.from('customers_master').insert({
                shop_id: shopId,
                whatsapp_number: sanitizedNumber,
                customer_name: pushName,
                tags: ['IN_STORE_QR_LEAD'],
                source: 'QR_SCAN'
            });

            if (insertError) {
                if (insertError.code === '23505') {
                    console.log(`[GATE 8] Lead insertion collision for ${sanitizedNumber}. Aborting.`);
                    return;
                }
                throw insertError;
            }
            console.log(`[GATE 8] Lead registered in customers_master first for ${sanitizedNumber}`);

            // 2. Wallet billing deduction via RPC
            const { error: deductError } = await supabase.rpc('deduct_credits', {
                p_shop_id: shopId,
                p_amount: qrCost
            });

            if (deductError) {
                throw deductError;
            }

            console.log(`[GATE 8] Charged ${qrCost} credits from shop ${shopId}`);

            // 3. Increment counters
            await supabase.rpc('increment_credits_used', { p_shop_id: shopId });

            try {
                await supabase.rpc('increment_qr_analytics', { p_shop_id: shopId, p_credits: qrCost });
            } catch (analyticsError) {
                console.error("[GATE 8 WARNING] Failed to update QR analytics stats:", analyticsError);
            }

            // Update cooldown session so new leads are also rate-limited
            await supabase.from('whatsapp_sessions').upsert({
                shop_id: shopId,
                session_key: cooldownKey,
                session_value: { last_sent: new Date().toISOString() },
                updated_at: new Date().toISOString()
            }, { onConflict: 'shop_id, session_key' });

        } catch (billingOrInsertError) {
            console.error(`[GATE 8 FAULT] Downgrading lead for ${sanitizedNumber}:`, billingOrInsertError);
            
            // Downgrade tag to MISSED_LEAD and reset credits
            try {
                await supabase
                    .from('customers_master')
                    .update({ tags: ['MISSED_LEAD'] })
                    .eq('shop_id', shopId)
                    .eq('whatsapp_number', sanitizedNumber);
            } catch (updateError) {
                console.error(`[GATE 8] Failed to downgrade lead tag for ${sanitizedNumber}:`, updateError);
            }
            return;
        }

        // ── GATE 9: COMPLIANT AUTOMATED DELIVERY DISPATCH ────────────────────────────
        const { data: shopInfo } = await supabase
            .from('shops')
            .select('shop_name, owner_phone')
            .eq('id', shopId)
            .maybeSingle();

        const shopName = shopInfo?.shop_name || 'Our Store';
        const merchantPhone = shopInfo?.owner_phone ? shopInfo.owner_phone.replace(/\D/g, '') : '';

        const promoCopy = `Welcome to ${shopName}! 🎁 \n\nSave our number right now to get exclusive, real-time weekly offers directly on WhatsApp. \n\n👇 Click the contact card below to save us instantly!`;

        try {
            await sock.sendMessage(remoteJid, { text: promoCopy });

            if (merchantPhone) {
                const vcard = 'BEGIN:VCARD\n'
                    + 'VERSION:3.0\n'
                    + `N:${shopName};;;\n` // Compliant N structure
                    + `FN:${shopName}\n`   // Compliant FN structure
                    + `TEL;type=CELL;type=VOICE;waid=${merchantPhone}:+${merchantPhone}\n`
                    + 'END:VCARD';

                await sock.sendMessage(remoteJid, {
                    contacts: {
                        displayName: shopName,
                        contacts: [{ vcard }]
                    }
                });
            }
            console.log(`[GATE 9] Welcome sequence successfully dispatched to ${sanitizedNumber}`);
        } catch (sendError) {
            console.error(`[GATE 9] Failed to send welcome flow:`, sendError);
        }

    } catch (err) {
        console.error(`[QR LEAD CRASH] Processing error:`, err);
    }
};

module.exports = {
    processInboundLead
};
