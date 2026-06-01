# School Management System — Phase 1

React + Vite + Tailwind CSS frontend with Supabase backend. Phase 1 delivers
authentication, role-based dashboards (Admin / Teacher / Student shells), and
fully functional Admin **Student Management** and **Teacher Management**.

## Prerequisites

- Node.js 20+ and npm
- A Supabase project with the tables, RLS policies, storage buckets, and an
  admin account already created (as described in the project spec).

## 1. Configure environment variables

Copy `.env.example` to `.env` and fill in your real values from the Supabase
dashboard (**Project Settings → API**):

```bash
cp .env.example .env
```

| Variable | Where it's used | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Browser | Your project URL |
| `VITE_SUPABASE_ANON_KEY` | Browser | The **anon/public** key (safe to expose) |
| `SUPABASE_URL` | Server (`/api`) | Same project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server (`/api`) | The **service_role secret** — NEVER expose to the browser |

> 🔒 The service role key is only ever read by the serverless functions in
> `/api` (and the Vite dev middleware). It is **not** prefixed with `VITE_`, so
> it is never bundled into client code. This is what lets the admin create
> student/teacher login accounts without being logged out — and keeps the key
> off the public internet.

## 2. Install & run (development)

```bash
npm install
npm run dev
```

Open http://localhost:5173. The Vite dev server also serves the `/api`
functions locally via a small middleware, so account creation works end-to-end
without any extra tooling.

## 3. Deploy (Vercel)

```bash
npm i -g vercel
vercel
```

In the Vercel project settings add the four environment variables above
(`VITE_*` for all environments; `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
server-side). The `/api` folder is auto-deployed as serverless functions and
`vercel.json` handles SPA routing.

## How login works

- One login page at `/login` for all roles.
- After sign-in, the app reads the user's role from the `user_roles` table and
  redirects: admin → `/admin/dashboard`, teacher → `/teacher/dashboard`,
  student → `/student/dashboard`.
- Routes are protected; signed-out users are sent to `/login`.

## Creating accounts (Admin)

- **Add Student**: creates `admissionno@school.com` (password = admission no),
  inserts into `students`, `user_roles` (role=student), and
  `student_enrollments` for the **active** academic session. Requires an active
  session — the UI blocks creation and shows a notice if none exists.
- **Add Teacher**: creates `employeeid@school.com` (password = employee id),
  inserts into `teachers` and `user_roles` (role=teacher).
- Editing and deactivating use the admin's own session (RLS grants admins full
  access); deactivation sets `status` and never deletes records.

## ⚠️ One schema note to confirm

The "Deactivate" action sets a student's `status` to **`inactive`**. The spec's
`students.status` enum is listed as `active / graduated / transferred`. If your
database enum does **not** include `inactive`, change `INACTIVE_STUDENT` in
[`src/lib/constants.js`](src/lib/constants.js) to a valid value (e.g.
`transferred`) or add `inactive` to the enum. Teachers use `active / inactive`,
which matches the spec.

## Project structure

```
api/                     Serverless functions (service-role; server-only)
  _lib/admin.js          Admin client + admin-auth verification
  create-student.js
  create-teacher.js
src/
  components/            Layout, ProtectedRoute, UI primitives, admin forms
  config/navigation.js   Sidebar items per portal
  context/AuthContext.jsx
  lib/                   supabase client, api helper, constants
  pages/                 Login + admin/teacher/student pages
vite.config.js           Includes dev /api middleware
vercel.json              SPA rewrites
```
