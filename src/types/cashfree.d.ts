declare module '@cashfreepayments/cashfree-js' {
  export interface CashfreeInstance {
    checkout(options: { paymentSessionId: string; returnUrl?: string }): void;
  }
  export function load(options: { mode: 'sandbox' | 'production' }): Promise<CashfreeInstance | null>;
}
