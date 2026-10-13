export function Spinner({ tone = 'muted', className = '' }: { tone?: 'muted' | 'light'; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-spin border-2 ${tone === 'light' ? 'border-white' : 'border-[#64748B]'} border-t-transparent w-4 h-4 rounded-full ${className}`}
    />
  );
}
