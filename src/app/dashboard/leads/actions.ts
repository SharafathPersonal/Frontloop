'use server';

import { z } from 'zod';
import { requireTenant } from '@/server/auth/dal';
import { forTenant } from '@/server/repos/tenant';
import { LEAD_STATUSES, type LeadStatus } from '@/server/models/Lead';
import { revalidatePath } from 'next/cache';

// Server Actions are public POST endpoints: never trust the TypeScript signature.
const LeadIdSchema = z.string().regex(/^[a-f0-9]{24}$/, 'Invalid lead id');
const StatusSchema = z.enum(LEAD_STATUSES);
const NotesSchema = z.string().max(2000, 'Notes cannot exceed 2,000 characters');

type ActionResult = { ok: true } | { ok: false; error: string };

async function mutateLead(
  leadId: unknown,
  run: (repo: ReturnType<typeof forTenant>, id: string) => Promise<unknown>,
  fallbackError: string,
): Promise<ActionResult> {
  const session = await requireTenant(['owner', 'staff']);
  const id = LeadIdSchema.safeParse(leadId);
  if (!id.success) return { ok: false, error: 'Invalid lead id' };

  try {
    const updated = await run(forTenant(session.tenantId), id.data);
    if (!updated) return { ok: false, error: 'Lead not found' };
    revalidatePath('/dashboard/leads');
    revalidatePath(`/dashboard/leads/${id.data}`);
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : fallbackError };
  }
}

export async function toggleBotPausedAction(leadId: string, botPaused: boolean) {
  const paused = z.boolean().safeParse(botPaused);
  if (!paused.success) return { ok: false, error: 'Invalid value' } as const;
  return mutateLead(leadId, (repo, id) => repo.toggleBotPaused(id, paused.data), 'Failed to update bot pause status');
}

export async function updateLeadStatusAction(leadId: string, status: LeadStatus) {
  const parsed = StatusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, error: 'Invalid status' } as const;
  return mutateLead(leadId, (repo, id) => repo.updateLead(id, { status: parsed.data }), 'Failed to update lead status');
}

export async function updateLeadNotesAction(leadId: string, notes: string) {
  const parsed = NotesSchema.safeParse(notes);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message } as const;
  return mutateLead(leadId, (repo, id) => repo.updateLead(id, { notes: parsed.data }), 'Failed to save lead notes');
}
