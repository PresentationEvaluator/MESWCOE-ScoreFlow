// Type definitions for the evaluation system

// =====================================================
// User & Authentication Types
// =====================================================
export type UserRole = "admin" | "teacher";

export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthUser extends User {
  token?: string;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
}

// =====================================================
// Academic & Presentation Types
// =====================================================
export interface AcademicYear {
  id: string;
  name: string;
  start_year: number;
  end_year: number;
  created_at: string;
  updated_at: string;
}

export interface Presentation {
  id: string;
  name: string;
  semester: string | null;
  academic_year_id: string;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: string;
  presentation_id: string;
  group_number: number;
  guide_name: string;
  created_by_user_id?: string | null;
  guide_user_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  group_id: string;
  student_name: string;
  position: number;
  created_at: string;
}

export interface Evaluation {
  id: string;
  student_id: string;
  problem_identification: number;
  literature_survey: number;
  software_engineering: number;
  requirement_analysis: number;
  srs: number;
  individual_capacity: number;
  team_work: number;
  presentation_qa: number;
  paper_presentation: number;
  // Semester 2 Fields (Presentation 3 & 4)
  identification_module: number;
  coding: number;
  understanding: number;
  internal_presentation_iii: number;
  testing: number;
  participation_conference: number;
  publication: number;
  project_report: number;
  internal_presentation_iv: number;
  // Presentation 1 Additional Fields - Classification of Project (Reddish columns)
  classification_product: number;
  classification_research: number;
  classification_application: number;
  classification_design: number;
  // Presentation 1 Additional Fields - Scope of Finance
  finance_institute: number;
  finance_self: number;
  finance_industry: number;
  // Presentation 1 Additional Fields - Project Type
  project_type_in_house_sponsored: string | null;
  project_title: string | null;
  // Image fields for Excel exports
  pasted_image_1: string | null; // Presentation 2 image (base64 or URL)
  pasted_image_2: string | null; // Presentation 4 image (base64 or URL)
  created_at: string;
  updated_at: string;
}

// Combined types for display
export interface StudentWithEvaluation extends Student {
  evaluation?: Evaluation;
}

export interface GroupWithStudents extends Group {
  students: StudentWithEvaluation[];
}

export interface PresentationWithGroups extends Presentation {
  groups: GroupWithStudents[];
}

export interface PresentationWithAcademicYear extends Presentation {
  academic_year?: AcademicYear;
}

// Calculation result types
export interface CalculatedMarks {
  internal_presentation_i: number;
  internal_presentation_ii: number;
  internal_presentation_iii: number;
  internal_presentation_iv: number;
  total_out_of_100: number;
  total_out_of_50: number;
}

// Form types
export interface CreateAcademicYearInput {
  start_year: number;
  end_year: number;
}

export interface CreatePresentationInput {
  name: string;
  semester?: string;
  academic_year_id: string;
}

export interface CreateGroupInput {
  presentation_id: string;
  group_number: number;
  guide_name: string;
  guide_user_id?: string;
  students: string[]; // Array of 4 student names
}

export interface UpdateEvaluationInput {
  student_id: string;
  field: keyof Evaluation;
  value: number;
}
