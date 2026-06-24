import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import { getPortalSessionFromCookies } from '@/lib/messaging/portalAuth'
import { parseFileAttachmentMetadata } from '@/lib/messaging/fileAttachments'
import { getSignedDownloadUrl } from '@/lib/messaging/fileStorage'
import { authorizeFileAccess } from '@/lib/messaging/fileAccess'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ messageId: string }> }

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { messageId } = await params

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: { select: { id: true, patientId: true } },
      },
    })

    if (!message || message.isInternalNote) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const attachment = parseFileAttachmentMetadata(message.metadata)
    if (!attachment) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const staffSession = await auth()
    const portalSession = staffSession?.user?.id ? null : await getPortalSessionFromCookies()

    const access = authorizeFileAccess({
      staffUserId: staffSession?.user?.id,
      portalPatientId: portalSession?.patientId,
      conversationPatientId: message.conversation.patientId,
    })

    if (!access.ok) {
      return NextResponse.json(
        { error: access.status === 403 ? 'Forbidden' : 'Unauthorized' },
        { status: access.status },
      )
    }

    await prisma.auditLog.create({
      data: {
        userId: access.accessorType === 'staff' ? access.accessorId : null,
        action: 'READ',
        entity: 'message',
        entityId: message.id,
        changes: {
          conversationId: message.conversation.id,
          accessorType: access.accessorType,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
          fileAccess: true,
          ...(access.accessorType === 'patient' ? { patientId: access.accessorId } : {}),
        },
      },
    })

    const signedUrl = await getSignedDownloadUrl(attachment.storageKey)

    const download = request.nextUrl.searchParams.get('download') === '1'
    if (download) {
      return NextResponse.redirect(signedUrl)
    }

    return NextResponse.json({ url: signedUrl })
  } catch (error) {
    console.error('[GET /api/messaging/files/[messageId]]', error)
    return NextResponse.json({ error: 'Failed to access file' }, { status: 500 })
  }
}
