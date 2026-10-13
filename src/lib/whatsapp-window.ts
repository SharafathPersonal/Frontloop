/** Meta's customer-service window: free-form replies are allowed only this long after the customer's last message. */
export const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

export const isWithinServiceWindow = (lastInboundAt: Date | string | null | undefined, now = Date.now()) =>
  lastInboundAt != null && now - new Date(lastInboundAt).getTime() <= SERVICE_WINDOW_MS;
