import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { RetellError } from '@/lib/retell/client';
import { getAgentWithLlm, summarizeAgent } from '@/lib/retell/agent';
import { requireRetellCreds, retellErrorResponse } from '@/lib/retell/credentials';
import { groupProductCosts, listAgentCalls, totalMinutes } from '@/lib/retell/usage';
import {
  CLIENT_RATE_PER_MIN,
  PRACTICE_TIMEZONE,
  RATE_STACK,
  billFromMinutes,
  dayKeyInTimeZone,
  dayKeysBetween,
  formatMonthLabel,
  startOfMonthInTimeZone,
  type RateLineKey,
} from '@/lib/voice-billing';

const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 10000) / 10000;

async function stackModelLabels(apiKey: string, agentId: string): Promise<Record<RateLineKey, string>> {
  try {
    const { agent, llm } = await getAgentWithLlm(apiKey, agentId);
    const summary = summarizeAgent(agent, llm);
    return {
      transcription: summary.sttLabel === '—' ? 'Retell speech-to-text' : `Retell STT · ${summary.sttLabel}`,
      llm: summary.modelLabel,
      voice: summary.voiceLabel,
      platform: 'Retell AI',
    };
  } catch {
    // Labels are decorative; usage must still render if the agent lookup fails.
    return { transcription: '—', llm: '—', voice: '—', platform: 'Retell AI' };
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Only administrators can view usage' }, { status: 403 });
  }

  const creds = await requireRetellCreds();
  if (!creds.ok) return creds.response;

  const rangeParam = req.nextUrl.searchParams.get('range');
  const range = rangeParam === '7d' ? '7d' : rangeParam === '30d' ? '30d' : 'month';

  const tz = PRACTICE_TIMEZONE;
  const end = new Date();
  const start =
    range === 'month'
      ? startOfMonthInTimeZone(tz, end)
      : new Date(end.getTime() - (range === '30d' ? 30 : 7) * 24 * 60 * 60 * 1000);

  try {
    const [calls, models] = await Promise.all([
      listAgentCalls(creds.apiKey, creds.agentId, start.getTime(), end.getTime()),
      stackModelLabels(creds.apiKey, creds.agentId),
    ]);

    const minutes = totalMinutes(calls);
    const providerCost = calls.reduce((sum, c) => sum + c.costDollars, 0);

    const byDay = new Map(
      dayKeysBetween(start.getTime(), end.getTime(), tz).map((key) => [key, { calls: 0, minutes: 0, cost: 0 }])
    );
    for (const call of calls) {
      const key = dayKeyInTimeZone(call.startMs, tz);
      const row = byDay.get(key);
      if (!row) continue;
      row.calls += 1;
      row.minutes += call.durationMs / 60000;
      row.cost += call.costDollars;
    }

    return NextResponse.json({
      range,
      timezone: tz,
      periodLabel:
        range === 'month' ? formatMonthLabel(tz, end) : range === '30d' ? 'Last 30 days' : 'Last 7 days',
      start: start.toISOString(),
      end: end.toISOString(),
      // What the practice is billed, from the client rate card.
      billing: {
        ratePerMin: CLIENT_RATE_PER_MIN,
        currency: 'USD',
        stack: RATE_STACK.map((line) => ({ ...line, model: models[line.key] })),
      },
      totals: {
        calls: calls.length,
        minutes: round2(minutes),
        billed: billFromMinutes(minutes),
        avgMinutes: calls.length > 0 ? round2(minutes / calls.length) : 0,
      },
      // What Retell actually charged, in dollars. Kept separate from the rate card.
      provider: {
        totalCost: round4(providerCost),
        breakdown: groupProductCosts(calls).map((p) => ({ product: p.product, cost: round4(p.costDollars) })),
      },
      daily: [...byDay.entries()].map(([date, row]) => ({
        date,
        calls: row.calls,
        minutes: round2(row.minutes),
        billed: billFromMinutes(row.minutes),
        providerCost: round4(row.cost),
      })),
    });
  } catch (error) {
    if (error instanceof RetellError) return retellErrorResponse(error);
    console.error('[VOICE_AGENT_USAGE]', error);
    return NextResponse.json(
      { error: 'fetch_failed', message: 'Failed to load usage' },
      { status: 500 }
    );
  }
}
