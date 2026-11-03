# Campus Coin — Smart Spending Student Style

**Theme:** NextGen BudgetBee  
**Category:** End-to-End Web Solutions  
**Stack:** MongoDB · Express.js · React 18 · Node.js (MERN)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Features Implemented](#2-features-implemented)
3. [Architecture](#3-architecture)
4. [Tech Stack](#4-tech-stack)
5. [Installation Instructions](#5-installation-instructions) ← **MANDATORY**
6. [User Credentials](#6-user-credentials) ← **MANDATORY**
7. [Project Structure](#7-project-structure)
8. [AI Tools Acknowledged](#8-ai-tools-acknowledged)

---

## 1. Project Overview

Campus Coin is a full-stack, responsive web application that helps college and
university students take control of their personal finances. Students can log
income and expenses with student-relevant categories, track budgets, view
interactive charts, and receive AI-generated spending insights and saving tips —
all without needing a linked bank account.

---

## 2. Features Implemented

### User Authentication & Management
- Student registration and login (email + password)
- Google Sign-In (OAuth 2.0 ID-token flow)
- Secure JWT session management with access + refresh tokens
- Password recovery and reset via email (6-digit code)
- Editable user profile: name, academic year, monthly allowance baseline, savings goal
- Bulk import of historical transactions from CSV files

### Category Management
- Default income categories: Allowance, Part-time Job, Scholarship, Gift, Other Income
- Default expense categories: Food, Transport, Hostel/Rent, Academics, Subscriptions, Entertainment, Miscellaneous
- Add, edit, and delete personal categories under "Manage Own Categories"

### Personalized Dashboard
- Personalized greeting with current-month income vs. expense balance
- Quick-add buttons for income and expenses
- Dynamic widgets: This Month's Top Category, Budget vs. Actual progress bars
- Saving tips ranked by potential savings impact

### Income & Expense Logging
- Quick-add form for all income and expense types
- Recurring transaction support (weekly / monthly / custom)
- Full edit and delete with complete audit history retained

### Monthly Reports
- Category-wise monthly spending breakdown
- Income vs. expense trend over the last 6 months
- Daily and weekly spending summaries
- Filter by date range, category, or income source
- Export reports as PDF or image

### AI-Generated Monthly Spending Insights
- Analyzes the month's transactions and generates a plain-language narrative
- Flags categories with above-average growth (e.g. "Food delivery rose 40%")
- Provides simple, actionable advice tied to each flagged pattern
- Stores insight history for review of past months

### Optional AI-Driven Expense Categorization
- Suggests a category as the student types a transaction description
- Manual override always available
- Batch-categorization suggestions during CSV import

### Personalized Saving Tips Engine
- Tips generated from the database by comparing current spending vs. historical averages
- Ranked by potential savings impact; top tips shown on dashboard
- Students can dismiss or pin tips

### Budget Goals & Alerts
- Set a monthly budget per category
- Real-time progress bars showing budget consumption
- In-app notification when a category nears or exceeds its budget

### Bookmarking & Sharing
- Bookmark a saving tip or monthly insight for later reference
- Export monthly reports or summaries as PDF or share by email

### Admin Control Panel (accessed at `/adlg`)
- Manage default income/expense categories available to all students
- Post system-wide announcements and tip templates
- View, disable, or reset user accounts
- Usage statistics: active users, total transactions, most-used categories

### System Intelligence & UX
- Tracks recently viewed / edited transactions across sessions
- Detects and flags unusually large or duplicate transactions
- Dark-mode toggle
- Smooth transitions and loading indicators throughout
- AI chat assistant (Tawk.to widget)

---

## 3. Architecture

```
┌─────────────────────────────────────┐
│         Presentation Layer          │
│  React 18 + TypeScript + Vite       │
│  Tailwind CSS · Recharts · Axios    │
└────────────────┬────────────────────┘
                 │ HTTP / REST
┌────────────────▼────────────────────┐
│        Application / API Layer      │
│  Node.js · Express.js               │
│  JWT auth · AI services (Gemini /   │
│  Groq) · PDF generation · Email     │
└────────────────┬────────────────────┘
                 │ Mongoose ODM
┌────────────────▼────────────────────┐
│            Data Layer               │
│  MongoDB (local or Atlas)           │
│  Collections: users, transactions,  │
│  categories, budgets, insights,     │
│  sessions, notifications, backups   │
└─────────────────────────────────────┘
```

---

## 4. Tech Stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | React 18, TypeScript, Vite, Tailwind CSS, Recharts, Lucide React |
| Backend   | Node.js 20+, Express.js 5, Mongoose 9 |
| Database  | MongoDB (local Community Edition) |
| Auth      | JWT (jsonwebtoken), bcryptjs, Google OAuth 2.0 |
| AI        | Google Gemini API, Groq API (optional — app works without them) |
| Email     | Resend / Brevo / SMTP (optional — app works without them) |
| Chat      | Tawk.to embedded widget |

---

## 5. Installation Instructions

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js     | 20 or newer — https://nodejs.org |
| MongoDB Community Edition | Any recent version — https://www.mongodb.com/try/download/community |

MongoDB must be installed and its service must be running before you start.

### Quick Start (Windows)

1. Unzip / clone the project so you have a `CampusCoin-FD` folder.
2. Double-click **`start.bat`** inside that folder.

`start.bat` automatically:
- Checks Node.js ≥ 20 is installed
- Starts the local MongoDB service (or `mongod` directly if the service is not registered)
- Creates `Backend/.env` and `Frontend/.env.local` from their `.env.example` templates on first run
- Generates a secure random `JWT_SECRET` and sets `MONGO_URI=mongodb://127.0.0.1:27017/campuscoin`
- Installs `node_modules` for both backend and frontend (only when missing)
- Ensures the admin account exists (creates it automatically if not found)
- Rebuilds the frontend bundle when `.env.local` is newer than the existing build
- Opens two terminal windows: one for the backend, one for the frontend

### Access the App

| URL | Description |
|-----|-------------|
| http://localhost:5173 | Student-facing frontend |
| http://localhost:5000 | Backend API |
| http://localhost:5173/adlg | Admin login page |

### Manual Start (if you prefer not to use start.bat)

```bash
# Terminal 1 — Backend
cd Backend
npm install
npm run dev

# Terminal 2 — Frontend
cd Frontend
npm install
npm run dev
```

### Environment Variables

**`Backend/.env`** (auto-created by `start.bat`):

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | `mongodb://127.0.0.1:27017/campuscoin` (local) |
| `JWT_SECRET` | Auto-generated random secret |
| `PORT` | `5000` |
| `NODE_ENV` | `development` |
| `RESEND_API_KEY` | Email delivery (optional) |
| `GEMINI_API_KEY` | AI insights (optional) |
| `GROQ_API_KEY` | AI insights fallback (optional) |
| `GOOGLE_CLIENT_ID` | Google Sign-In (optional) |

**`Frontend/.env.local`** (auto-created by `start.bat`):

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:5000/api/v1` |

---

## 6. User Credentials

### Admin

| Field    | Value |
|----------|-------|
| Email    | `admin@campuscoin.tw7` |
| Password | `C@mpMaster76#` |
| Login URL | http://localhost:5173/adlg |

> The admin account is created automatically by `start.bat` if it does not exist.

### Student (register yourself)

Go to http://localhost:5173/register to create a student account, or use the
Google Sign-In button on the login page.

---

## 7. Project Structure

```
CampusCoin-FD/
├── start.bat                  ← double-click to run everything
├── Backend/
│   ├── server.js              entry point
│   ├── .env                   runtime config (auto-created)
│   ├── .env.example           template
│   ├── api/index.js           Vercel serverless entry
│   ├── scripts/
│   │   ├── createAdmin.js     manual admin creation helper
│   │   └── ensureAdmin.js     called by start.bat
│   └── src/
│       ├── config/db.js       MongoDB connection
│       ├── middleware/        auth, rate-limiting
│       ├── models/            Mongoose schemas (User, Transaction,
│       │                       Category, Budget, Insight, Session, …)
│       ├── routes/            Express route handlers
│       ├── services/          Business logic, AI, email, backup
│       └── utils/             Helpers (httpErrors, formatName, …)
└── Frontend/
    ├── index.html
    ├── .env.local             runtime config (auto-created)
    ├── .env.example           template
    ├── vite.config.ts
    └── src/
        ├── api/               Axios wrappers (one file per resource)
        ├── components/        Reusable UI grouped by feature
        ├── constants/         Route paths, config, feature flags
        ├── contexts/          AuthContext, ThemeContext, NotificationContext
        ├── hooks/             useAuth, useGoogleSignIn, …
        ├── layouts/           PublicLayout, AuthLayout, StudentLayout, AdminLayout
        ├── pages/             Route-level screens (public, auth, student, admin)
        ├── routes/            AppRoutes, ProtectedRoute, RoleRoute
        ├── services/          Business logic layer
        ├── types/             Shared TypeScript interfaces
        └── utils/             Formatting, validation, class-name helpers
```

---

## 8. AI Tools Acknowledged

The following AI tools were used as productivity and learning aids during
development. All design decisions, architecture choices, and code were
reviewed, understood, and implemented by the project author.

| Tool | Usage |
|------|-------|
| **Kiro (AI coding assistant)** | Code assistance, debugging, environment setup |
| **Google Gemini API** | AI-generated spending insights and expense categorization (runtime feature) |
| **Groq API** | Fallback AI provider for insights (runtime feature) |
| **Tawk.to** | Embedded AI chat widget on the frontend |

> As required by the SRS: AI was used as an assistant, not as a developer.
> All submitted code reflects the author's own logic, structure, and implementation.
