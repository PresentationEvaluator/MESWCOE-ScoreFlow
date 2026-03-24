/**
 * Centralized column configuration for all presentations.
 * This ensures consistency between the display, the settings modal, and Excel exports.
 */
export const DEFAULT_COLUMNS: Record<number, Record<string, { name: string; maxMark: number }>> = {
  1: {
    problem_identification: { name: "Problem ID", maxMark: 10 },
    literature_survey: { name: "Literature", maxMark: 10 },
    software_engineering: { name: "Software Eng", maxMark: 10 },
    requirement_analysis: { name: "Req Analysis", maxMark: 10 },
    srs: { name: "SRS", maxMark: 10 },
  },
  2: {
    individual_capacity: { name: "Individual", maxMark: 10 },
    team_work: { name: "Team Work", maxMark: 10 },
    presentation_qa: { name: "Presentation", maxMark: 10 },
    paper_presentation: { name: "Paper", maxMark: 20 },
  },
  3: {
    identification_module: { name: "Identification Module", maxMark: 10 },
    coding: { name: "Coding", maxMark: 10 },
    team_work: { name: "Team Work", maxMark: 10 },
    understanding: { name: "Understanding", maxMark: 10 },
    internal_presentation_iii: { name: "Presentation", maxMark: 10 },
  },
  4: {
    testing: { name: "Testing", maxMark: 10 },
    participation_conference: { name: "Participation", maxMark: 10 },
    publication: { name: "Publication", maxMark: 10 },
    project_report: { name: "Project Report", maxMark: 20 },
  },
};

/**
 * Get all keys for a presentation
 */
export const getPresentationKeys = (presNum: number): string[] => {
  return Object.keys(DEFAULT_COLUMNS[presNum] || {});
};

/**
 * Default mark limits for all fields, including classification and finance.
 */
export const DEFAULT_MARK_LIMITS: Record<string, number> = {
  // All presentation fields (flattened)
  problem_identification: 10,
  literature_survey: 10,
  software_engineering: 10,
  requirement_analysis: 10,
  srs: 10,
  individual_capacity: 10,
  team_work: 10,
  presentation_qa: 10,
  paper_presentation: 20,
  identification_module: 10,
  coding: 10,
  understanding: 10,
  internal_presentation_iii: 10,
  testing: 10,
  participation_conference: 10,
  publication: 10,
  project_report: 20,
  internal_presentation_iv: 50,
  // Classification fields
  classification_product: 10,
  classification_research: 10,
  classification_application: 10,
  classification_design: 10,
  // Finance fields
  finance_institute: 10,
  finance_self: 10,
  finance_industry: 10,
};
