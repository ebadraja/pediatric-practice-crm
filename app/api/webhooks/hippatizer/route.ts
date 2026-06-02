/**
 * Hippatizer Webhook Receiver
 * Receives form submissions from Hippatizer and processes them
 * POST /api/webhooks/hippatizer
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getMappingForForm, CRITICAL_MATCHING_FIELDS } from "@/lib/hippatizer/fieldMappings";
import { findBestPatientMatch, findPatientMatches, type PatientMatch } from "@/lib/hippatizer/patientMatcher";

export const dynamic = "force-dynamic";

interface HippatizeWebhookPayload {
  form_id: string;
  submission_id: string;
  submission_counter: number;
  form_title: string;
  created_at: string;
  field_values: Record<string, string | boolean | null>;
}

/**
 * Validate API key from request header
 */
async function validateApiKey(request: NextRequest): Promise<boolean> {
  const apiKey = request.headers.get("X-Api-Key");
  if (!apiKey) return false;

  // Get settings with encrypted API key
  const settings = await prisma.settings.findFirst();
  if (!settings || !settings.hippatizApiKey) return false;

  // In production, you'd decrypt the stored key before comparing
  // For now, direct comparison (should use encryption library in production)
  return apiKey === settings.hippatizApiKey;
}

/**
 * Extract patient data from form field values using mappings
 */
function extractPatientData(
  formTitle: string,
  fieldValues: Record<string, string | boolean | null>
) {
  const mappings = getMappingForForm(formTitle);
  const extracted: Record<string, any> = {};
  const rawFields: Array<{ fieldId: string; fieldLabel: string; fieldType: string; value: string | boolean | null }> = [];

  for (const mapping of mappings) {
    const value = fieldValues[mapping.hippatizFieldId];

    if (value !== undefined && value !== null && value !== "") {
      // Store raw field data
      rawFields.push({
        fieldId: mapping.hippatizFieldId,
        fieldLabel: mapping.fieldLabel,
        fieldType: mapping.fieldType,
        value,
      });

      // Extract to patient field
      let transformedValue = value;
      if (mapping.transform) {
        transformedValue = mapping.transform(value);
      }

      extracted[mapping.patientField] = transformedValue;
    }
  }

  return { extracted, rawFields };
}

/**
 * Check if form has critical matching fields
 */
function hasCriticalFields(fieldValues: Record<string, string | boolean | null>): boolean {
  return CRITICAL_MATCHING_FIELDS.every((fieldId) => {
    const value = fieldValues[fieldId];
    return value !== undefined && value !== null && value !== "";
  });
}

/**
 * Process webhook and create IntakeForm record
 */
