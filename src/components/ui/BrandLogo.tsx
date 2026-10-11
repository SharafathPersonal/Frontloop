import Image from 'next/image';

type BrandLogoSize = 'xs' | 'sm' | 'md' | 'lg';

const SIZES: Record<BrandLogoSize, { mark: number; text: string; gap: string; radius: string }> = {
  xs: { mark: 20, text: 'text-[11px]', gap: 'gap-1.5', radius: 'rounded-[5px]' },
  sm: { mark: 28, text: 'text-[15px]', gap: 'gap-2', radius: 'rounded-[7px]' },
  md: { mark: 34, text: 'text-lg', gap: 'gap-2.5', radius: 'rounded-[9px]' },
  lg: { mark: 44, text: 'text-2xl', gap: 'gap-3', radius: 'rounded-xl' },
};

interface BrandLogoProps {
  size?: BrandLogoSize;
  tone?: 'light' | 'dark';
  showWordmark?: boolean;
  priority?: boolean;
  className?: string;
}

export function BrandLogo({
  size = 'md',
  tone = 'light',
  showWordmark = true,
  priority = false,
  className = '',
}: BrandLogoProps) {
  const s = SIZES[size];

  return (
    <span className={`inline-flex items-center ${s.gap} ${className}`}>
      <span
        className={`relative shrink-0 overflow-hidden ${s.radius} shadow-[0_2px_8px_-2px_rgba(16,185,129,0.45)] ring-1 ring-black/5`}
        style={{ width: s.mark, height: s.mark }}
      >
        <Image
          src="/images/logo-mark.png"
          alt={showWordmark ? '' : 'FrontLoop'}
          fill
          sizes={`${s.mark * 2}px`}
          className="object-cover"
          priority={priority}
        />
      </span>
      {showWordmark && (
        <span className={`brand-wordmark ${s.text} leading-none`}>
          <span className={tone === 'dark' ? 'text-white' : 'text-[#0F172A]'}>Front</span>
          <span className="bg-gradient-to-r from-[#10B981] via-[#0EA5A0] to-[#0891B2] bg-clip-text text-transparent">
            Loop
          </span>
        </span>
      )}
    </span>
  );
}
