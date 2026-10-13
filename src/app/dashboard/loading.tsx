/** Shown inside the dashboard shell while a page's server data loads. */
export default function DashboardLoading() {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="space-y-8 max-w-6xl pb-16 animate-pulse">
      <span className="sr-only">Loading your workspace...</span>

      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-6 md:p-8 space-y-3">
        <div className="h-3 w-32 rounded bg-[#E2E8F0]" />
        <div className="h-7 w-64 max-w-full rounded bg-[#E2E8F0]" />
        <div className="h-3 w-96 max-w-full rounded bg-[#F1F5F9]" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 space-y-3">
            <div className="h-3 w-24 rounded bg-[#E2E8F0]" />
            <div className="h-8 w-16 rounded bg-[#E2E8F0]" />
            <div className="h-2.5 w-full rounded bg-[#F1F5F9]" />
          </div>
        ))}
      </div>

      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-6 space-y-4">
        <div className="h-4 w-40 rounded bg-[#E2E8F0]" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between gap-4 py-2">
            <div className="flex items-center gap-3 flex-1">
              <div className="h-7 w-7 rounded-full bg-[#E2E8F0] shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-3 w-40 max-w-full rounded bg-[#E2E8F0]" />
                <div className="h-2.5 w-64 max-w-full rounded bg-[#F1F5F9]" />
              </div>
            </div>
            <div className="h-3 w-16 rounded bg-[#F1F5F9]" />
          </div>
        ))}
      </div>
    </div>
  );
}
