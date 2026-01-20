import * as XLSX from "xlsx";
import { User } from "./types";

/**
 * Export all users to an Excel file
 * Columns: User ID, Name, Username, Email, Role, Status, Password (hashed, for reference)
 */
export async function exportUsersToExcel(users: User[]): Promise<void> {
  try {
    const rows: any[] = [
      [
        "User ID",
        "Full Name",
        "Username",
        "Email",
        "Role",
        "Status",
        "Created Date",
      ],
    ];

    // Add user data rows
    for (const user of users) {
      rows.push([
        user.id,
        user.full_name || "N/A",
        user.username,
        user.email || "N/A",
        user.role,
        user.is_active ? "Active" : "Inactive",
        new Date(user.created_at).toLocaleDateString(),
      ]);
    }

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Set column widths
    ws["!cols"] = [
      { wch: 36 }, // User ID
      { wch: 20 }, // Full Name
      { wch: 15 }, // Username
      { wch: 25 }, // Email
      { wch: 10 }, // Role
      { wch: 10 }, // Status
      { wch: 15 }, // Created Date
    ];

    // Add basic formatting to header row
    const headerStyle = {
      font: { bold: true, color: "FFFFFF" },
      fill: { fgColor: { rgb: "4F46E5" } }, // Indigo color
      alignment: { horizontal: "center", vertical: "center" },
    };

    // Apply header styling (if using a more advanced library)
    // For now, we'll use basic XLSX
    ws["A1"].s = headerStyle;
    ws["B1"].s = headerStyle;
    ws["C1"].s = headerStyle;
    ws["D1"].s = headerStyle;
    ws["E1"].s = headerStyle;
    ws["F1"].s = headerStyle;
    ws["G1"].s = headerStyle;

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `Users_Export_${timestamp}.xlsx`);
  } catch (error) {
    console.error("Error exporting users to Excel:", error);
    throw error;
  }
}
