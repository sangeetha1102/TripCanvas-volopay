# TripCanvas

TripCanvas is a minimal travel planning application built with **React**, **TypeScript**, **Node.js**, **Supabase PostgreSQL**, and a standalone **Streamable HTTP MCP server** using the official `@modelcontextprotocol/sdk`.

## Architecture

- **Frontend (`src/` + `server.ts`)**: React + Tailwind CSS SPA served by Express. Authenticates users via Supabase Auth and communicates with Supabase PostgreSQL using only public `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` credentials protected by Row Level Security (RLS).
- **MCP Server (`mcp-server/`)**: Separate Node.js + TypeScript service exposing Streamable HTTP transport at `POST /mcp` with 5 real Supabase-backed tools:
  - `create_trip`
  - `get_trip`
  - `add_itinerary_activity`
  - `update_itinerary_activity`
  - `delete_itinerary_activity`
- **Database (`supabase/schema.sql`)**: PostgreSQL tables `trips`, `activities`, and `mcp_tokens` with RLS policies enforcing user-level isolation.

---

## 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard and execute the entire contents of `supabase/schema.sql`.
3. Under **Authentication -> Providers**, ensure **Email** is enabled.
4. Note your project credentials from **Settings -> API**:
   - `Project URL` (`VITE_SUPABASE_URL` / `SUPABASE_URL`)
   - `anon public` key (`VITE_SUPABASE_ANON_KEY`)
   - `service_role` secret key (`SUPABASE_SERVICE_ROLE_KEY` — **MCP server only, never put in frontend code**)

---

## 2. Environment Variables

### Frontend & Web Server (`/.env`)

Copy `.env.example` to `.env`:

```env
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
VITE_MCP_SERVER_URL="http://localhost:3001/mcp"
PORT=3000
APP_URL="http://localhost:3000"
```

### MCP Server (`/mcp-server/.env`)

Copy `mcp-server/.env.example` to `mcp-server/.env`:

```env
SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
PORT=3001
CORS_ORIGIN="*"
MCP_PUBLIC_URL="http://localhost:3001"
```

---

## 3. Running Locally

### Start the TripCanvas Web App (Port 3000)

```bash
npm install
npm run dev
```

### Start the Separate MCP Server (Port 3001)

```bash
npm --prefix mcp-server install
npm --prefix mcp-server run dev
```

Health check: `GET http://localhost:3001/health`

---

## 4. Connecting Claude & Running the End-to-End Demo

1. Sign in (or create an account) in **TripCanvas** (`http://localhost:3000`).
2. Navigate to **MCP Access** in the sidebar and generate a **Personal Access Token** (`tc_...`).
3. Configure Claude with your MCP server endpoint and Bearer token:
   - **Claude.ai Remote MCP (Custom Connector)**:
     - URL: `https://<your-deployed-mcp-host>/mcp`
     - Header: `Authorization: Bearer <your-tc-token>`
   - **Claude Desktop (`claude_desktop_config.json`)**:
     ```json
     {
       "mcpServers": {
         "tripcanvas": {
           "command": "npx",
           "args": [
             "-y",
             "mcp-remote",
             "https://<your-deployed-mcp-host>/mcp",
             "--header",
             "Authorization: Bearer <your-tc-token>"
           ]
         }
       }
     }
     ```
4. **Required Demonstration Flow**:
   - **Claude -> MCP -> Supabase**: Ask Claude: *"Create a 3-day Goa trip in TripCanvas from 2026-12-10 to 2026-12-12 for 2 travellers with a budget of 45000 INR, and add a Day 1 morning walk at Palolem Beach at 08:00."*
     - Claude calls `create_trip` and `add_itinerary_activity`.
   - **Supabase -> TripCanvas**: Open TripCanvas **Dashboard** or **My Trips**. The Goa trip and Day 1 activity appear immediately.
   - **User edits activity time in TripCanvas**: Open the Goa trip itinerary, click the `8:00 AM` time badge (or Edit icon) on the Palolem Beach activity, change the time to `10:30`, and click **Save Activity**.
   - **TripCanvas -> Supabase -> Claude**: Ask Claude: *"Fetch my Goa trip from TripCanvas and tell me the scheduled time for Palolem Beach."*
     - Claude calls `get_trip` and reads the updated `10:30` time directly from Supabase PostgreSQL.

---

## 5. Public Deployment

Both services include production builds and Dockerfiles:

- **Web App (`Dockerfile`)**:
  ```bash
  npm run build
  npm start
  ```
  Pass `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_MCP_SERVER_URL` at build time (or deploy to Vercel / Netlify / Cloud Run / Render).

- **MCP Server (`mcp-server/Dockerfile`)**:
  ```bash
  npm --prefix mcp-server run build
  npm --prefix mcp-server start
  ```
  Deploy to Cloud Run, Render, Fly.io, or Railway with `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `PORT` configured as runtime secrets.
