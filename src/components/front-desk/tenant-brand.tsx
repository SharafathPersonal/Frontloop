import { ShieldCheck } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  clinic: 'Clinic & Healthcare',
  institute: 'Education & Coaching',
  restaurant: 'Restaurant & Café',
  salon: 'Salon & Wellness',
  retail: 'Retail Store',
  other: 'Local Business',
};

export const categoryLabel = (category: string) => CATEGORY_LABELS[category] ?? 'Local Business';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || 'FL';

/** Tenants have no uploaded logo yet, so the avatar is their initials on brand emerald. */
export function TenantAvatar({ name, size = 'lg' }: { name: string; size?: 'sm' | 'lg' }) {
  const box = size === 'lg' ? 'h-20 w-20 text-2xl rounded-3xl' : 'h-9 w-9 text-xs rounded-full';
  return (
    <div aria-hidden="true" className={`${box} shrink-0 bg-[#047857] text-white font-bold flex items-center justify-center shadow-sm`}>
      {initials(name)}
    </div>
  );
}

/** "24/7 AI Receptionist" describes the service, not a business verification, so that is all the badge claims. */
export function ReceptionistBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#047857]/25 bg-[#ECFDF5] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#065F46]">
      <ShieldCheck size={13} aria-hidden="true" />
      24/7 AI Receptionist
    </span>
  );
}
