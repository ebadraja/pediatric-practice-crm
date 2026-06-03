/**
 * GET/PUT /api/intake-forms/[id]
 * GET: Retrieve single form details with all field values
 * PUT: Update form status (archive, etc)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { findPatientMatches, type PatientMatch } from "@/lib/hippatizer/patientMatcher";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check access
    const accessControl = await prisma.intakeFormAccessControl.findUnique({
      where: { userId: session.user.id },
    });

    if (session.user.role !== "ADMIN" && !accessControl?.canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get form with all details
    const form = await prisma.intakeForm.findUnique({
      where: { id },
      include: {
        fieldValues: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            dateOfBirth: true,
          },
        },
        patientDraft: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        processedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Audit log: user viewed this form
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "READ",
        entity: "intake_form",
        entityId: form.id,
      },
    });

    // Get potential matches for manual review
    let potentialMatches: PatientMatch[] = [];
    const firstNameField = form.fieldValues.find(
      (f) => f.fieldLabel?.includes("First Name") && f.fieldLabel?.includes("Patient")
    );
    const lastNameField = form.fieldValues.find(
      (f) => f.fieldLabel?.includes("Last Name") && f.fieldLabel?.includes("Patient")
    );
    const dobField = form.fieldValues.find(
      (f) => f.fieldLabel?.includes("Date of Birth")
    );

    if (firstNameField?.value && lastNameField?.value && dobField?.value) {
      const [month, day, year] = dobField.value.split("/");
      const dob = new Date(`${year}-${month}-${day}`);

      potentialMatches = (
        await findPatientMatches(
          firstNameField.value,
          lastNameField.value,
          dob
        )
      ).slice(0, 5); // Top 5 matches
    }

    return NextResponse.json({
      id: form.id,
      hippatizFormTitle: form.hippatizFormTitle,
      hippatizViewLink: form.hippatizViewLink,
      hippatizPdfLink: form.hippatizPdfLink,
      status: form.status,
      matchConfidence: form.matchConfidence,
      matchNotes: form.matchNotes,
      submittedAt: form.submittedAt.toISOString(),
      linkedPatient: form.patient,
      patientDraft: form.patientDraft,
      fieldValues: form.fieldValues,
      potentialMatches,
      processedBy: form.processedBy,
      processedAt: form.processedAt?.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching form:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only admins can update forms" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    const updated = await prisma.intakeForm.update({
      where: { id },
      data: {
        status,
        processedAt: new Date(),
        processedById: session.user.id,
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entity: "intake_form",
        entityId: id,
        changes: { status },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating form:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

