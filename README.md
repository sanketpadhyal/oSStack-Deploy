<p align="center">
  <img src="src/assets/readmelogoo.png" alt="oSStack logo" width="96" />
</p>

<h1 align="center">oSStack</h1>

<p align="center">
  A modern, high-performance web deployment platform inspired by Vercel & Netlify — supporting zero-config static site deployments, automated framework detection (React, Vite, Next.js, Vue, Angular, Svelte), real-time build streaming, drag-and-drop folder deployment, and Supabase storage integration.
</p>

<p align="center">
  <a href="https://osstack.netlify.app">Website</a>
  |
  <a href="https://osstack.netlify.app/dashboard">Dashboard</a>
  |
  <a href="https://github.com/sanketpadhyal/osstack-deploy-backend-code">Backend Repository</a>
</p>

<p align="center">
  <a href="https://osstack.netlify.app">
    <img src="https://img.shields.io/badge/Live_Website-osstack.netlify.app-00C853?style=for-the-badge&logo=netlify&logoColor=white" alt="Live website" />
  </a>
  <a href="https://osstack.netlify.app/dashboard">
    <img src="https://img.shields.io/badge/Dashboard-Open_Platform-111827?style=for-the-badge&logo=react&logoColor=61DAFB" alt="Dashboard" />
  </a>
  <a href="https://github.com/sanketpadhyal/osstack-deploy-backend-code">
    <img src="https://img.shields.io/badge/Backend_Repo-osstack--deploy--backend--code-000000?style=for-the-badge&logo=github&logoColor=white" alt="Backend Repo" />
  </a>
</p>

## Overview

oSStack is a full-stack cloud deployment platform designed to automate web application deployment. It allows developers to deploy websites either by connecting GitHub repositories or by dragging and dropping project folders directly from their computer.

The platform includes a built-in smart detector that automatically identifies whether an uploaded project is a static HTML/CSS/JS site or a modern framework app (React, Vite, Next.js, Vue, Angular, Svelte, Docusaurus, Astro, etc.). Framework apps undergo automated dependency installation, local build execution, and bundle compilation, while static sites are deployed instantly without overhead. Build progress and terminal logs are streamed in real time to the web dashboard over WebSockets.

This repository contains the open-source codebase for the frontend web application and dashboard.