export async function processWebhookPayload(payload: HippatizeWebhookPayload) {
  const { form_id, submission_id, form_title, created_at, field_values } = payload;

  // Check for duplicate submissions
  const existingForm = await prisma.intakeForm.findUnique({
    where: { hippatizerId: submission_id },
  });

  if (existingForm) {
    return {
      success: false,
      message: "Duplicate submission",
      formId: existingForm.id,
    };
  }

  // Extract patient data
  const { extracted, rawFields } = extractPatientData(form_title, field_values);

  // Check for critical fields
  if (!hasCriticalFields(field_values)) {
    // Form doesn't have required fields, just store it
    const intakeForm = await prisma.intakeForm.create({
      data: {
        hippatizerId: submission_id,
        hippatizFormId: form_id,
        hippatizFormTitle: form_title,
        submittedAt: new Date(created_at),
        status: "RECEIVED",
        fieldValues: {
          create: rawFields.map((field) => ({
            fieldId: field.fieldId,
            fieldLabel: field.fieldLabel,
            fieldType: field.fieldType,
            value: String(field.value),
          })),
        },
      },
      include: { fieldValues: true },
    });

    return {
      success: true,
      formId: intakeForm.id,
      status: "RECEIVED",
      message: "Form received but missing critical fields for matching",
    };
  }

  // Try to find existing patient match
  let bestMatch = null;
  let potentialMatches: PatientMatch[] = [];

  if (extracted.firstName && extracted.lastName && extracted.dateOfBirth) {
    bestMatch = await findBestPatientMatch(
      extracted.firstName,
      extracted.lastName,
      extracted.dateOfBirth,
      extracted.email,
      extracted.phone,
      0.85 // 85% confidence threshold
    );

    if (!bestMatch) {
      // Get all potential matches for manual review
      potentialMatches = await findPatientMatches(
        extracted.firstName,
        extracted.lastName,
        extracted.dateOfBirth,
        extracted.email,
        extracted.phone
      );
    }
  }

  // Create intake form record
  let intakeFormStatus: "RECEIVED" | "MATCHED" | "DRAFT" | "LINKED" | "ARCHIVED" = "RECEIVED";
  let linkedPatientId = null;
  let linkedAt = null;

  if (bestMatch) {
    intakeFormStatus = "MATCHED";
    linkedPatientId = bestMatch.patientId;
    linkedAt = new Date();
  }

  const intakeForm = await prisma.intakeForm.create({
    data: {
      hippatizerId: submission_id,
      hippatizFormId: form_id,
      hippatizFormTitle: form_title,
      submittedAt: new Date(created_at),
      status: intakeFormStatus,
      patientId: linkedPatientId,
      linkedAt,
      matchConfidence: bestMatch?.confidence ?? null,
      matchNotes: bestMatch?.matchReasons.join(", ") ?? null,
      fieldValues: {
        create: rawFields.map((field) => ({
          fieldId: field.fieldId,
          fieldLabel: field.fieldLabel,
          fieldType: field.fieldType,
          value: String(field.value),
        })),
      },
    },
    include: {
      fieldValues: true,
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  // If no match found and form has critical fields, create patient draft
  if (!bestMatch && intakeFormStatus === "RECEIVED") {
    const draft = await prisma.patientDraft.create({
      data: {
        firstName: extracted.firstName || "Unknown",
        lastName: extracted.lastName || "Unknown",
        dateOfBirth: extracted.dateOfBirth || new Date(),
        email: extracted.email,
        phone: extracted.phone,
        middleInitial: extracted.middleInitial,
        gender: extracted.gender,
        preferredPronouns: extracted.preferredPronouns,
        preferredLanguage: extracted.preferredLanguage,
        streetAddress: extracted.streetAddress,
        city: extracted.city,
        state: extracted.state,
        zipCode: extracted.zipCode,
        caregiver1FirstName: extracted.caregiver1FirstName,
        caregiver1LastName: extracted.caregiver1LastName,
        caregiver1Relationship: extracted.caregiver1Relationship,
        caregiver1Phone: extracted.caregiver1Phone,
        caregiver1Email: extracted.caregiver1Email,
        caregiver2FirstName: extracted.caregiver2FirstName,
        caregiver2LastName: extracted.caregiver2LastName,
        caregiver2Relationship: extracted.caregiver2Relationship,
        caregiver2Phone: extracted.caregiver2Phone,
        caregiver2Email: extracted.caregiver2Email,
        pcpName: extracted.pcpName,
        pcpClinicName: extracted.pcpClinicName,
        pcpPhone: extracted.pcpPhone,
        status: "PENDING",
        createdById: "system", // Will be set to first admin user that processes it
      },
    });

    // Link intake form to draft
    await prisma.intakeForm.update({
      where: { id: intakeForm.id },
      data: {
        patientDraftId: draft.id,
        status: "DRAFT",
      },
    });
  }

  // Create audit log
  await prisma.auditLog.create({
    data: {
      action: "CREATE",
      entity: "intake_form",
      entityId: intakeForm.id,
      changes: {
        status: intakeFormStatus,
        formTitle: form_title,
        matched: !!bestMatch,
      },
      ipAddress: null, // Will be extracted from request context in middleware
    },
  });

  // Create notifications for admins
  await createFormSubmissionNotifications(intakeForm.id, intakeFormStatus, extracted);

  return {
    success: true,
    formId: intakeForm.id,
    status: intakeFormStatus,
    matchedPatientId: linkedPatientId,
    potentialMatches: potentialMatches.slice(0, 3), // Return top 3 potential matches
    message: bestMatch
      ? "Form auto-matched to existing patient"
      : "Form created. No auto-match found.",
  };
}

/**
 * Create notifications for admins when new form is submitted
 */
async function createFormSubmissionNotifications(
  formId: string,
  status: string,
  extractedData: Record<string, any>
) {
  try {
    // Get all admin and staff users with notification preference
    const admins = await prisma.user.findMany({
      where: {
        role: "ADMIN",
        isActive: true,
      },
      select: { id: true, firstName: true },
    });

    // Get users with intake form view access
    const staffWithAccess = await prisma.user.findMany({
      where: {
        intakeFormAccessControl: {
          canView: true,
        },
        isActive: true,
      },
      select: { id: true },
    });

    const recipientIds = new Set([
      ...admins.map((a) => a.id),
      ...staffWithAccess.map((s) => s.id),
    ]);

    // Create notifications for each recipient
    const patientName = `${extractedData.firstName || "Unknown"} ${extractedData.lastName || ""}`.trim();

    for (const userId of recipientIds) {
      await prisma.notification.create({
        data: {
          userId,
          type: "form_submitted",
          title: "New Intake Form Received",
          message:
            status === "MATCHED"
              ? `New intake form from ${patientName} has been matched to an existing patient`
              : `New intake form from ${patientName} is ready for review and matching`,
          icon: "form",
          entityType: "intake_form",
          entityId: formId,
          actionUrl: `/intake-forms/${formId}`,
        },
      });
    }
  } catch (error) {
    console.error("[NOTIFICATION_CREATION]", error);
    // Don't fail the webhook if notification creation fails
  }
}

/**
 * POST /api/webhooks/hippatizer
 */
export async function POST(request: NextRequest) {
  try {
    // Validate API key
    const isValid = await validateApiKey(request);
    if (!isValid) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid API key" },
        { status: 401 }
      );
    }

    // Parse payload
    let payload: HippatizeWebhookPayload;
    try {
      payload = await request.json();
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!payload.form_id || !payload.submission_id || !payload.form_title) {
      return NextResponse.json(
        { error: "Missing required fields: form_id, submission_id, form_title" },
        { status: 400 }
      );
    }

    // Process webhook
    const result = await processWebhookPayload(payload);

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 409 }); // Conflict (duplicate)
    }
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/hippatizer (health check)
 */
export async function GET() {
  return NextResponse.json({
    status: "Hippatizer webhook receiver is running",
    timestamp: new Date().toISOString(),
  });
}
