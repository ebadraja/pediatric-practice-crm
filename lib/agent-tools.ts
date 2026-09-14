import prisma from "@/lib/prisma"
import { APPLE_HEALTH_PLANS } from "@/lib/insurance-plans"

/**
 * Server-side agent tools shared by the Vapi voice webhook and the Retell
 * GIGI chat tool endpoint. Each takes the tool's parsed arguments and returns
 * the text the agent should relay.
 */

// ─── Insurance plan keyword map ───────────────────────────────────────────────

const PLAN_KEYWORDS: { keywords: string[]; plan: string; planType: "Commercial" | "Apple Health" }[] = [
  { keywords: ["aetna"],                                        plan: "Aetna",                      planType: "Commercial"   },
  { keywords: ["ambetter"],                                     plan: "Ambetter",                   planType: "Commercial"   },
  { keywords: ["asuris"],                                       plan: "Asuris Northwest",           planType: "Commercial"   },
  { keywords: ["premera"],                                      plan: "Premera Blue Cross",         planType: "Commercial"   },
  { keywords: ["blue cross blue shield", "bcbs", "blue cross"], plan: "Blue Cross Blue Shield FEP", planType: "Commercial"   },
  { keywords: ["cigna"],                                        plan: "Cigna",                      planType: "Commercial"   },
  { keywords: ["first health"],                                 plan: "First Health Network",       planType: "Commercial"   },
  { keywords: ["first choice"],                                 plan: "First Choice Health Network",planType: "Commercial"   },
  { keywords: ["lifewise"],                                     plan: "LifeWise",                   planType: "Commercial"   },
  { keywords: ["regence", "blue shield"],                       plan: "Regence Blue Shield",        planType: "Commercial"   },
  { keywords: ["tricare", "triwest", "tri care", "tri west"],   plan: "Tricare/TriWest",            planType: "Commercial"   },
  { keywords: ["united healthcare", "united health", "uhc"],    plan: "United Healthcare",          planType: "Commercial"   },
  { keywords: ["coordinated care"],                             plan: "Coordinated Care",           planType: "Apple Health" },
  { keywords: ["molina"],                                       plan: "Molina",                     planType: "Apple Health" },
  { keywords: ["wellpoint"],                                    plan: "Wellpoint",                  planType: "Apple Health" },
]

// ─── Tool: verify_insurance ───────────────────────────────────────────────────

export function toolVerifyInsurance(args: Record<string, unknown>): string {
  const rawInput = String(args.plan_name ?? "").trim()
  if (!rawInput) return "Please provide the insurance plan name."
  const input = rawInput.toLowerCase().replace(/[-–]/g, " ").replace(/\s+/g, " ")

  // Generic Apple Health / Medicaid inquiry — no specific plan named
  if (
    /\b(apple health|medicaid|chip|wa apple)\b/.test(input) &&
    !APPLE_HEALTH_PLANS.some(p => input.includes(p.toLowerCase()))
  ) {
    return "We accept these Apple Health plans: Coordinated Care, Molina, United Healthcare, and Wellpoint."
  }

  // Plans we do NOT accept
  if (input.includes("kaiser")) {
    return "Kaiser is not currently accepted. Accepted Apple Health plans are: Coordinated Care, Molina, United Healthcare, and Wellpoint."
  }
  if (input.includes("community health plan")) {
    return "Community Health Plan of Washington is not currently accepted. Accepted Apple Health plans are: Coordinated Care, Molina, United Healthcare, and Wellpoint."
  }
  if (/blue cross.+illinois|illinois.+blue cross/.test(input)) {
    return "Blue Cross of Illinois is not currently accepted. Accepted Apple Health plans are: Coordinated Care, Molina, United Healthcare, and Wellpoint."
  }

  // Fuzzy match accepted plans (order matters — Premera before generic "blue cross")
  for (const entry of PLAN_KEYWORDS) {
    if (entry.keywords.some(k => input.includes(k))) {
      // Intentionally omit planType from the tool result — the voice agent
      // would otherwise echo internal labels like "Plan type: Commercial".
      return `Yes, ${entry.plan} is accepted.`
    }
  }

  return "I'm not sure about that plan. The billing team can verify during business hours."
}

