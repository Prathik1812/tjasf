# TJASF (The Journal of Advanced Scientific Frontiers)
### Peer Review & Editorial Management Platform

A modern, responsive, and secure digital publishing portal and peer-review system built for **TJASF**. This platform orchestrates the submission, screening, double-blind peer review, and publication lifecycle of scientific manuscripts.

---

## 🚀 Key Features

* **Multi-Role Workspaces**: Tailored dashboards for **Authors**, **Reviewers**, **Editors** (Section Editors, Managing Editors, Editor-in-Chief), and **Administrators / Support**.
* **Double-Blind Peer Review Pipeline**: Automated flow from submission to reviewer assignment, rating collection, editor decision, and final archiving.
* **Auto-Extraction on File Upload**: Simulates metadata extraction (Title, Abstract, Keywords, and Reference lists) when authors upload formatted manuscripts.
* **Downloadable Author Templates**: Static templates hosted directly on the site guidelines pages for authors to download.
* **Supabase Integration**: Implements secure user authentication, row-level database security policies, and storage bucketing for PDF manuscripts.
* **Quick Demo Login Switcher**: One-click login on the sign-in page to easily switch between test roles (Author, Reviewer, Editor, and Admin).

---

## 🛠️ Tech Stack

* **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons.
* **Backend / Database**: Supabase (PostgreSQL, Auth, Storage, Row Level Security).
* **Tooling**: TypeScript compiler (`tsc`), Vite build pipeline.

---

## ⚙️ Getting Started

### 1. Clone & Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root directory (automatically excluded from Git via `.gitignore` rules) and add your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Setup Database Schema
Apply the database migrations in order from the `supabase/migrations/` directory:
1. `20260807000000_init_schema.sql` (Creates tables for profiles, manuscripts, reviews, issues, policies, and logs).
2. `20260807000001_rls_policies.sql` (Applies security policies so authors can only see their own submissions, reviewers only see assigned reviews, and admins manage metadata).
3. `20260807000002_seed_data.sql` (Seeds domains, editorial board profiles, active volumes, and policies).
4. `20260807000003_storage_policies.sql` (Applies public reading and user-only writing permissions on storage buckets).

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Demo Portals

For development and evaluation, click the **Quick Demo Access** buttons at the bottom of the sign-in page to log in as:
* **Author Portal**: `author@tjasf.org`
* **Reviewer Portal**: `reviewer@tjasf.org`
* **Editor Portal**: `editor@tjasf.org` (Dr. Rajesh Thumma)
* **Admin / Support**: `admin@tjasf.org` (Prathik Kumar)

*Note: If these accounts don't exist yet in your Supabase Auth instance, clicking the buttons will auto-register them and build their profile relations on the fly.*
