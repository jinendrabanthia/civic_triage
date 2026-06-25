# CivicTriage AI

CivicTriage AI is a modern, AI-powered platform for reporting, triaging, and resolving city infrastructure issues. Built for GovTech, it leverages Google's Gemini AI to instantly analyze citizen reports, score their severity, and route them to the appropriate city department—saving thousands of hours of manual triage time.

## 🌟 Features

### For Citizens
* **Secure Aadhar Registration:** Citizens can create accounts using their 12-digit Aadhar number securely.
* **Instant Reporting:** Report potholes, graffiti, hazards, and infrastructure damage by taking a photo.
* **Interactive Mapping:** Select exact report locations on a live Leaflet map. Includes Pin Code auto-centering for rapid geographical lookup.
* **My Reports Tracking:** A dedicated dashboard for citizens to track the real-time status of their past issues.

### For City Officials
* **Command Center Access:** Secure login gateway utilizing unique Special ID passes (e.g., `CITY-ADMIN-2026`).
* **AI Triaging Engine:** Google Gemini AI automatically processes every image uploaded to:
  - Categorize the issue (e.g., "Road Hazard", "Sanitation").
  - Assign a Severity Score (0-100).
  - Provide a justification and suggest the correct department.
* **Live Incident Map:** View all active issues securely on an interactive PostGIS-powered geographic map.
* **Kanban Workflow:** Quickly drag, drop, and manage incoming tasks.

## 🛠 Tech Stack

* **Frontend:** Next.js 14 (App Router), React, Tailwind CSS
* **Backend:** Next.js Server Actions, Node.js
* **Database & Storage:** Supabase (PostgreSQL with PostGIS for spatial mapping), Supabase Storage
* **Authentication:** Next.js Cookies & custom `bcryptjs` encryption, Row Level Security (RLS)
* **AI Integration:** `@google/genai` (Gemini 2.5 Flash API)
* **Mapping:** `react-leaflet`, OpenStreetMap API

## 🚀 Setup & Installation

### 1. Clone the Repository
```bash
git clone https://github.com/jinendrabanthia/civic_triage.git
cd civic_triage
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the root of the project using `.env.example` as a template:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_google_gemini_api_key
```

### 4. Database Setup (Supabase)
This project uses PostGIS for geographic lookups.
1. Log into your Supabase project.
2. Go to the SQL Editor.
3. Open `supabase_schema.sql` and run the entire script. This will:
   - Create the `reports`, `citizens`, and `officials` tables.
   - Configure Row Level Security (RLS).
   - Create the `get_reports_within_radius` RPC function.
4. Go to **Storage** in Supabase and create a public bucket named `report-images`.

### 5. Start the Development Server
```bash
npm run dev
```
Navigate to `http://localhost:3000` to start exploring.

## 🧪 Testing Credentials

* **City Official ID Pass**: `CITY-ADMIN-2026`
* **Citizen Account**: Enter any 12-digit number (e.g. `123412341234`) under "Sign Up" to create a new profile.

---
Built for the 2026 GovTech Hackathon.
