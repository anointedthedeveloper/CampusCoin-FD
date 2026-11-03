# CampusCoin — Presentation Slides Content
### Team Flandek · November 2026

---

## SLIDE 1 — Title Slide

**Title:** Campus Coin
**Subtitle:** NextGen BudgetBee — A Student-First Finance Platform
**Team:** Team Flandek
**Date:** November 2026

*Suggested visual: App logo + dark green (#122a1f) background*

---

## SLIDE 2 — The Problem

**Heading:** Students struggle with money. Every semester.

**Three pain points:**

- 💸 **No visibility** — Allowances, side gigs, and scholarships come in from everywhere. There's no single place to see it all.
- 🏦 **Wrong tools** — Existing budgeting apps assume a bank account, a salary, and a credit card. Students have none of those.
- 😰 **No guidance** — Nobody teaches personal finance in school. Students overspend and only notice at month-end.

**Quote for slide:** *"100% of students handle money. 0% of them were taught how."*

---

## SLIDE 3 — The Solution

**Heading:** Campus Coin — Built for campus life

**Hero tagline:** "Take control of your money on campus"

**One sentence:** A smart budgeting and expense-tracking platform designed specifically for students — no bank account, no credit card, no experience required.

**Three pillars:**
1. **Track** — Log income and expenses in seconds
2. **Plan** — Set budgets and savings goals per category
3. **Improve** — Get AI-powered tips from your own spending habits

---

## SLIDE 4 — Key Features Overview (10 Implemented Features)

**Heading:** Everything a student needs. Nothing they don't.

| # | Feature | What it does |
|---|---|---|
| 1 | 📊 Dashboard | Balance, income, expenses, budgets at a glance |
| 2 | 💳 Transactions | Full history — add, edit, search, filter, delete, restore |
| 3 | 📅 Budgets | Per-category monthly limits with live progress bars |
| 4 | 📈 Reports | 6-month trend, spending heatmap, weekly breakdown, PDF/CSV/Excel/PNG/JSON export |
| 5 | 🤖 AI Assistant | Chat-based help — asks questions, proposes entries, approve before save |
| 6 | 🎯 Savings Goals | Target + deadline tracking with milestone badges and confetti |
| 7 | 🔄 Recurring | Auto-post daily/weekly/monthly/yearly income or expenses |
| 8 | 📂 Import & Export | Import from CSV, Excel, ODS, Word, JSON; export in 5 formats |
| 9 | 💡 Saving Tips | Personalized tips based on real spending habits; pin/bookmark |
| 10 | 🔔 Notifications | Budget alerts and announcements in one feed |

---

## SLIDE 5 — The AI Assistant

**Heading:** Ask it anything. Let it do the work.

**What it can do:**
- Answer questions about spending in plain language: *"How much did I spend on food this month?"*
- Propose data changes from natural speech: *"I spent ₦1,500 on lunch today"* → shows a structured action card for approval
- Generate monthly insights and saving suggestions from real data
- Run affordability checks: *"Can I afford a new laptop?"* → time-to-save projection

**Unique safeguard:**
> The AI **never** writes to the database without student approval. Every proposed change shows exactly what will change — amount, category, date — before anything is saved.

**AI Endpoints:**
- `POST /ai/chat` — personalised chat with full financial context
- `POST /ai/affordability` — "Can I afford X?" structured calculation
- `GET /ai/spending-trend` — month-over-month comparison + AI narrative
- `GET /ai/saving-suggestions` — personalised tips from actual spending
- `GET /ai/budget-status` — budget health check + AI commentary
- `POST /ai/categorize` — category suggestion (history → AI → keyword rules)

**Technical detail:**
- Multi-provider failover: Groq (primary, `openai/gpt-oss-20b`) → Google Gemini (fallback, `gemini-3.5-flash-lite`)
- Multiple API keys per provider with 5-minute cooldown on failure
- Graceful degradation when no AI is configured — rule-based answers from raw numbers

---

## SLIDE 6 — Onboarding Flow

**Heading:** Up and running in under 2 minutes

**5 labelled steps:**

| Step | Name | What happens |
|---|---|---|
| 1 | Welcome | Choose currency (8 options from NGN to PKR) |
| 2 | Income | Select income sources + amount + frequency |
| 3 | Spending | Select usual expense categories |
| 4 | Goals | Set monthly budget + savings target |
| 5 | AI Assistant | Introduction to the chat |

**After onboarding:**
- Default categories seeded
- Opening-balance income transaction created from the student's stated income (so the dashboard shows real numbers immediately, not all zeros)
- Lands on personalised dashboard

**Can be skipped** and resumed across sessions. Revisitable later via "Edit money profile" on the Profile page.

---

## SLIDE 7 — Reports & Data Export

**Heading:** Real data. Real decisions.

**Reports page includes:**
- Monthly income vs. expenses summary (totals + net savings)
- Spending by category — donut chart with percentages
- 6-month income/expense trend — line chart
- Daily spending heatmap — calendar grid showing intensity
- Weekly spending breakdown — bar chart
- Full transaction table — filterable by type, category, date

**Export options — 5 formats:**
| Format | Description |
|---|---|
| 📄 PDF | Server-rendered, full report with all sections |
| 📊 Excel (.xlsx) | With totals row, sheetjs-powered |
| 📋 CSV | Raw tabular data |
| 🖼️ PNG image | Shareable summary card (html-to-image) |
| 📁 JSON | Machine-readable, for developers |

**Email feature:** Send the monthly PDF report to yourself, a parent, or a sponsor (rate-limited to 10 emails/hour).

---

## SLIDE 8 — Savings Goals

**Heading:** From target to achievement — tracked step by step

**How it works:**
1. Set a goal name, target amount, and (optional) deadline
2. Choose a colour (8 options) and icon (10 options)
3. Log deposits or withdrawals at any time
4. Animated progress bar fills toward 100%

**Milestone system:**
| Milestone | Badge | Trigger |
|---|---|---|
| 25% | 🌱 Seedling | First quarter reached |
| 50% | ⭐ Halfway Hero | Halfway there |
| 75% | 🚀 Almost There | Almost done |
| 100% | 🏆 Goal Crusher | Goal complete |

Each milestone triggers a **confetti burst animation** + toast notification — celebrated once per threshold, never repeated.

**Extra features:**
- "Fill to goal" shortcut in the deposit modal
- Projection panel: daily/weekly/monthly savings required to meet the deadline
- Deadline countdown in days

---

## SLIDE 9 — Multi-Currency Support

**Heading:** Not just Nigeria. Built for students everywhere.

**8 supported currencies (set during onboarding, changeable in Settings):**

| Symbol | Currency |
|---|---|
| ₦ | Nigerian Naira (NGN) — default |
| $ | US Dollar (USD) |
| £ | British Pound (GBP) |
| € | Euro (EUR) |
| CA$ | Canadian Dollar (CAD) |
| GH₵ | Ghanaian Cedi (GHS) |
| ₹ | Indian Rupee (INR) |
| ₨ | Pakistani Rupee (PKR) |

Currency setting is applied throughout the entire app — all formatted numbers, budget inputs, reports, savings goals, AI responses, and PDF exports use the student's chosen currency symbol.

---

## SLIDE 10 — The Admin Console

**Heading:** Full platform management, built in

**7 admin console sections:**

| # | Section | What admins can do |
|---|---|---|
| 1 | Overview | Platform stats, recent sign-ups, quick action shortcuts |
| 2 | Users | View, create, suspend, reset data, delete, set passwords, change roles (student ↔ admin) |
| 3 | Categories | Manage default income/expense categories visible to all students |
| 4 | Announcements & Tips | Broadcast announcements, manage saving-tip template library |
| 5 | Support Inbox | Real-time chat with students; badge shows open ticket count, polls every 2 minutes |
| 6 | Statistics | Total users, active (30d), new (30d), suspended, income/expense entries, top categories, top 10 users by transactions, avg monthly spend |
| 7 | System | Email delivery health check, send test email, backup stats, trigger manual backup |

**New in this build:**
- ✅ Admin can create new accounts (student or admin role) with name, email, password, school, academic year
- ✅ Admin can set a user's password directly (signs them out of all devices immediately)
- ✅ Admins are fully blocked from accessing student pages (route guard enforced at the router level)

---

## SLIDE 11 — Technical Architecture

**Heading:** Modern, scalable, serverless

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18.3 | UI framework |
| TypeScript | 5.6 | Type safety |
| Vite | 6.0 | Build tool |
| Tailwind CSS | 3.4 | Styling |
| Framer Motion | 11 | Animations |
| Recharts | 2.15 | All charts (donut, line, heatmap, bar) |
| Lucide React | 0.469 | Icon library |
| Axios | 1.7 | HTTP client |
| SheetJS/xlsx | 0.20.3 | Client-side Excel/CSV/ODS parsing |
| html-to-image | 1.11 | PNG export |
| react-markdown | 9.1 | AI response rendering |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js + Express | 5.2 | API server |
| Mongoose | 9.10 | ODM for MongoDB |
| MongoDB | 7.6 | Native client |
| bcryptjs | 3 | Password hashing (cost factor 12) |
| jsonwebtoken | 9 | JWT auth (access + refresh tokens) |
| google-auth-library | 9.15 | Google OAuth sign-in |
| helmet | 8 | HTTP security headers |
| express-rate-limit | 8 | Rate limiting on auth endpoints |
| multer | 2.4 | File upload (CSV import) |
| pdfkit | 0.20.2 | Server-side PDF generation |
| nodemailer | 10 | Email delivery (Brevo / Resend / SMTP) |
| groq-sdk | 1.6 | Groq AI provider |

### AI
| Provider | Model | Role |
|---|---|---|
| Groq | `openai/gpt-oss-20b` | Primary (tried first) |
| Google Gemini | `gemini-3.5-flash-lite` | Fallback |

Multi-key support per provider. Failed keys enter a 5-minute cooldown. App degrades gracefully with no AI keys.

### Hosting & Ops
| | |
|---|---|
| Frontend hosting | Vercel |
| Backend hosting | Vercel Serverless Functions |
| Database | MongoDB Atlas (mongodb+srv://) |
| Daily backup | Vercel cron — `0 2 * * *` (02:00 UTC) |

---

## SLIDE 12 — Deployment & Test Results

**Heading:** Live, tested, and production-ready

| | URL |
|---|---|
| **Frontend** | campuscointw7.vercel.app |
| **Backend API** | campuscoin-backend.vercel.app/api/v1 |

**Test report — 1 November 2026 (against live production):**

| Area | Result |
|---|---|
| Student registration & login | ✅ Passed |
| Student access controls | ✅ Passed |
| Student pages (17 routes) | ✅ Passed |
| Profile & settings | ✅ Passed |
| Categories (create/edit/delete) | ✅ Passed |
| Transactions (full CRUD + history + restore) | ✅ Passed |
| Budgets (create/edit/delete + summary) | ✅ Passed |
| Recurring entries | ✅ Passed |
| Savings goals (create/deposit/milestone/delete) | ✅ Passed |
| CSV import (preview + suggest + confirm) | ✅ Passed |
| Reports (monthly + 6-month trend) | ✅ Passed |
| AI (categorise + chat + insights) | ✅ Passed |
| Saving tips & bookmarks | ✅ Passed |
| Notifications | ✅ Passed |
| Backups (create/download/delete) | ✅ Passed |
| Admin console (all read operations) | ✅ Passed |
| Responsive layout (390px – 1440px) | ✅ Passed |
| PDF exports (reports + transactions) | 🔧 Fixed (font bundling issue on Vercel — resolved in latest deploy) |

---

## SLIDE 13 — What Makes This Different

**Heading:** Why Campus Coin is not just another budgeting app

1. **Student-first, not bank-first** — Works without a bank account. Categories tuned for campus life: Hostel, Allowance, Data/Airtime, Scholarship.

2. **AI that asks permission** — The AI proposes changes, the student approves. Nothing is saved without explicit confirmation.

3. **Offline-friendly import** — Students who've been tracking in Excel, Google Sheets, or WhatsApp notes can bring all that history in one upload (7 supported file formats).

4. **No subscriptions, no ads, no bank links** — 100% free to use. *100% Free · 0 Bank links required.*

5. **Savings milestones feel rewarding** — Confetti, badges, and milestone toasts turn saving from a chore into a game.

6. **Multi-currency from day one** — Nigerian, Ghanaian, UK, Indian, Pakistani students all pick their currency in step 1 of onboarding.

---

## SLIDE 14 — Team

**Heading:** Built by Team Flandek

*[Add individual names, roles, and photos here]*

**What we built:**
- Full-stack web application (Frontend + Backend + AI + Admin console)
- 15+ student pages, 9 admin pages
- 40+ REST API endpoints
- Multi-provider AI with auto-failover (Groq + Gemini)
- Multi-currency support (8 currencies)
- Server-side PDF generation and email delivery
- Comprehensive test suite — all core workflows passed on live production

---

## SLIDE 15 — Thank You / Demo

**Heading:** Thank you

**Subtitle:** Live demo → campuscointw7.vercel.app

> *"Smart money, Brighter Future."*

**Team Flandek · Campus Coin · November 2026**

---

---

# DESIGN REFERENCE

## Exact Colour Palette (from app source code)

| Name | Hex | Used for |
|---|---|---|
| Primary Green | `#1c8f53` | Buttons, active states, links, brand accent |
| Dark Green | `#177e48` | Hover state of primary green |
| Deep Dark | `#122a1f` | Stats strip background, admin gradient start |
| Deeper Dark | `#0b2a19` | Admin sidebar gradient mid |
| Darkest | `#07170e` | Admin sidebar gradient end |
| Forest Text | `#1d3d2d` | Main heading text (light mode) |
| Muted Text | `#4b5563` | Subheadings and body text |
| Light Green BG | `#f6fbf7` | Page background (light mode) |
| Light Green Tint | `#dfeee3` | Public layout background |
| Light Mint | `#d7f0d1` | Card backgrounds, badges |
| Brand Light | `#d1fae5` (approx `brand-100`) | Light accent backgrounds |
| White | `#ffffff` | Cards, modals |
| Off-white | `#f6f4ee` | Feature cards, step cards |

## Typography (from app source code — Tailwind classes)

| Element | Class | Equivalent |
|---|---|---|
| App wordmark | `font-bold tracking-tight` | Bold, tight letter-spacing |
| Page headings (h1) | `text-2xl font-bold` | ~24px Bold |
| Section headings (h2) | `text-lg font-semibold` | ~18px SemiBold |
| Card headings | `font-semibold` | ~16px SemiBold |
| Body text | `text-sm` | ~14px Regular |
| Small/muted text | `text-xs text-gray-500` | ~12px, gray |
| Uppercase labels | `text-xs font-semibold uppercase tracking-widest` | 12px, all-caps, wide spacing |
| Stat numbers | `text-3xl font-bold sm:text-4xl` | 30–36px Bold |

**Recommended presentation fonts:**
- **Headings:** Inter Bold, Poppins SemiBold, or DM Sans Bold
- **Body:** Inter Regular or DM Sans Regular
- **Mono/code bits:** JetBrains Mono or Fira Code

## Slide Layout Suggestions

**Recommended slide order for 15-minute presentation:**
1 → 2 → 3 → 4 → 6 → 5 → 8 → 7 → 9 → 10 → 11 → 12 → 13 → 14 → 15

**For a 10-minute version (cut to 10 slides):**
1 → 2 → 3 → 4 → 5 → 10 → 11 → 12 → 13 → 15

**Screenshots to include:**
- Dashboard page (shows all stat cards)
- AI Assistant chat (shows action approval card)
- Reports page (shows heatmap + donut chart)
- Savings Goals page (shows milestone pips)
- Onboarding step 1 (shows the currency picker + preview card)
- Admin Users page (shows the Create User button)