// ─── Tool: submit_refill_request ──────────────────────────────────────────────

export async function toolSubmitRefillRequest(args: Record<string, unknown>): Promise<string> {
  const patientName = String(args.patient_name ?? "").trim()
  const medication  = String(args.medication_name ?? "").trim()
  const pharmacy    = String(args.pharmacy_name ?? "").trim()
  const isUrgent    = Boolean(args.is_urgent)

  const title   = `${isUrgent ? "[URGENT] " : ""}Refill Request: ${medication}`
  const message = `Patient: ${patientName}${args.patient_dob ? ` (DOB: ${args.patient_dob})` : ""}. Medication: ${medication}. Pharmacy: ${pharmacy || "not specified"}. Urgent: ${isUrgent ? "yes" : "no"}.`

  const parts     = patientName.split(/\s+/)
  const firstName = parts[0]
  const lastName  = parts.length > 1 ? parts.slice(1).join(" ") : undefined
  const pt = await prisma.patient.findFirst({
    where: lastName
      ? { firstName: { contains: firstName, mode: "insensitive" }, lastName: { contains: lastName, mode: "insensitive" } }
      : { firstName: { contains: firstName, mode: "insensitive" } },
    select: { id: true },
  })
  const refillActionUrl = pt
    ? `/patients/${pt.id}`
    : `/patients?search=${encodeURIComponent(patientName)}`

  const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } })
  prisma.$transaction(
    admins.map(admin =>
      prisma.notification.create({
        data: {
          userId:    admin.id,
          type:      "refill_request",
          title,
          message,
          icon:      isUrgent ? "alert" : "info",
          actionUrl: refillActionUrl,
        },
      })
    )
  ).catch(err => console.error("[AGENT TOOL] refill notification failed:", err))

  return `Refill request submitted for ${medication} at ${pharmacy || "the specified pharmacy"}. Our clinical team will process it.`
}

// ─── Tool: send_intake_forms ──────────────────────────────────────────────────

export async function toolSendIntakeForms(args: Record<string, unknown>): Promise<string> {
  const childName  = String(args.child_name ?? "").trim()
  const phone      = String(args.phone ?? "").trim()
  const parentName = args.parent_name ? String(args.parent_name).trim() : null
  const formType   = args.form_type   ? String(args.form_type).trim()   : "new patient intake"

  const message = `Intake form request for ${childName}${parentName ? ` (parent: ${parentName})` : ""}. Phone: ${phone}${args.email ? `, Email: ${args.email}` : ""}. Form type: ${formType}.`

  const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } })
  prisma.$transaction(
    admins.map(admin =>
      prisma.notification.create({
        data: {
          userId:    admin.id,
          type:      "intake_forms_requested",
          title:     `Intake Form Request: ${childName}`,
          message,
          icon:      "form",
          actionUrl: "/intake-forms",
        },
      })
    )
  ).catch(err => console.error("[AGENT TOOL] intake notification failed:", err))

  return `Intake forms request noted for ${childName}. Our team will send the forms to ${phone}.`
}

// ─── Tool: create_callback_request ───────────────────────────────────────────

export async function toolCreateCallbackRequest(args: Record<string, unknown>): Promise<string> {
  const callerName = String(args.caller_name ?? "").trim()
  const phone      = String(args.phone ?? "").trim()
  const reason     = String(args.reason ?? "").trim()
  const urgency    = args.urgency    ? String(args.urgency).trim()    : "normal"
  const childName  = args.child_name ? String(args.child_name).trim() : null

  const message = `Callback request from ${callerName} at ${phone}.${childName ? ` Child: ${childName}.` : ""} Reason: ${reason}. Urgency: ${urgency}.`

  const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } })
  prisma.$transaction(
    admins.map(admin =>
      prisma.notification.create({
        data: {
          userId:    admin.id,
          type:      "callback_request",
          title:     `Callback Request: ${callerName}`,
          message,
          icon:      urgency === "urgent" ? "alert" : "phone",
          actionUrl: "/notifications",
        },
      })
    )
  ).catch(err => console.error("[AGENT TOOL] callback notification failed:", err))

  return `Callback request created. Our team will call ${callerName} at ${phone}.`
}
