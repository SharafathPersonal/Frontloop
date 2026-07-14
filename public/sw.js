self.addEventListener('push', function(event) {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'New Flash Offer!', body: event.data.text() };
    }
  }

  const title = data.title || 'Exclusive Flash Offer!';
  const options = {
    body: data.body || 'Check out our latest flash offer now!',
    icon: data.icon || '/file.svg',
    badge: data.badge || '/file.svg',
    data: {
      offerId: data.offerId,
      shopSlug: data.shopSlug
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const offerId = event.notification.data?.offerId;
  const shopSlug = event.notification.data?.shopSlug;
  
  if (offerId && shopSlug) {
    const redirectUrl = `${self.location.origin}/offers/${shopSlug}?click_offer_id=${offerId}`;
    
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
  }
});
