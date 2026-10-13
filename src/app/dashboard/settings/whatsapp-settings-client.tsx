'use client';

import { useId, useState, useTransition } from 'react';
import { AlertCircle, ExternalLink, Info, KeyRound, Phone, PlugZap, RotateCw, Unplug } from 'lucide-react';
import CustomConfirm from '@/components/ui/CustomConfirm';
import { useToast } from '@/contexts/ToastContext';
import { disconnectWhatsAppAction, saveWhatsAppConfigAction } from './actions';

export type WhatsAppStatus = 'disconnected' | 'connected' | 'error';

interface WhatsAppSettingsProps {
  status: WhatsAppStatus;
  phoneNumberId: string | null;
  wabaId: string | null;
  displayPhoneNumber: string | null;
  lastError: string | null;
  hasStoredToken: boolean;
  canManage: boolean;
}

const STATUS_BADGE: Record<WhatsAppStatus, { label: string; className: string }> = {
  connected: { label: 'Connected', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  error: { label: 'Needs attention', className: 'bg-rose-50 text-rose-800 border-rose-200' },
  disconnected: { label: 'Disconnected', className: 'bg-amber-50 text-amber-800 border-amber-200' },
};

const mask = (id: string) => (id.length > 4 ? `…${id.slice(-4)}` : id);

const inputClass =
  'w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#047857] focus:ring-1 focus:ring-[#047857] disabled:opacity-60';
const labelClass = 'block text-[11px] font-bold uppercase tracking-wider text-[#0F172A] mb-1';
const hintClass = 'text-[10px] text-[#64748B] mt-1 leading-relaxed';

export default function WhatsAppSettingsClient({
  status,
  phoneNumberId,
  wabaId,
  displayPhoneNumber,
  lastError,
  hasStoredToken,
  canManage,
}: WhatsAppSettingsProps) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(status !== 'connected');
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    phoneNumberId: phoneNumberId ?? '',
    wabaId: wabaId ?? '',
    displayPhoneNumber: displayPhoneNumber ?? '',
    accessToken: '',
  });

  const ids = {
    phone: useId(),
    phoneHint: useId(),
    waba: useId(),
    wabaHint: useId(),
    display: useId(),
    displayHint: useId(),
    token: useId(),
    tokenHint: useId(),
    error: useId(),
  };

  const badge = STATUS_BADGE[status];
  const tokenOptional = hasStoredToken;
  const showForm = canManage && (isEditing || status !== 'connected');

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    startTransition(async () => {
      const result = await saveWhatsAppConfigAction(form);
      if (result.ok) {
        setForm((prev) => ({ ...prev, accessToken: '' }));
        setIsEditing(false);
        showToast(result.message, 'success');
      } else {
        setFormError(result.error);
        showToast(result.error, 'error');
      }
    });
  };

  const handleDisconnect = () => {
    setConfirmDisconnect(false);
    startTransition(async () => {
      const result = await disconnectWhatsAppAction();
      if (result.ok) {
        setForm((prev) => ({ ...prev, phoneNumberId: '', accessToken: '' }));
        setIsEditing(true);
        showToast(result.message, 'info');
      } else {
        showToast(result.error, 'error');
      }
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#0F172A] flex items-center gap-2">
          <Phone size={15} className="text-[#047857]" aria-hidden="true" />
          WhatsApp Cloud Connectivity
        </h2>
        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {status === 'error' && (
        <div role="alert" className="p-3 rounded-xl text-xs font-medium flex items-start gap-2 border bg-rose-50 text-rose-800 border-rose-200">
          <AlertCircle size={15} className="shrink-0 mt-px" aria-hidden="true" />
          <span>
            {lastError || 'Meta rejected the stored credentials.'} Automated replies are failing until you reconnect with a valid token.
          </span>
        </div>
      )}

      {status === 'connected' && (
        <dl className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-1 xl:grid-cols-3 gap-3 text-xs">
          <div className="bg-[#F8FAFC] rounded-lg p-2.5">
            <dt className="text-[10px] uppercase tracking-wider text-[#64748B] font-bold">Phone number</dt>
            <dd className="font-mono font-semibold text-[#0F172A] mt-0.5 break-all">{displayPhoneNumber || '-'}</dd>
          </div>
          <div className="bg-[#F8FAFC] rounded-lg p-2.5">
            <dt className="text-[10px] uppercase tracking-wider text-[#64748B] font-bold">Phone Number ID</dt>
            <dd className="font-mono font-semibold text-[#0F172A] mt-0.5" title="Masked for privacy">
              {phoneNumberId ? mask(phoneNumberId) : '-'}
            </dd>
          </div>
          <div className="bg-[#F8FAFC] rounded-lg p-2.5">
            <dt className="text-[10px] uppercase tracking-wider text-[#64748B] font-bold">WABA ID</dt>
            <dd className="font-mono font-semibold text-[#0F172A] mt-0.5 break-all">{wabaId || '-'}</dd>
          </div>
        </dl>
      )}

      {canManage && status === 'connected' && !isEditing && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 bg-[#F8FAFC] hover:bg-[#E2E8F0] text-[#0F172A] border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            <KeyRound size={12} aria-hidden="true" />
            Update credentials
          </button>
          <button
            type="button"
            onClick={() => setConfirmDisconnect(true)}
            disabled={isPending}
            aria-busy={isPending}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            {isPending ? <RotateCw size={12} className="animate-spin" aria-hidden="true" /> : <Unplug size={12} aria-hidden="true" />}
            Disconnect
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} noValidate className="space-y-3 pt-1" aria-describedby={formError ? ids.error : undefined}>
          <details className="text-[11px] text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3">
            <summary className="cursor-pointer font-semibold text-[#0F172A] flex items-center gap-1.5">
              <Info size={12} aria-hidden="true" />
              Where do I find these values?
            </summary>
            <ol className="list-decimal pl-4 mt-2 space-y-1 leading-relaxed">
              <li>
                Open your app in the{' '}
                <a
                  href="https://developers.facebook.com/apps/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#047857] font-semibold inline-flex items-center gap-0.5 hover:underline"
                >
                  Meta Developer Console <ExternalLink size={10} aria-hidden="true" />
                </a>{' '}
                → WhatsApp → API Setup. Copy the <strong>Phone number ID</strong> and{' '}
                <strong>WhatsApp Business Account ID</strong>.
              </li>
              <li>
                In Business Settings → Users → System users, generate a token with{' '}
                <code className="font-mono">whatsapp_business_messaging</code> and{' '}
                <code className="font-mono">whatsapp_business_management</code>, set to never expire.
              </li>
              <li>We test the credentials with Meta and subscribe your account to our webhook before saving.</li>
            </ol>
          </details>

          <div>
            <label htmlFor={ids.phone} className={labelClass}>Phone Number ID</label>
            <input
              id={ids.phone}
              name="phoneNumberId"
              inputMode="numeric"
              autoComplete="off"
              required
              value={form.phoneNumberId}
              onChange={update('phoneNumberId')}
              disabled={isPending}
              placeholder="e.g. 106540352242922"
              aria-describedby={ids.phoneHint}
              className={inputClass}
            />
            <p id={ids.phoneHint} className={hintClass}>WhatsApp → API Setup → &ldquo;Phone number ID&rdquo; (not the phone number itself).</p>
          </div>

          <div>
            <label htmlFor={ids.waba} className={labelClass}>WhatsApp Business Account ID</label>
            <input
              id={ids.waba}
              name="wabaId"
              inputMode="numeric"
              autoComplete="off"
              required
              value={form.wabaId}
              onChange={update('wabaId')}
              disabled={isPending}
              placeholder="e.g. 102290129340398"
              aria-describedby={ids.wabaHint}
              className={inputClass}
            />
            <p id={ids.wabaHint} className={hintClass}>Shown under the phone number ID on the same API Setup page.</p>
          </div>

          <div>
            <label htmlFor={ids.display} className={labelClass}>Display Phone Number</label>
            <input
              id={ids.display}
              name="displayPhoneNumber"
              type="tel"
              autoComplete="off"
              required
              value={form.displayPhoneNumber}
              onChange={update('displayPhoneNumber')}
              disabled={isPending}
              placeholder="+91 98765 43210"
              aria-describedby={ids.displayHint}
              className={inputClass}
            />
            <p id={ids.displayHint} className={hintClass}>Include the country code. Must match the number registered with Meta.</p>
          </div>

          <div>
            <label htmlFor={ids.token} className={labelClass}>
              Permanent Access Token{tokenOptional && <span className="normal-case font-medium text-[#64748B]"> (optional)</span>}
            </label>
            <input
              id={ids.token}
              name="accessToken"
              type="password"
              autoComplete="off"
              spellCheck={false}
              required={!tokenOptional}
              value={form.accessToken}
              onChange={update('accessToken')}
              disabled={isPending}
              placeholder={tokenOptional ? 'Leave blank to keep the saved token' : 'EAAG…'}
              aria-describedby={ids.tokenHint}
              className={inputClass}
            />
            <p id={ids.tokenHint} className={hintClass}>
              Encrypted with AES-256-GCM before it is stored and never shown again.
            </p>
          </div>

          <div aria-live="polite">
            {formError && (
              <p id={ids.error} role="alert" className="p-3 rounded-xl text-xs font-medium flex items-start gap-2 border bg-rose-50 text-rose-800 border-rose-200">
                <AlertCircle size={15} className="shrink-0 mt-px" aria-hidden="true" />
                {formError}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={isPending}
              aria-busy={isPending}
              className="inline-flex items-center justify-center gap-1.5 bg-[#047857] hover:bg-[#065F46] text-white rounded-lg px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? <RotateCw size={12} className="animate-spin" aria-hidden="true" /> : <PlugZap size={12} aria-hidden="true" />}
              {isPending ? 'Testing with Meta…' : 'Test & Connect WhatsApp'}
            </button>
            {status === 'connected' && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setFormError(null);
                }}
                disabled={isPending}
                className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] hover:text-[#0F172A] px-3 py-2 disabled:opacity-50"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {!canManage && (
        <p className="text-[11px] text-[#64748B] flex items-center gap-1.5 pt-1">
          <Info size={12} aria-hidden="true" />
          Only the account owner can connect or change the WhatsApp number.
        </p>
      )}

      <CustomConfirm
        isOpen={confirmDisconnect}
        type="danger"
        title="Disconnect WhatsApp?"
        message="Your AI agent will stop replying immediately and the stored access token will be deleted. You can reconnect later with a new token."
        confirmText="DISCONNECT"
        onConfirm={handleDisconnect}
        onCancel={() => setConfirmDisconnect(false)}
      />
    </div>
  );
}
