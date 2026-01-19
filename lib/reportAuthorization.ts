import { supabase } from "@/lib/supabase";
import { verifySession } from "@/lib/auth";

interface AuthorizedRequest {
  userId: string;
  token: string;
  presentationId: string;
}

/**
 * Verify that a user is authorized to access a presentation's reports
 * - Admins can access any presentation
 * - Teachers can only access presentations where they have assigned groups
 */
export async function verifyPresentationAccess(
  request: AuthorizedRequest
): Promise<boolean> {
  const { userId, token, presentationId } = request;

  try {
    // Verify session validity
    const isSessionValid = await verifySession(userId, token);
    if (!isSessionValid) {
      return false;
    }

    // Get user role
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return false;
    }

    // Admins always have access
    if (user.role === "admin") {
      return true;
    }

    // Teachers can only access if they have groups in this presentation
    if (user.role === "teacher") {
      const { data: groups, error: groupsError } = await supabase
        .from("groups")
        .select("id")
        .eq("presentation_id", presentationId)
        .eq("guide_user_id", userId)
        .limit(1);

      if (groupsError || !groups || groups.length === 0) {
        return false;
      }

      return true;
    }

    return false;
  } catch (error) {
    console.error("Authorization verification error:", error);
    return false;
  }
}

/**
 * Verify that a user is authorized to access an academic year
 * - Admins can access any academic year
 * - Teachers can access an academic year if they have groups in any presentation within that year
 */
export async function verifyAcademicYearAccess(
  request: Omit<AuthorizedRequest, "presentationId"> & {
    academicYearId: string;
  }
): Promise<boolean> {
  const { userId, token, academicYearId } = request;

  try {
    // Verify session validity
    const isSessionValid = await verifySession(userId, token);
    if (!isSessionValid) {
      return false;
    }

    // Get user role
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return false;
    }

    // Admins always have access
    if (user.role === "admin") {
      return true;
    }

    // Teachers can only access if they have groups in any presentation within this academic year
    if (user.role === "teacher") {
      const { data: presentations, error: presentationsError } = await supabase
        .from("presentations")
        .select("id")
        .eq("academic_year_id", academicYearId);

      if (presentationsError || !presentations || presentations.length === 0) {
        return false;
      }

      const presentationIds = presentations.map((p) => p.id);

      const { data: groups, error: groupsError } = await supabase
        .from("groups")
        .select("id")
        .in("presentation_id", presentationIds)
        .eq("guide_user_id", userId)
        .limit(1);

      if (groupsError || !groups || groups.length === 0) {
        return false;
      }

      return true;
    }

    return false;
  } catch (error) {
    console.error("Authorization verification error:", error);
    return false;
  }
}
