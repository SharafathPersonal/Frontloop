export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-[#E8E3DA]/60 rounded-lg ${className}`} />
  );
}
