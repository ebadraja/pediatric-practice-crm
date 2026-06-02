import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authConfig } from "@/auth.config";
import prisma from "@/lib/prisma";

/**
 * POST /api/seed/sample-draft-patient
 * Admin-only endpoint to create a sample draft patient for testing
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);

    // Admin check
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if sample already exists
    const existing = await prisma.intakeForm.findFirst({
      where: {
        extractedData: {
          path: ["email"],
          equals: "emma.johnson@example.com",
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { message: "Sample draft patient already exists", id: existing.id },
        { status: 200 }
      );
    }

    // Create sample intake form
    const sampleForm = await prisma.intakeForm.create({
      data: {
        userId: session.user.id,
        formType: "Well Child Visit",
        status: "RECEIVED",
        fieldValues: {
          firstName: "Emma",
          lastName: "Johnson",
          dateOfBirth: "2018-03-15",
          email: "emma.johnson@example.com",
          phone: "+1-555-123-4567",
          gender: "Female",
          parentName: "Sarah Johnson",
          parentPhone: "+1-555-123-4568",
          address: "123 Oak Street",
          city: "Portland",
          state: "OR",
          zipCode: "97201",
          insuranceProvider: "Blue Cross",
          visitReason: "Annual well-child checkup",
        },
        extractedData: {
          firstName: "Emma",
          lastName: "Johnson",
          dateOfBirth: "2018-03-15",
          email: "emma.johnson@example.com",
          phone: "+1-555-123-4567",
          gender: "Female",
          parentName: "Sarah Johnson",
          parentPhone: "+1-555-123-4568",
          address: "123 Oak Street",
          city: "Portland",
          state: "OR",
          zipCode: "97201",
        },
        matchConfidence: 92,
        processingStatus: "COMPLETED",
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Sample draft patient created successfully",
        data: {
          formId: sampleForm.id,
          patientName: "Emma Johnson",
          matchConfidence: 92,
          status: "RECEIVED",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating sample draft patient:", error);
    return NextResponse.json(
      { error: "Failed to create sample draft patient" },
      { status: 500 }
    );
  }
}
