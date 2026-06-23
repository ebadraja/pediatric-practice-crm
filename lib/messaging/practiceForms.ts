export type PracticeForm = {
  id: string
  name: string
  description: string
  url: string
  isActive: boolean
}

export type PortalConfigWithForms = {
  baseUrl?: string
  practiceForms?: PracticeForm[]
  defaultIntakeFormId?: string
}

export type FormLinkMetadata = {
  formId?: string
  formName?: string
  formDescription?: string
  formUrl?: string
  url?: string
  title?: string
  sentById?: string
  sentByName?: string
  automation?: boolean
}

export function parsePracticeForms(portalConfig: unknown): PracticeForm[] {
  if (!portalConfig || typeof portalConfig !== 'object') return []
  const forms = (portalConfig as PortalConfigWithForms).practiceForms
  if (!Array.isArray(forms)) return []
  return forms.filter(
    (f): f is PracticeForm =>
      !!f &&
      typeof f === 'object' &&
      typeof f.id === 'string' &&
      typeof f.name === 'string' &&
      typeof f.url === 'string' &&
      typeof f.isActive === 'boolean',
  )
}

export function getActivePracticeForms(forms: PracticeForm[]): PracticeForm[] {
  return forms.filter((f) => f.isActive)
}

export function getDefaultIntakeForm(
  forms: PracticeForm[],
  defaultIntakeFormId?: string | null,
): PracticeForm | null {
  const active = getActivePracticeForms(forms)
  if (active.length === 0) return null
  if (defaultIntakeFormId) {
    const match = active.find((f) => f.id === defaultIntakeFormId)
    if (match) return match
  }
  return active[0] ?? null
}

export function parseFormLinkUrl(content: string): string | null {
  const lines = content.trim().split('\n')
  const last = lines[lines.length - 1]?.trim()
  return last?.startsWith('http') ? last : null
}

export function parseFormLinkTitle(content: string): string | null {
  const lines = content.trim().split('\n')
  if (lines.length < 2) return null
  return lines.slice(0, -1).join('\n').trim() || null
}

export function resolveFormLinkDisplay(input: {
  content: string
  contentType?: string | null
  metadata?: unknown
}): {
  formName: string
  formDescription: string | null
  formUrl: string
  sentByName: string | null
} | null {
  if (input.contentType && input.contentType !== 'FORM_LINK') return null

  const meta = (input.metadata ?? null) as FormLinkMetadata | null
  const formUrl =
    meta?.formUrl ?? meta?.url ?? parseFormLinkUrl(input.content)
  if (!formUrl) {
    if (input.contentType !== 'FORM_LINK') return null
    return null
  }

  const formName =
    meta?.formName ??
    meta?.title ??
    parseFormLinkTitle(input.content) ??
    'Patient Intake Form'

  const formDescription = meta?.formDescription?.trim() || null
  const sentByName = meta?.sentByName?.trim() || null

  if (input.contentType === 'FORM_LINK' || formUrl) {
    return { formName, formDescription, formUrl, sentByName }
  }

  return null
}
