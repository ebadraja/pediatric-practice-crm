import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getOfflineMessage, isWithinBusinessHours } from '@/lib/messaging/businessHours'

export const dynamic = 'force-dynamic'

type WidgetConfig = {
  enabled?: boolean
  welcomeMessage?: string
  offlineMessage?: string
  primaryColor?: string
  position?: 'bottom-right' | 'bottom-left'
}

export async function GET() {
  try {
    const settings = await prisma.settings.findFirst({
      select: {
        practiceName: true,
        practicePhone: true,
        messagingBusinessHours: true,
        webChatWidgetConfig: true,
      },
    })

    const widget = (settings?.webChatWidgetConfig ?? {}) as WidgetConfig
    const hours = settings?.messagingBusinessHours as Record<string, unknown> | null
    const online = isWithinBusinessHours(hours as never)

    return NextResponse.json({
      // Public webchat (GIGI + standalone widget) — widget config only, not staff CRM toggle
      enabled: widget.enabled !== false,
      practiceName: settings?.practiceName ?? 'Kids 0-18 Integrated Pediatrics',
      practicePhone: settings?.practicePhone ?? null,
      welcomeMessage:
        widget.welcomeMessage ??
        'Hi! How can we help you today? Please share your name, phone, and reason for contacting us.',
      offlineMessage: getOfflineMessage(widget),
      primaryColor: widget.primaryColor ?? '#2563eb',
      position: widget.position ?? 'bottom-right',
      isOnline: online,
    })
  } catch (error) {
    console.error('[GET /api/webchat/init]', error)
    return NextResponse.json({ error: 'Failed to load widget config' }, { status: 500 })
  }
}
