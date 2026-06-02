import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const now = new Date();
    // Raw SQL — bypasses stale Prisma model accessor
    const result: { id: string; user_id: string }[] = await prisma.$queryRaw`
      UPDATE notifications SET is_read = true, read_at = ${now}
      WHERE id = ${id} AND user_id = ${session.user.id}
      RETURNING id, user_id
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[NOTIFICATION_READ]', error);
    return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const result: { id: string }[] = await prisma.$queryRaw`
      DELETE FROM notifications WHERE id = ${id} AND user_id = ${session.user.id} RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[NOTIFICATION_DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
  }
}
