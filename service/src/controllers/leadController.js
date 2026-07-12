const supabase = require('../config/supabase');

const processInboundLead = async (msg, shopId, sock) => {
    console.log("📨 [RAW INBOUND TRIGGER] A message just hit the backend server!");
    console.log("📱 Sender JID:", msg.key?.remoteJid);
    console.log("📝 Message Text Content:", JSON.stringify(msg.message));

    if (msg.key.fromMe || !msg.message) return; 
    
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
    const cleanText = text.toLowerCase().trim();
    
    if (cleanText.length > 0) {
        console.log(`🎯 [MATCHED] Valid QR Lead text from shop ${shopId}. Synchronizing to Supabase...`);
        
        try {
          const rawSender = msg.key.remoteJid;
          // Explicit numeric-only extraction matching dashboard criteria
          let sanitizedNumber = rawSender.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '');
          
          const pushName = msg.pushName || 'Store Customer';
          
          // 1. Credit Verification
          const { data: wallet } = await supabase.from('wallets').select('credits_remaining').eq('shop_id', shopId).maybeSingle();
          if (!wallet || wallet.credits_remaining < 10.0) {
              console.log(`[QR LEAD REJECTED] Insufficient credits for shop ${shopId}`);
              return;
          }

          // 2. Atomic Credit Deduction via RPC
          const { error: deductError } = await supabase.rpc('deduct_credits', {
              p_shop_id: shopId,
              p_amount: 10.0
          });
          
          if (deductError) {
              console.error(`[QR LEAD ERROR] Credit deduction failed:`, deductError);
              return;
          }

          // 3. Dynamic Isolated Tagging and Lead Placement
          const { data: existing } = await supabase.from('customers_master').select('id, tags').eq('shop_id', shopId).eq('whatsapp_number', sanitizedNumber).maybeSingle();
          let newTags = ['IN_STORE_QR_LEAD'];
          if (existing && existing.tags) {
              newTags = Array.from(new Set([...existing.tags.filter(t => t !== 'VIP_InStore' && t !== 'VIP'), 'IN_STORE_QR_LEAD']));
          }
          
          if (existing) {
              const { error: updateError } = await supabase.from('customers_master').update({
                  customer_name: pushName,
                  tags: newTags,
                  source: 'QR_SCAN'
              }).eq('id', existing.id);
              
              if (updateError) throw updateError;
          } else {
              const { error: insertError } = await supabase.from('customers_master').insert({
                  shop_id: shopId,
                  whatsapp_number: sanitizedNumber,
                  customer_name: pushName,
                  tags: ['IN_STORE_QR_LEAD'],
                  source: 'QR_SCAN'
              });
              
              if (insertError) throw insertError;
          }
          console.log("💾 [DB SUCCESS] Lead isolated cleanly under IN_STORE_QR_LEAD tag!");

          // 4. Update QR Analytics
          try {
              await supabase.rpc('increment_qr_analytics', { p_shop_id: shopId });
          } catch (analyticsError) {
              console.error("⚠️ Failed to update QR analytics stats:", analyticsError);
          }

          // 5. Send automated reply via WhatsApp Socket
          const { data: shopInfo } = await supabase.from('shops').select('shop_name, owner_phone').eq('id', shopId).maybeSingle();
          const shopName = shopInfo?.shop_name || 'Our Store';
          const merchantPhone = shopInfo?.owner_phone ? shopInfo.owner_phone.replace(/\D/g, '') : '';
          
          const promoCopy = `Welcome to ${shopName}! 🎁 Please save our number right now to receive exclusive, real-time weekly offers and flash updates directly to your WhatsApp number. Click the official business contact card below to save us instantly to your phone book!`;
          
          await sock.sendMessage(rawSender, {
              text: promoCopy
          });

          if (merchantPhone) {
              const vcard = 'BEGIN:VCARD\n'
                + 'VERSION:3.0\n'
                + `FN:${shopName}\n`
                + `TEL;type=CELL;type=VOICE;waid=${merchantPhone}:+${merchantPhone}\n`
                + 'END:VCARD';

              await sock.sendMessage(rawSender, {
                  contacts: {
                      displayName: shopName,
                      contacts: [{ vcard }]
                  }
              });
          }
          console.log(`✅ [QR LEAD SUCCESS] Welcome sequence dispatched to ${sanitizedNumber}`);

      } catch (err) {
          console.error(`[QR LEAD CRASH] Processing error:`, err);
      }
    }
};

module.exports = {
    processInboundLead
};
