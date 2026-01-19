import { NextRequest, NextResponse } from "next/server";
import { verifyPresentationAccess } from "@/lib/reportAuthorization";

/**
 * POST /api/reports/export-presentation
 * Exports a presentation report with authorization check
 * Only allows if user is authenticated and authorized for the presentation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { presentationId, presentationNumber, userId, token } = body;

    // Validate inputs
    if (
      !presentationId ||
      presentationNumber === undefined ||
      !userId ||
      !token
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: presentationId, presentationNumber, userId, token",
        },
        { status: 400 }
      );
    }

    // Validate presentation number
    if (![1, 2, 3, 4].includes(presentationNumber)) {
      return NextResponse.json(
        { error: "Invalid presentation number. Must be 1, 2, 3, or 4." },
        { status: 400 }
      );
    }

    // Verify authorization
    const isAuthorized = await verifyPresentationAccess({
      userId,
      token,
      presentationId,
    });

    if (!isAuthorized) {
      console.warn(
        `Unauthorized export attempt by user ${userId} for presentation ${presentationId}`
      );
      return NextResponse.json(
        { error: "Unauthorized: You do not have access to this presentation" },
        { status: 403 }
      );
    }

    // Log successful authorization
    console.log(
      `Authorized presentation ${presentationNumber} export for user ${userId}`
    );

    // Return success - the actual file download happens on the client side
    return NextResponse.json({
      success: true,
      message: "Export authorized successfully",
      presentationNumber,
    });
  } catch (error) {
    console.error("Error in export-presentation endpoint:", error);
    return NextResponse.json(
      { error: "Failed to process export request" },
      { status: 500 }
    );
  }
}
