import { requireTenant } from '@/server/auth/dal';

// TODO(phase-2): leads overview + leads table.
export default async function DashboardPage() {
  await requireTenant();

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <h1 className="serif-headline text-2xl md:text-3xl text-[#3E3B36]">Dashboard</h1>
      <div className="mt-6 bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-6 md:p-8">
        <p className="text-sm text-[#8B8378]">
          Your workspace is ready. Lead capture and conversation history will appear here once your
          WhatsApp number is connected.
        </p>
      </div>
    </div>
  );
}