> [!IMPORTANT]
> **Open Source Notice**
> The **frontend web application, dashboard, build engine, and backend services** are open sourced.
> You can explore the full oSStack ecosystem here, run the code locally, or access the backend repository at [osstack-deploy-backend-code](https://github.com/sanketpadhyal/osstack-deploy-backend-code).

## Product Links

| Product Surface | Link |
| --- | --- |
| Website | [osstack.netlify.app](https://osstack.netlify.app) |
| Dashboard | [osstack.netlify.app/dashboard](https://osstack.netlify.app/dashboard) |
| Backend Repository | [osstack-deploy-backend-code](https://github.com/sanketpadhyal/osstack-deploy-backend-code) |

## What Happens During Deployment

1. Developer logs in via GitHub or Google authentication.
2. Developer connects a GitHub repository or drops a production folder into the deployment modal.
3. Backend creates an isolated workspace directory and ingests project source files.
4. Smart Detector (`detector.js`) inspects file structure for `package.json` build scripts or static `index.html`.
5. **Static Site**: If pure HTML/CSS/JS is detected, build steps are bypassed and files are prepared for instant deployment.
6. **Framework Site**: If a package project is detected, the engine selects the package manager (`npm`, `pnpm`, `yarn`), installs dependencies, and runs the build script (`npm run build`).
7. **Auto-Recovery**: If CLI tools (e.g. `vite`, `tsc`, `vue-cli-service`) or missing dependencies cause a build failure, the engine automatically installs missing tools on demand and retries the build automatically.
8. Compiled static assets (`dist/`, `build/`, `out/`, `public/`) are uploaded to Supabase Storage.
9. A client-side routing virtualization shim is injected into static HTML files for Single-Page Application (SPA) subpath navigation.
10. Live site URL is generated and streamed back to the developer's dashboard.

## Key Features

### Frontend & Web Dashboard

- Dark-themed responsive dashboard for PC and mobile screens.
- Drag & Drop folder uploader with WebKit directory traversal.
- Automatic exclusion of `.git`, `node_modules`, `.next`, and build artifacts during folder uploads.
- Real-time build terminal with log filtering, text wrap toggle, and one-click log copy.
- Live deployment progress meters and project stats.
- Extension store, domain management, and deployment activity tabs.

### Deployment Engine & Backend

- Multi-stage pipeline: `QUEUED` -> `CLONING` -> `INSTALLING` -> `BUILDING` -> `UPLOADING` -> `COMPLETED`.
- Real-time event streaming via Socket.IO WebSockets.
- Hard 10-minute timeout guard to handle hanging build processes.
- Automatic redactions for sensitive tokens and environment variables in build logs.
- Supabase Storage bucket management and file serving middleware.

## Project Structure

| Directory | Description |
| --- | --- |
| `osstack/` | React + Vite frontend web platform and dashboard |
| `osstack backend/` | Node.js Express server, Socket.IO engine, and deployment orchestrator |

## Main Files

### Frontend (`osstack/`)

| File | Purpose |
| --- | --- |
| `src/App.tsx` | Main application shell and route navigation |
| `src/dashboard/dashboardhome.tsx` | Main dashboard view, project grid, and Drag & Drop deploy modal |
| `src/dashboard/buildpage/currentbuilding.tsx` | Real-time build progress UI and WebSocket log terminal |
| `src/dashboard/projectspage.tsx` | Project overview, usage metrics, and deployment history |
| `src/lib/api.ts` | API request helper with automatic bearer token injection |

### Backend (`osstack backend/`)

| File | Purpose |
| --- | --- |
| `server.js` | Express REST API server, Socket.IO initialization, and folder upload handler |
| `building/runner.js` | Deployment orchestrator handling workspace setup, installation, compilation, and storage upload |
| `building/detector.js` | Project type detector (static site vs framework package) |
| `building/storage.js` | Supabase Storage uploader, file server, and SPA routing shim injector |
| `building/events.js` | Event logger and real-time Socket.IO emitter |
| `auth/auth.tsx` | Supabase OAuth callback and session handling |

## Tech Stack

| Component | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Lucide Icons, Lenis |
| Backend | Node.js, Express 5, Socket.IO |
| Storage & Database | Supabase Storage, Supabase Database (PostgreSQL) |
| Authentication | Supabase Auth (OAuth Google & GitHub), JWT |
| Styling | Custom Vanilla CSS (Design system with dark aesthetics) |

## Environment Variables & Credentials Setup

To run oSStack locally or deploy your own instance, create `.env` files in both frontend and backend directories.

### 1. Frontend Configuration (`osstack/.env`)

Create `osstack/.env` using the template below:

```env
VITE_API_URL=http://localhost:8080
```

### 2. Backend Configuration (`osstack backend/.env`)

Create `osstack backend/.env` using the template below:

```env
PORT=8080
BACKEND_URL=http://localhost:8080
FRONTEND_URL=http://localhost:3000

SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_DEPLOYMENT_BUCKET=deployments

GITHUB_CLIENT_ID=your-github-oauth-client-id
GITHUB_CLIENT_SECRET=your-github-oauth-client-secret
```

### Where To Obtain Credentials

1. **Supabase Credentials**:
   - Go to [Supabase Dashboard](https://supabase.com/dashboard) -> Select or create a project.
   - Navigate to **Project Settings** -> **API**.
   - Copy `Project URL` -> Paste into `SUPABASE_URL`.
   - Copy `anon` `public` key -> Paste into `SUPABASE_ANON_KEY`.
   - Copy `service_role` `secret` key -> Paste into `SUPABASE_SERVICE_ROLE_KEY`.

2. **GitHub OAuth Credentials**:
   - Go to [GitHub Developer Settings](https://github.com/settings/developers) -> **OAuth Apps** -> **New OAuth App**.
   - Set **Homepage URL** to `http://localhost:3000`.
   - Set **Authorization callback URL** to `http://localhost:8080/auth/callback`.
   - Copy `Client ID` and generate a `Client Secret`.

## Database Setup (Supabase SQL Schema)

Execute the following SQL script inside the **Supabase SQL Editor** to set up the required database tables, indexes, and security policies:

```sql
create extension if not exists pgcrypto;

create table if not exists public.osstack_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'oSStack user',
  email text,
  gmail text,
  profile_photo text,
  provider text not null default 'unknown',
  passkey boolean not null default false,
  frequentquestions boolean not null default false,
  email_verified boolean not null default false,
  max_projects integer not null default 3,
  storage_bytes bigint not null default 1073741824,
  build_minutes integer not null default 100,
  bandwidth_bytes bigint not null default 10737418240,
  created_at timestamptz not null default now(),
  last_sign_in_at timestamptz not null default now()
);

create table if not exists public.osstack_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.osstack_profiles(id) on delete cascade,
  name text not null,
  slug text not null,
  repo text,
  branch text not null default 'main',
  status text not null default 'queued',
  live_url text,
  storage_bytes bigint not null default 0,
  bandwidth_bytes bigint not null default 0,
  build_minutes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.osstack_deployments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.osstack_profiles(id) on delete cascade,
  project_id uuid references public.osstack_projects(id) on delete set null,
  project_name text not null,
  status text not null default 'Queued',
  detail text not null default 'Deployment created',
  created_at timestamptz not null default now()
);

create index if not exists osstack_projects_user_id_idx on public.osstack_projects(user_id);
create index if not exists osstack_deployments_user_id_created_at_idx on public.osstack_deployments(user_id, created_at desc);

alter table public.osstack_profiles enable row level security;
alter table public.osstack_projects enable row level security;
alter table public.osstack_deployments enable row level security;

create policy "Users can read own profile" on public.osstack_profiles for select using (auth.uid() = id);
create policy "Users can read own projects" on public.osstack_projects for select using (auth.uid() = user_id);
create policy "Users can read own deployments" on public.osstack_deployments for select using (auth.uid() = user_id);
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm, yarn, or pnpm
- Supabase Account

### Step 1: Install Dependencies

Install dependencies for the frontend application:

```bash
cd osstack
npm install
```

Install dependencies for the backend service:

```bash
cd "osstack backend"
npm install
```

### Step 2: Configure Environment Variables

1. Copy `.env.example` to `.env` in `osstack/` and set `VITE_API_URL`.
2. Copy `.env.example` to `.env` in `osstack backend/` and set your Supabase and OAuth keys.

### Step 3: Run Database Migrations

Run the SQL setup script provided in the [Database Setup](#database-setup-supabase-sql-schema) section in your Supabase SQL Editor.

### Step 4: Start Development Servers

Start the backend service:

```bash
cd "osstack backend"
npm run dev
```

In a separate terminal, start the frontend web application:

```bash
cd osstack
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

## Security & Privacy

- All sensitive keys (`SUPABASE_SERVICE_ROLE_KEY`, OAuth secrets) must remain strictly server-side and never be exposed in client code.
- Project builds execute in isolated temporary build directories.
- Secret redaction middleware ensures tokens and secrets are stripped from build log streams before broadcasting to WebSockets.
