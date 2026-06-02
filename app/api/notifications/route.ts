import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get pagination params
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const includeRead = searchParams.get('includeRead') === 'true';

    const userId = session.user.id;

    // Raw SQL to bypass any stale Prisma model accessor
    type NotifRow = {
      id: string; type: string; title: string; message: string;
      icon: string | null; is_read: boolean; entity_type: string | null;
      entity_id: string | null; action_url: string | null; created_at: Date;
    };

    const notifications: NotifRow[] = includeRead
      ? await prisma.$queryRaw`
          SELECT id, type, title, message, icon, is_read, entity_type, entity_id, action_url, created_at
          FROM notifications WHERE user_id = ${userId}
          ORDER BY created_at DESC LIMIT ${limit}`
      : await prisma.$queryRaw`
          SELECT id, type, title, message, icon, is_read, entity_type, entity_id, action_url, created_at
          FROM notifications WHERE user_id = ${userId} AND is_read = false
          ORDER BY created_at DESC LIMIT ${limit}`;

    const countResult: { count: bigint }[] = await prisma.$queryRaw`
      SELECT COUNT(*)::bigint as count FROM notifications WHERE user_id = ${userId} AND is_read = false`;
    const unreadCount = Number(countResult[0]?.count ?? 0);

    return NextResponse.json({
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        icon: n.icon,
        isRead: n.is_read,
        entityType: n.entity_type,
        entityId: n.entity_id,
        actionUrl: n.action_url,
        createdAt: n.created_at,
      })),
      unreadCount,
      total: notifications.length,
    });
  } catch (error) {
    console.error('[NOTIFICATIONS_GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;
    const now = new Date();
    await prisma.$executeRaw`
      UPDATE notifications SET is_read = true, read_at = ${now}
      WHERE user_id = ${userId} AND is_read = false
    `;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[NOTIFICATIONS_MARK_ALL_READ]', error);
    return NextResponse.json({ error: 'Failed to mark all as read' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // This endpoint is called from internal services (webhook, etc.)
    // Validate API key or service token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { userId, type, title, message, icon, entityType, entityId, actionUrl } = body;

    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        icon: icon || typeToIcon(type),
        entityType,
        entityId,
        actionUrl,
      },
    });

    return NextResponse.json(
      {
        success: true,
        notification: {
          id: notification.id,
          type: notification.type,
          title: notification.title,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[NOTIFICATIONS_POST]', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

function typeToIcon(type: string): string {
  const iconMap: Record<string, string> = {
    form_submitted: 'form',
    patient_matched: 'check',
    draft_approved: 'check',
    warning: 'alert',
    error: 'error',
  };
  return iconMap[type] || 'info';
}
