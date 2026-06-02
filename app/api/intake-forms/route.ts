/**
 * GET /api/intake-forms
 * List intake forms with filtering, search, and pagination
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has intake form access
    const accessControl = await prisma.intakeFormAccessControl.findUnique({
      where: { userId: session.user.id },
    });

    // Only ADMIN role can view by default, or users granted explicit access
    if (session.user.role !== "ADMIN" && !accessControl?.canView) {
      return NextResponse.json(
        { error: "Forbidden: No intake form access" },
        { status: 403 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const status = searchParams.get("status");
    const search = searchParams.get("search") || "";
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const unmatched = searchParams.get("unmatched") === "true";
    const formType = searchParams.get("formType");

    // Build filters
    const filters: any = {};

    if (status) {
      filters.status = status;
    }

    if (unmatched) {
      filters.status = "DRAFT";
    }

    if (fromDate || toDate) {
      filters.submittedAt = {};
      if (fromDate) {
        filters.submittedAt.gte = new Date(fromDate);
      }
      if (toDate) {
        filters.submittedAt.lte = new Date(toDate);
      }
    }

    if (formType) {
      filters.hippatizFormTitle = formType;
    }

    // Build search filter (searches in patient name and email)
    if (search) {
      filters.OR = [
        { patient: { firstName: { contains: search, mode: "insensitive" } } },
        { patient: { lastName: { contains: search, mode: "insensitive" } } },
        { patient: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    // Get total count
    const total = await prisma.intakeForm.count({ where: filters });

    // Get paginated results
    const forms = await prisma.intakeForm.findMany({
      where: filters,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        patientDraft: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { submittedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Transform response
    const data = forms.map((form) => ({
      id: form.id,
      hippatizFormTitle: form.hippatizFormTitle,
      status: form.status,
      matchConfidence: form.matchConfidence,
      submittedAt: form.submittedAt.toISOString(),
      linkedPatientId: form.patientId,
      linkedPatientName: form.patient
        ? `${form.patient.firstName} ${form.patient.lastName}`
        : null,
      draftPatientId: form.patientDraftId,
      draftPatientName: form.patientDraft
        ? `${form.patientDraft.firstName} ${form.patientDraft.lastName}`
        : null,
    }));

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching intake forms:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
