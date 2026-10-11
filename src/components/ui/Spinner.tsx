export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-spin border-2 border-[#64748B] border-t-transparent w-4 h-4 rounded-full ${className}`} />
  );
}
