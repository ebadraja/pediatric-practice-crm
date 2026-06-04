import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ── POST /api/email/templates/:id/preview ────────────────────────────────────
// Renders the template with provided (or sample) variables and returns HTML.
// Does NOT send any email.

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id }        = await params
    const body          = await req.json().catch(() => ({}))
    const customVars    = (body.variables ?? {}) as Record<string, string>

    const template = await prisma.emailTemplate.findUnique({ where: { id } })
    if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

    // Merge caller-supplied variables over sample defaults
    const vars: Record<string, string> = {
      ...SAMPLE_VARIABLES,
      ...customVars,
    }

    const renderedSubject = applyMergeTags(template.subject,  vars)
    const renderedHtml    = applyMergeTags(template.htmlBody, vars)
    const renderedText    = template.plainBody ? applyMergeTags(template.plainBody, vars) : ''

    // Show unresolved tags so the author knows what's missing
    const unresolvedTags = extractUnresolved(renderedHtml)

    return NextResponse.json({
      subject:        renderedSubject,
      html:           renderedHtml,
      text:           renderedText,
      unresolvedTags,
      usedVariables:  Object.keys(vars),
    })
  } catch (error) {
    console.error('[POST /api/email/templates/[id]/preview]', error)
    return NextResponse.json({ error: 'Failed to render preview' }, { status: 500 })
  }
}

function applyMergeTags(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`)
}

function extractUnresolved(html: string): string[] {
  const matches = html.match(/\{\{\w+\}\}/g) ?? []
  return [...new Set(matches)]
}

const SAMPLE_VARIABLES: Record<string, string> = {
  patient_name:        'Alex Johnson',
  patient_first_name:  'Alex',
  parent_name:         'Sarah Johnson',
  appointment_date:    'Monday, June 10, 2026',
  appointment_time:    '10:00 AM',
  appointment_type:    'Well-Child Visit',
  provider_name:       'Dr. Tamas',
  reason:              'Annual checkup',
  practice_name:       'Kids 0-18 Integrated Pediatrics',
  practice_phone:      '(555) 123-4567',
  practice_address:    '123 Medical Plaza Drive, Suite 100',
}
