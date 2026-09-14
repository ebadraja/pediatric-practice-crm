import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { RetellError } from '@/lib/retell/client';
import { getAgentWithLlm, summarizeAgent, toE164, updateAgentConfig } from '@/lib/retell/agent';
import { requireRetellCreds, retellErrorResponse } from '@/lib/retell/credentials';

const updateVoiceAgentBody = z.object({
  beginMessage: z.string().max(5_000).optional(),
  generalPrompt: z.string().max(100_000).optional(),
  transferNumber: z.string().max(40).optional(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    return { session: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (session.user.role !== 'ADMIN') {
    return {
      session: null,
      response: NextResponse.json({ error: 'Only administrators can manage the voice agent' }, { status: 403 }),
    };
  }
  return { session, response: null };
}

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  const creds = await requireRetellCreds();
  if (!creds.ok) return creds.response;

  try {
    const { agent, llm } = await getAgentWithLlm(creds.apiKey, creds.agentId);
    return NextResponse.json(summarizeAgent(agent, llm));
  } catch (error) {
    if (error instanceof RetellError) return retellErrorResponse(error);
    console.error('[VOICE_AGENT_GET]', error);
    return NextResponse.json(
      { error: 'fetch_failed', message: 'Failed to load the voice agent' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const { session, response } = await requireAdmin();
  if (response) return response;

  const parsed = updateVoiceAgentBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_body', message: 'Invalid request body.' },
      { status: 400 }
    );
  }
  const { beginMessage, generalPrompt, transferNumber: transferRaw } = parsed.data;

  if (beginMessage === undefined && generalPrompt === undefined && transferRaw === undefined) {
    return NextResponse.json(
      { error: 'invalid_body', message: 'Provide beginMessage, generalPrompt and/or transferNumber.' },
      { status: 400 }
    );
  }

  let transferNumber: string | undefined;
  if (transferRaw !== undefined) {
    const normalized = toE164(transferRaw);
    if (!normalized) {
      return NextResponse.json(
        {
          error: 'invalid_transfer_number',
          message: 'Enter a valid phone number, e.g. (512) 555-0123 or +15125550123.',
        },
        { status: 400 }
      );
    }
    transferNumber = normalized;
  }

  const creds = await requireRetellCreds();
  if (!creds.ok) return creds.response;

  try {
    const result = await updateAgentConfig(creds.apiKey, creds.agentId, {
      beginMessage,
      generalPrompt,
      transferNumber,
    });

    // Log which fields changed — never prompt contents, which may hold clinical instructions.
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        entity: 'voice_agent',
        entityId: creds.agentId,
        changes: {
          fields: [
            beginMessage !== undefined && 'beginMessage',
            generalPrompt !== undefined && 'generalPrompt',
            transferNumber !== undefined && 'transferNumber',
          ].filter(Boolean),
          savedVersion: result.savedVersion,
          published: result.published,
        },
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RetellError) return retellErrorResponse(error);
    console.error('[VOICE_AGENT_PATCH]', error);
    return NextResponse.json(
      { error: 'fetch_failed', message: 'Failed to update the voice agent' },
      { status: 500 }
    );
  }
}
