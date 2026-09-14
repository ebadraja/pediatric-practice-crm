import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { MISSING_MIGRATION_MESSAGE, isMissingRetellColumns } from '@/lib/retell/credentials';

const updateRetellSettingsBody = z.object({
  apiKey: z.string().optional(),
  agentId: z.string().trim().max(200).optional(),
  chatAgentId: z.string().trim().max(200).optional(),
  enabled: z.boolean().optional(),
  clearApiKey: z.boolean().optional(),
});

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();

    // Only admins can modify settings
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can modify settings' },
        { status: 403 }
      );
    }

    const parsed = updateRetellSettingsBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { apiKey, agentId, chatAgentId, enabled, clearApiKey } = parsed.data;
    const newKey = apiKey?.trim() ?? '';

    if (newKey && newKey.length < 10) {
      return NextResponse.json(
        { error: 'API key must be at least 10 characters long' },
        { status: 400 }
      );
    }

    const currentSettings = await prisma.settings.findFirst();

    // Blank key keeps the stored value; clearApiKey removes it.
    let encryptedKey: string | null;
    if (clearApiKey) {
      encryptedKey = null;
    } else if (newKey) {
      encryptedKey = encrypt(newKey);
    } else {
      encryptedKey = currentSettings?.retellApiKey ?? null;
    }

    const isEnabled = clearApiKey ? false : (enabled ?? currentSettings?.retellEnabled ?? false);
    const nextAgentId = agentId !== undefined ? agentId || null : (currentSettings?.retellAgentId ?? null);
    const nextChatAgentId =
      chatAgentId !== undefined ? chatAgentId || null : (currentSettings?.retellChatAgentId ?? null);

    await prisma.settings.upsert({
      where: { id: currentSettings?.id || 'singleton' },
      create: {
        id: 'singleton',
        retellEnabled: isEnabled,
        retellApiKey: encryptedKey,
        retellAgentId: nextAgentId,
        retellChatAgentId: nextChatAgentId,
        retellLastSync: new Date(),
      },
      update: {
        retellEnabled: isEnabled,
        retellApiKey: encryptedKey,
        retellAgentId: nextAgentId,
        retellChatAgentId: nextChatAgentId,
        retellLastSync: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        entity: 'settings',
        entityId: 'retell',
        changes: {
          enabled: isEnabled,
          hasApiKey: !!newKey,
          clearApiKey: !!clearApiKey,
          agentIdChanged: agentId !== undefined && nextAgentId !== (currentSettings?.retellAgentId ?? null),
          chatAgentIdChanged:
            chatAgentId !== undefined && nextChatAgentId !== (currentSettings?.retellChatAgentId ?? null),
        },
      },
    });

    return NextResponse.json({
      success: true,
      enabled: isEnabled,
      hasApiKey: !!encryptedKey,
      agentId: nextAgentId,
      chatAgentId: nextChatAgentId,
      message: 'Retell settings saved successfully',
    });
  } catch (error) {
    console.error('[SETTINGS_RETELL]', error);
    return NextResponse.json(
      { error: isMissingRetellColumns(error) ? MISSING_MIGRATION_MESSAGE : 'Failed to save Retell settings' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can view settings' },
        { status: 403 }
      );
    }

    const settings = await prisma.settings.findFirst();

    // Never send the key to the browser, in any form.
    return NextResponse.json({
      enabled: settings?.retellEnabled ?? false,
      hasApiKey: !!settings?.retellApiKey,
      agentId: settings?.retellAgentId ?? '',
      chatAgentId: settings?.retellChatAgentId ?? '',
      lastSync: settings?.retellLastSync ?? null,
    });
  } catch (error) {
    console.error('[SETTINGS_RETELL_GET]', error);
    return NextResponse.json(
      { error: isMissingRetellColumns(error) ? MISSING_MIGRATION_MESSAGE : 'Failed to fetch Retell settings' },
      { status: 500 }
    );
  }
}
