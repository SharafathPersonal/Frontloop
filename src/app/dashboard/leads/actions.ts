'use server';

import { requireTenant } from '@/server/auth/dal';
import { forTenant } from '@/server/repos/tenant';
import type { LeadStatus } from '@/server/models/Lead';
import { revalidatePath } from 'next/cache';

export async function toggleBotPausedAction(leadId: string, botPaused: boolean) {
  const session = await requireTenant(['owner', 'staff']);
  const repo = forTenant(session.tenantId);

  try {
    const updated = await repo.toggleBotPaused(leadId, botPaused);
    revalidatePath('/dashboard/leads');
    revalidatePath(`/dashboard/leads/${leadId}`);
    return { ok: true, data: updated };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to update bot pause status',
    };
  }
}

export async function updateLeadStatusAction(leadId: string, status: LeadStatus) {
  const session = await requireTenant(['owner', 'staff']);
  const repo = forTenant(session.tenantId);

  try {
    const updated = await repo.updateLead(leadId, { status });
    revalidatePath('/dashboard/leads');
    revalidatePath(`/dashboard/leads/${leadId}`);
    return { ok: true, data: updated };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to update lead status',
    };
  }
}

export async function updateLeadNotesAction(leadId: string, notes: string) {
  const session = await requireTenant(['owner', 'staff']);
  const repo = forTenant(session.tenantId);

  try {
    const updated = await repo.updateLead(leadId, { notes });
    revalidatePath(`/dashboard/leads/${leadId}`);
    return { ok: true, data: updated };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to save lead notes',
    };
  }
}

