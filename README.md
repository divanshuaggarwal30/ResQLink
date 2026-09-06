# 🚨 ResQLink

> **Real-time emergency response coordination for civilians, command centers, and field responders.**

**Report → Dispatch → Respond → Resolve**

ResQLink is a full-stack real-time emergency response platform designed around a distributed-systems problem: **safely coordinating shared responders while multiple users update operational state concurrently.**

[Live Demo](YOUR_DEPLOYED_APP_URL) · [GitHub](https://github.com/divanshuaggarwal30/ResQLink)

## ⚡ Engineering Highlights

* **Concurrency-safe dispatch** — PostgreSQL transactions + row-level locking prevent conflicting responder assignments.
* **Database-level authorization** — PostgreSQL RLS protects data instead of relying on frontend checks.
* **Secure privileged workflows** — Controlled PostgreSQL RPCs enforce sensitive operations server-side.
* **State integrity** — Database-enforced mission lifecycle: `PENDING → ACCEPTED → ARRIVED → RESOLVED`.
* **Real-time synchronization** — Supabase Realtime keeps command-center and responder clients synchronized.
* **Live geolocation** — Browser Geolocation API enables responder location tracking.

### Dispatch Flow

```text
Request
   ↓
Lock Incident + Responder
   ↓
Validate State
   ↓
Assign Responder
   ↓
Update Availability
   ↓
Commit
```

The critical assignment workflow executes inside a PostgreSQL transaction, making resource allocation safe under concurrent requests.

## 🏗️ Architecture

```text
Civilian
   │
   ▼
React Frontend
   │
   ▼
Supabase Auth + PostgreSQL
   │
   ├── RLS
   ├── Transactions
   ├── Row-Level Locking
   ├── RPCs
   └── Triggers
   │
   ▼
Supabase Realtime
   │
   ├── Command Center
   └── Field Responders
```

## 🎯 Core Capabilities

**Civilian:** report emergencies, provide GPS coordinates, track personal incidents.

**Command Center:** monitor incidents, view maps, track responder availability, dispatch units.

**Responder:** receive assignments, accept/arrive/resolve missions, share live location.

## 🛠️ Tech Stack

**Frontend:** React 19 · Vite · Tailwind CSS · React Router · React Leaflet

**Backend:** Supabase · PostgreSQL · Supabase Auth · PostgreSQL RPCs · Supabase Realtime

**Systems:** RLS · Transactions · Row-Level Locking · Database Triggers · State Machines · Geolocation API

**Deployment:** Vercel · Supabase Cloud

## 🚀 Run Locally

```bash
git clone https://github.com/divanshuaggarwal30/ResQLink.git
cd ResQLink/resqlink
npm install
npm run dev
```

Create `.env`:

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Build:

```bash
npm run build
```

## 👨‍💻 Author

**Divanshu Aggarwal**