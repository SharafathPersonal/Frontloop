self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Received.');
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (err) {
    console.error('[Service Worker] Payload JSON parsing failed:', err);
    payload = { title: 'Notification', body: event.data ? event.data.text() : 'New Update' };
  }

  const title = payload.title || 'True Attendly';
  const clickUrl = payload.url || (payload.data && payload.data.click_url);
  const options = {
    body: payload.body || 'Click to view the latest update.',
    icon: payload.icon || '/favicon.ico',
    badge: payload.badge || '/favicon.ico',
    data: Object.assign({
      url: clickUrl || '/'
    }, payload.data || {})
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => console.log('[Service Worker] Notification shown successfully.'))
      .catch(err => console.error('[Service Worker] Failed to show notification:', err))
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  const payloadData = event.notification.data || {};
  let redirectUrl = payloadData.click_url || payloadData.url;
  
  if (!redirectUrl && (payloadData.shop_slug || payloadData.shopSlug) && (payloadData.offer_id || payloadData.offerId)) {
    redirectUrl = `/offers/${payloadData.shop_slug || payloadData.shopSlug}?click_offer_id=${payloadData.offer_id || payloadData.offerId}`;
  }
  
  if (redirectUrl) {
    // Convert relative URLs to absolute URLs relative to the SW scope
    if (redirectUrl.startsWith('/')) {
      redirectUrl = self.location.origin + redirectUrl;
    }
    
    console.log('[Service Worker] Notification clicked. Redirecting to:', redirectUrl);
    
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(function(clientList) {
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if (client.url === redirectUrl && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(redirectUrl);
        }
      })
    );
  } else {
    console.warn('[Service Worker] Clicked notification, but no redirect URL was resolved.');
  }
});
