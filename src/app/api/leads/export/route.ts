import 'server-only';
import { NextRequest } from 'next/server';
import { requireTenantApi } from '@/server/auth/dal';
import { forTenant } from '@/server/repos/tenant';
import { LEAD_STATUSES, type LeadStatus } from '@/server/models/Lead';

export const dynamic = 'force-dynamic';

/**
 * Escapes fields to prevent CSV / formula injection (CWE-1236).
 * Any cell whose first non-space character is =, +, -, @, \t, or \r gets a
 * leading single quote so spreadsheet apps treat it as text.
 */
function sanitizeCsvCell(value: unknown): string {
  if (value == null) return '""';
  let str = String(value);

  if (/^\s*[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  return `"${str.replace(/"/g, '""')}"`;
}

const iso = (d: unknown) => (d ? new Date(d as Date).toISOString() : '');

const HEADERS = [
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

export async function GET(req: NextRequest) {
  const sessionOrRes = await requireTenantApi(['owner', 'staff']);
  if (sessionOrRes instanceof Response) return sessionOrRes;

  const statusParam = req.nextUrl.searchParams.get('status');
  if (statusParam && !LEAD_STATUSES.includes(statusParam as LeadStatus)) {
    return Response.json({ error: 'Invalid status filter' }, { status: 400 });
  }

  const cursor = await forTenant(sessionOrRes.tenantId).exportLeadsCursor(
    statusParam ? { status: statusParam as LeadStatus } : {},
  );

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(HEADERS.join(',') + '\r\n'));
        for await (const lead of cursor) {
          const row = [
            String(lead._id),
            lead.phone,
            lead.name || '',
            lead.profileName || '',
            lead.status,
            lead.intent || '',
            lead.requirement || '',
            lead.botPaused ? 'Yes' : 'No',
            lead.messageCount ?? 0,
            iso(lead.lastInboundAt),
            iso(lead.lastMessageAt),
            iso(lead.createdAt),
          ].map(sanitizeCsvCell);
          controller.enqueue(encoder.encode(row.join(',') + '\r\n'));
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
    async cancel() {
      await cursor.close();
    },
  });

  const filename = `leads_export_${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
