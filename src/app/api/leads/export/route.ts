import 'server-only';
import { NextRequest } from 'next/server';
import { requireTenantApi } from '@/server/auth/dal';
import { forTenant } from '@/server/repos/tenant';
import type { LeadStatus } from '@/server/models/Lead';

export const dynamic = 'force-dynamic';

/**
 * Escapes fields to prevent CSV / formula injection (CWE-1236).
 * Any cell starting with =, +, -, @, \t, or \r has a prepended single quote.
 */
function sanitizeCsvCell(value: unknown): string {
  if (value == null) return '""';
  let str = String(value);

  // Formula injection check
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Quote escaping
  return `"${str.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const sessionOrRes = await requireTenantApi(['owner', 'staff']);
  if (sessionOrRes instanceof Response) return sessionOrRes;

  const tenantId = sessionOrRes.tenantId;
  const repo = forTenant(tenantId);

  const statusParam = req.nextUrl.searchParams.get('status') as LeadStatus | null;
  const filter = statusParam ? { status: statusParam } : {};

  const leads = await repo.getLeadsForExport(filter);

  const headers = [
    'Lead ID',
    'Phone',
    'Customer Name',
    'Profile Name',
    'Status',
    'Intent',
    'Requirement',
    'Bot Paused',
    'Message Count',
    'Last Inbound',
    'Last Message At',
    'Created At',
  ];

  const rows: string[] = [headers.join(',')];

  for (const lead of leads) {
    const row = [
      sanitizeCsvCell(String(lead._id)),
      sanitizeCsvCell(lead.phone),
      sanitizeCsvCell(lead.name || ''),
      sanitizeCsvCell(lead.profileName || ''),
      sanitizeCsvCell(lead.status),
      sanitizeCsvCell(lead.intent || ''),
      sanitizeCsvCell(lead.requirement || ''),
      sanitizeCsvCell(lead.botPaused ? 'Yes' : 'No'),
      sanitizeCsvCell(lead.messageCount ?? 0),
      sanitizeCsvCell(lead.lastInboundAt ? new Date(lead.lastInboundAt).toISOString() : ''),
      sanitizeCsvCell(lead.lastMessageAt ? new Date(lead.lastMessageAt).toISOString() : ''),
      sanitizeCsvCell(lead.createdAt ? new Date(lead.createdAt).toISOString() : ''),
    ];
    rows.push(row.join(','));
  }

  const csvContent = rows.join('\r\n');
  const filename = `leads_export_${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

