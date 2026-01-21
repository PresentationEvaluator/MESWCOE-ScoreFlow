import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { exportAnnualReportFormattedAndSeparated } from "@/lib/excelExportFormatted";

/**
 * POST /api/reports/export-annual
 * Exports an annual report with authorization check
 * Only allows if user is authenticated and authorized for the academic year
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { academicYearId, userId, token } = body;

    // Validate inputs
    if (!academicYearId || !userId || !token) {
      return NextResponse.json(
        { error: "Missing required fields: academicYearId, userId, token" },
        { status: 400 }
      );
    }

    // Verify session validity
    const isSessionValid = await verifySession(userId, token);
    if (!isSessionValid) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    // Get user role
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Admins always have access
    if (user.role === "admin") {
      console.log(
        `Annual report export authorized for admin user ${userId} for academic year ${academicYearId}`
      );
    } else if (user.role === "teacher") {
      // Teachers can only export if they have groups in at least one presentation in this academic year
      const { data: presentations } = await supabase
        .from("presentations")
        .select("id")
        .eq("academic_year_id", academicYearId);

      if (!presentations || presentations.length === 0) {
        return NextResponse.json(
          { error: "No presentations found for this academic year" },
          { status: 404 }
        );
      }

      const presentationIds = presentations.map(p => p.id);
      const { data: groups, error: groupsError } = await supabase
        .from("groups")
        .select("id")
        .in("presentation_id", presentationIds)
        .eq("guide_user_id", userId)
        .limit(1);

      if (groupsError || !groups || groups.length === 0) {
        console.warn(
          `Unauthorized annual report export attempt by teacher ${userId} for academic year ${academicYearId} - no groups found`
        );
        return NextResponse.json(
          { error: "Unauthorized: You have no groups in this academic year" },
          { status: 403 }
        );
      }

      console.log(
        `Annual report export authorized for teacher user ${userId} for academic year ${academicYearId}`
      );
    } else {
      return NextResponse.json(
        { error: "Invalid user role" },
        { status: 403 }
      );
    }

    // Return success - the actual file download happens on the client side
    return NextResponse.json({
      success: true,
      message: "Export initiated successfully",
    });
  } catch (error) {
    console.error("Error in export-annual endpoint:", error);
    return NextResponse.json(
      { error: "Failed to process export request" },
      { status: 500 }
    );
  }
}
