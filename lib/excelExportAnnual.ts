import * as XLSX from "xlsx";
import { AcademicYear, Evaluation } from "./types";
import {
  getPresentationsByAcademicYear,
  getGroupsByPresentation,
  getAcademicYear,
} from "./database";
import { calculateAllMarks } from "./calculations";
import { applyProfessionalFormattingToWorksheet } from "./excelExportFormatted";

/**
 * Add header rows and merge them across all columns
 */
function addHeaderRows(
  rows: any[],
  academicYear: AcademicYear,
  isAnnual: boolean = false
) {
  const headerRows: string[][] = [["Department of Computer Engineering"]];

  if (isAnnual) {
    headerRows.push([
      `BE Project Annual TW Evaluation Sheet (${academicYear.start_year}–${academicYear.end_year})`,
    ]);
  }



  return headerRows;
}

/**
 * ANNUAL REPORT Export
 * Combines all presentations and groups from the academic year
 * Columns: Group No | Student Name | Guide Name | Presentation | [All relevant columns]
 */
export async function exportAnnualReport(
  academicYearId: string
): Promise<void> {
  try {
    const presentations = await getPresentationsByAcademicYear(academicYearId);

    if (presentations.length === 0) {
      throw new Error("No presentations found for this academic year");
    }

    // Get academic year info
    const academicYear = await getAcademicYear(academicYearId);

    const wb = XLSX.utils.book_new();

    // Create a sheet for each presentation
    for (const presentation of presentations) {
      const groups = await getGroupsByPresentation(presentation.id);
      const rows: any[] = [];

      // Add header rows
      const headerRows = addHeaderRows(rows, academicYear, true);
      rows.push(...headerRows);

      // Determine which columns to show based on presentation name
      let headers: string[] = ["Group No", "Student Name", "Guide Name"];

      if (presentation.name.endsWith("1")) {
        headers.push(
          "Problem ID (10)",
          "Literature (10)",
          "Software Eng (10)",
          "Req Analysis (10)",
          "SRS (10)",
          "Internal I (50)"
        );
      } else if (presentation.name.endsWith("2")) {
        headers.push(
          "Individual (10)",
          "Team Work (10)",
          "Presentation (10)",
          "Paper (20)",
          "Internal II (50)"
        );
      } else if (presentation.name.endsWith("3")) {
        headers.push(
          "Ident Module (10)",
          "Coding (10)",
          "Team Work (10)",
          "Understanding (10)",
          "Presentation (10)",
          "Internal III (50)"
        );
      } else if (presentation.name.endsWith("4")) {
        headers.push(
          "Testing (10)",
          "Participation (10)",
          "Publication (10)",
          "Project Report (20)",
          "Internal IV (50)",
          "Total (100)",
          "Total (50)"
        );
      }

      rows.push(headers);

      // Data rows (fixed 4-row blocks per group)
      const ROWS_PER_GROUP = 4;
      for (const group of groups) {
        for (let i = 0; i < ROWS_PER_GROUP; i++) {
          const student = group.students[i];
          const evaluation = (student?.evaluation || {}) as Evaluation;
          const marks = calculateAllMarks(evaluation);

          const baseRow = [
            group.group_number,
            student?.student_name || "",
            group.guide_name,
          ];

          let dataRow: any[] = [];

          if (presentation.name.endsWith("1")) {
            dataRow = [
              ...baseRow,
              evaluation.problem_identification || "",
              evaluation.literature_survey || "",
              evaluation.software_engineering || "",
              evaluation.requirement_analysis || "",
              evaluation.srs || "",
              marks.internal_presentation_i || "",
            ];
          } else if (presentation.name.endsWith("2")) {
            const individual = evaluation.individual_capacity || 0;
            const teamwork = evaluation.team_work || 0;
            const presentation_score = evaluation.presentation_qa || 0;
            const paper = evaluation.paper_presentation || 0;
            const internalII = marks.internal_presentation_ii || 0;
            const total100 = internalII;
            const total50 = total100 / 2;

            dataRow = [
              ...baseRow,
              individual,
              teamwork,
              presentation_score,
              paper,
              internalII,
              total100,
              total50,
            ];
          } else if (presentation.name.endsWith("3")) {
            dataRow = [
              ...baseRow,
              evaluation.identification_module || "",
              evaluation.coding || "",
              evaluation.team_work || "",
              evaluation.understanding || "",
              evaluation.presentation_qa || "",
              marks.internal_presentation_iii || "",
            ];
          } else if (presentation.name.endsWith("4")) {
            const testing = evaluation.testing || 0;
            const participation = evaluation.participation_conference || 0;
            const publication = evaluation.publication || 0;
            const projectReport = evaluation.project_report || 0;
            const internalIV = marks.internal_presentation_iv || 0;
            const total100 = internalIV;
            const total50 = total100 / 2;

            dataRow = [
              ...baseRow,
              testing,
              participation,
              publication,
              projectReport,
              internalIV,
              total100,
              total50,
            ];
          }

          rows.push(dataRow);
        }
      }

      // Create workbook
      const ws = XLSX.utils.aoa_to_sheet(rows);

      // Add merges for header rows
      if (!ws["!merges"]) {
        ws["!merges"] = [];
      }
      const colCount = headers.length;
      // Merge header rows dynamically
      for (let r = 0; r < headerRows.length; r++) {
        ws["!merges"]!.push({ s: { r, c: 0 }, e: { r, c: colCount - 1 } });
      }

      applyProfessionalFormattingToWorksheet(ws, rows.length, colCount, headerRows.length + 1);

      // Add vertical merges for Group No and Guide Name columns (fixed 4-row blocks)
      const merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> = [];
      let currentDataRow = headerRows.length + 1;
      for (const _g of groups) {
        merges.push({ s: { r: currentDataRow, c: 0 }, e: { r: currentDataRow + ROWS_PER_GROUP - 1, c: 0 } });
        merges.push({ s: { r: currentDataRow, c: 2 }, e: { r: currentDataRow + ROWS_PER_GROUP - 1, c: 2 } });
        currentDataRow += ROWS_PER_GROUP;
      }
      if (!ws["!merges"]) {
        ws["!merges"] = [];
      }
      ws["!merges"].push(...merges);

      // Set column widths
      const colWidths = [
        { wch: 12 },
        { wch: 20 },
        { wch: 20 },
        ...Array(colCount - 3).fill({ wch: 15 }),
      ];
      ws["!cols"] = colWidths;

      const sheetName = presentation.name.replace(/\s+/g, "_");
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }

    XLSX.writeFile(wb, "Annual_Report.xlsx");
  } catch (error) {
    console.error("Error exporting Annual Report:", error);
    throw error;
  }
}
