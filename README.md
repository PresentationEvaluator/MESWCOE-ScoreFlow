# Project Evaluation Management System

A professional web application for managing BE Project TW Evaluation for Computer Engineering Department. This system replaces manual Excel-based evaluation sheets with a fast, efficient, and user-friendly web interface.

## Features

✅ **Complete Evaluation Management**
- Create and manage multiple presentations (Presentation 1-4)
- Organize students into groups (up to 50 groups per presentation)
- Each group has exactly 4 students with a guide

✅ **Auto-Calculation**
- Internal Presentation I (50) = Sum of 5 components
- Total out of 100 = Auto-calculated from all components
- Total out of 50 = Internal Presentation II value
- Real-time validation and updates

✅ **Excel Export**
- Export evaluation data to Excel (.xlsx)
- Matches original Excel format exactly
- Includes all marks and calculated totals
- One-click download

✅ **Professional UI**
- Excel-like table interface
- Inline editing with auto-save
- Keyboard navigation (Tab support)
- Toast notifications for all actions
- Responsive design

✅ **Group Management**
- Create, edit, and delete groups
- Update student names and guide names
- Duplicate groups across presentations
- Reset marks for entire presentation

## Technology Stack

- **Frontend**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Excel Export**: SheetJS (xlsx)
- **UI Components**: Lucide React Icons
- **Notifications**: React Hot Toast

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Go to [https://supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Once the project is ready, go to **Project Settings** (gear icon) → **API**
4. Copy the following values:
   - **Project URL** (under "Project URL")
   - **Anon Key** (under "Project API keys" → "anon" → "public")

### 3. Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and paste your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url-here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 4. Set Up Database Tables

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Open `supabase-setup.sql` from this project
5. Copy the entire contents and paste into the SQL Editor
6. Click **Run** to execute the script

This will create all necessary tables, indexes, and constraints.

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage Guide

### Creating a Presentation

1. Click **"New Presentation"** on the dashboard
2. Enter presentation name (e.g., "Presentation 1")
3. Optionally add semester and academic year
4. Click **"Create"**

### Adding Groups

1. Open a presentation
2. Click **"Manage Groups"**
3. Click **"Add New Group"**
4. Enter guide name and all 4 student names
5. Click **"Create Group"**

### Entering Marks

1. Open a presentation
2. Click on any marks field in the table
3. Enter the marks (validates maximum values)
4. Marks auto-save when you move to the next field
5. Calculated fields (blue background) update automatically

### Exporting to Excel

1. Open a presentation
2. Click **"Export Excel"** button
3. Excel file downloads automatically
4. Open in Microsoft Excel to view/print

### Managing Groups

- **Edit Guide Name**: Click the edit icon next to guide name
- **Edit Student Name**: Click the edit icon next to student name
- **Delete Group**: Click the trash icon (confirms before deleting)
- **Duplicate Group**: Select target presentation from dropdown

## Auto-Calculation Logic

### Internal Presentation I (50 marks)
```
= Problem Identification (10)
+ Review of Literature Survey (10)
+ Software Engineering Approach (10)
+ Requirement Analysis (10)
+ SRS (10)
```

### Total out of 100
```
= Internal Presentation I (50)
+ Understanding Individual Capacity (10)
+ Team Work (10)
+ Presentation & Q & A (10)
+ Paper Presentation (20)
```

### Total out of 50
```
= Internal Presentation II (50)
```

## Project Structure

```
presentation-evaluation/
├── app/
│   ├── dashboard/          # Dashboard page
│   ├── presentation/[id]/  # Presentation detail page
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page (redirects to dashboard)
├── components/
│   ├── Dashboard.tsx       # Dashboard component
│   ├── PresentationView.tsx # Evaluation table view
│   └── GroupManagement.tsx  # Group CRUD operations
├── lib/
│   ├── supabase.ts         # Supabase client
│   ├── types.ts            # TypeScript types
│   ├── calculations.ts     # Auto-calculation logic
│   ├── database.ts         # Database operations
│   └── excelExport.ts      # Excel export functionality
├── supabase-setup.sql      # Database schema
├── .env.local.example      # Environment variables template
└── package.json            # Dependencies
```

## Database Schema

### Tables

1. **presentations** - Stores presentation sessions
2. **groups** - Project groups for each presentation
3. **students** - 4 students per group
4. **evaluations** - Marks for each student

### Relationships

- presentations → groups (one-to-many)
- groups → students (one-to-many, exactly 4)
- students → evaluations (one-to-one)

All relationships use CASCADE DELETE for data integrity.

## Validation Rules

- All mark fields have maximum value validation
- Problem Identification: 0-10
- Literature Survey: 0-10
- Software Engineering: 0-10
- Requirement Analysis: 0-10
- SRS: 0-10
- Individual Capacity: 0-10
- Team Work: 0-10
- Presentation & Q&A: 0-10
- Paper Presentation: 0-20
- Internal Presentation II: 0-50

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variables in Vercel dashboard
5. Deploy

### Other Platforms

This is a standard Next.js app and can be deployed to:
- Netlify
- Railway
- Render
- Any Node.js hosting

Make sure to set the environment variables on your hosting platform.

## Support

For issues or questions:
1. Check the Supabase connection in `.env.local`
2. Verify database tables are created via SQL script
3. Check browser console for error messages
4. Ensure all dependencies are installed

## License

This project is created for educational purposes for the Computer Engineering Department.
