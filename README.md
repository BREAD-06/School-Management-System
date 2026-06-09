# Bala Ji Public School — Management System

A React + Vite + Tailwind CSS application backed by Supabase. It provides a
public marketing **landing page** plus three role-based portals (Admin,
Teacher, Student) covering students, teachers, attendance, fees, marks,
examinations, homework, study materials, timetable, announcements, gallery,
academic sessions, internal messaging, and website-content management.

- **Public landing page** at `/` (no login required)
- **Login** at `/login` → redirects to the role's portal
- Serverless `/api` functions hold the Supabase **service role** key (never shipped to the browser)

---

## Prerequisites

- Node.js 20+ and npm
- A Supabase project (tables, storage buckets, and an admin account created per the project spec)

---

## 1. Environment variables

Copy `.env.example` to `.env` and fill in your real values
(**Supabase → Project Settings → API**):

```bash
cp .env.example .env
```

| Variable | Scope | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Browser | Project URL |
| `VITE_SUPABASE_ANON_KEY` | Browser | **anon/public** key (safe to expose) |
| `SUPABASE_URL` | Server (`/api`) | Same project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server (`/api`) | **service_role secret** — never expose to the browser |
| `VITE_MSG91_API_KEY` | Browser gate + server fallback | MSG91 auth key; also read by the SMS proxy |
| `VITE_MSG91_SENDER_ID` | SMS | DLT sender id (default `BJPSCH`) |
| `VITE_MSG91_TEMPLATE_ID` | SMS | DLT flow/template id (required once DLT is approved) |
| `VITE_SCHOOL_NAME` | Browser | Display name |
| `MSG91_API_KEY` *(optional)* | Server (`/api`) | Server-only MSG91 key; if unset, the proxy falls back to `VITE_MSG91_API_KEY` |

> 🔒 Anything **not** prefixed with `VITE_` is server-only and is never bundled
> into the client. The service role key lives only inside `/api`.
>
> 📵 **SMS:** MSG91 DLT registration is pending. The SMS code is complete and
> routes through the server proxy `api/send-sms.js` (no browser CORS). It will
> start sending only once DLT is approved and a valid `VITE_MSG91_TEMPLATE_ID`
> (and key) are set.

---

## 2. Supabase configuration

Run the SQL migrations in the **Supabase SQL Editor**, in order. They are
idempotent (safe to run more than once):

1. `supabase/phase3.sql`
2. **`supabase/phase4.sql`** ← required for Phase 4
3. **`supabase/phase5.sql`** ← required for the file-based timetable system
   (adds `file_url` + `uploaded_by` to `timetable`, drops the old period
   NOT-NULL constraints, removes legacy period rows, and creates the public
   `timetables` storage bucket)

`phase4.sql` sets up:

- **Public (anon) read** on `website_content`, `gallery`, and `announcements`
  (audience `all`) — needed for the landing page.
- **Admin write** policy on `website_content` — needed for the Website Content page.
- Defense-in-depth RLS on `messages` (the app itself sends/reads messages via the
  server `/api/messages` function).

It also creates the public **`website-content`** storage bucket used for
landing-page images (hero, about, principal, facilities).

Also ensure the storage buckets used by earlier phases exist
(`gallery`, `announcements`, `datesheets`).

---

## 3. Develop locally

```bash
npm install
npm run dev
```

Open http://localhost:5173. The Vite dev server also serves the `/api`
functions through a small middleware (`vite.config.mjs`), so account creation,
password reset, SMS proxy, and messaging all work end-to-end locally.

---

## 4. Build

```bash
npm run build      # outputs to dist/
npm run preview    # serve the production build locally
```

---

## 5. Deploy to Vercel

```bash
npm i -g vercel
vercel
```

**Deployment checklist**

- [ ] Run `supabase/phase3.sql` and `supabase/phase4.sql` in Supabase.
- [ ] In Vercel → Project Settings → Environment Variables, add **all** variables
      from the table above (`VITE_*` for every environment; `SUPABASE_URL` and
      `SUPABASE_SERVICE_ROLE_KEY` as server secrets).
- [ ] Confirm `npm run build` passes locally.
- [ ] Deploy. The `/api` folder auto-deploys as serverless functions; `vercel.json`
      rewrites all non-`/api` routes to `index.html` for SPA routing.
- [ ] Smoke test: landing page at `/`, login, create a student/teacher, reset a
      password, send a message between two accounts, edit Website Content and
      confirm the landing page reflects it.

The `/api` serverless functions are:

| Route | Purpose |
| --- | --- |
| `api/create-student.js` | Admin creates a student login + record |
| `api/create-teacher.js` | Admin creates a teacher login + record |
| `api/reset-password.js` | Admin resets a user's password to their default |
| `api/send-sms.js` | Server-side MSG91 SMS proxy |
| `api/messages.js` | Internal messaging (directory / conversations / thread / send / mark-read) |

---

## Routing

- `/` — **public landing page** for everyone. Unauthenticated visitors stay here;
  they are **not** redirected to `/login`. A signed-in user hitting `/` is sent to
  their portal dashboard.
- `/login` — single login page for all roles. After sign-in the app reads the role
  from `user_roles` and redirects: admin → `/admin/dashboard`,
  teacher → `/teacher/dashboard`, student → `/student/dashboard`.
- `/admin/*`, `/teacher/*`, `/student/*` — protected portal routes.

## Messaging permissions

- **Admin** → any teacher or student
- **Teacher** → the admin(s) and any student
- **Student** → the admin(s) and their class teachers

These rules are enforced server-side in `api/messages.js`.

## Project structure

```
api/                      Serverless functions (service-role; server-only)
  _lib/admin.js           Admin client + admin-auth verification
  create-student.js  create-teacher.js  reset-password.js  send-sms.js  messages.js
src/
  components/
    landing/              Public landing page sections (header, hero, sections, …)
    admin/  account/  ui/ Portal components + primitives
  config/navigation.js    Sidebar items per portal
  context/                AuthContext + useAuth
  lib/                    supabase client, api helper, sms, constants, landingContent
  pages/                  Landing, Login, Messages, Settings + admin/teacher/student
supabase/                 phase3.sql, phase4.sql (run in Supabase SQL Editor)
vite.config.mjs           Dev /api middleware
vercel.json               SPA rewrites
```
