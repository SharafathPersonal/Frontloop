import { requireTenant } from '@/server/auth/dal';

// TODO(phase-2): tenant settings, WhatsApp Embedded Signup connect flow, knowledge base form.
export default async function SettingsPage() {
  await requireTenant();

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <h1 className="serif-headline text-2xl md:text-3xl text-[#3E3B36]">Settings</h1>
      <div className="mt-6 bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-6 md:p-8">
        <p className="text-sm text-[#8B8378]">
          Business settings, WhatsApp connection and knowledge base management are coming soon.
        </p>
      </div>
    </div>
  );
}
