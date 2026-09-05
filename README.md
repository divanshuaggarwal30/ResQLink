# 🚨 ResQLink

> **Real-time emergency response coordination for civilians, command centers, and field responders.**

**Report → Dispatch → Respond → Resolve**

ResQLink is a full-stack real-time emergency response platform designed around a critical coordination problem: multiple users must safely report incidents, dispatch responders, and synchronize mission state in real time.

**[Live Demo](YOUR_DEPLOYED_APP_URL) · [GitHub](https://github.com/divanshuaggarwal30/ResQLink.git)**

---

## Why ResQLink?

The core challenge isn't building another CRUD application. It's maintaining **correctness, authorization, and synchronization when multiple actors interact with the same operational data concurrently.**

ResQLink addresses these problems at the **database and system-design level**.

### Engineering Decisions

| Challenge                           | Solution                                        |
| ----------------------------------- | ----------------------------------------------- |
| Conflicting responder assignments   | **PostgreSQL transactions + row-level locking** |
| Unauthorized data access            | **PostgreSQL Row-Level Security (RLS)**         |
| Unsafe privileged operations        | **Protected PostgreSQL RPCs**                   |
| Invalid mission transitions         | **Database-enforced state machine**             |
| Stale client state                  | **Supabase Realtime**                           |
| Live responder tracking             | **Geolocation API + RPCs + Realtime**           |
| Resolved incidents remaining active | **PostgreSQL triggers + archival workflow**     |

---

## Hard Parts

### 1. Concurrency-Safe Dispatch

A responder may be selected by multiple administrators at nearly the same time.

Instead of relying on frontend checks, ResQLink performs dispatch inside a **PostgreSQL transaction with row-level locking**:

```text
Request
   ↓
Begin Transaction
   ↓
Lock Responder Row
   ↓
Verify Availability
   ↓
Assign Mission
   ↓
Commit
```

When implemented within the same transaction, the lock, availability check, and assignment form an **atomic database operation**, preventing conflicting responder dispatches.

### 2. Database-Enforced Authorization

Frontend role checks are not treated as a security boundary.

ResQLink uses:

* **Supabase Auth** for identity
* **PostgreSQL RLS** for row-level authorization
* **Protected RPCs** for controlled database operations

Authorization therefore remains enforced at the **data layer**, rather than depending on the client UI.

### 3. Mission State Integrity

A mission follows a controlled lifecycle:

```text
PENDING → ACCEPTED → ARRIVED → RESOLVED
```

Transitions are validated so clients cannot arbitrarily move missions into invalid states.

### 4. Real-Time Synchronization

Operational state changes are propagated through **Supabase Realtime**, keeping connected command-center and responder clients synchronized without manual refreshes or constant polling.

```text
PostgreSQL
    ↓
Supabase Realtime
    ↓
Connected Clients
    ↓
Live UI / Map
```

---

## Tech Stack

**Frontend:** React 19 · Vite · Tailwind CSS · React Router · React Leaflet

**Backend:** Supabase · PostgreSQL · Supabase Auth · PostgreSQL RPCs · Supabase Realtime

**Systems:** RLS · Transactions · Row-Level Locking · Database Triggers · State Machines · Geolocation API

**Deployment:** Vercel · Supabase Cloud

---

## Run Locally

### Prerequisites

* Node.js
* Supabase project

### Installation

```bash
git clone <repository-url>
cd resqlink
npm install
npm run dev
```

Create a `.env` file:

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Build for production:

```bash
npm run build
```

> **Security:** Never expose the Supabase `service_role` key or other server-side secrets in client-side code.

---

## Author

**Divanshu Aggarwal** · B.Tech AI/ML

**Real-Time Systems · Concurrency · PostgreSQL · Distributed Synchronization · Authorization**
