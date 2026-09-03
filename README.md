# ResQLink

> **Real-time disaster response coordination for civilians, command centers, and field responders.**

ResQLink is a full-stack emergency response dashboard that turns a civilian incident report into a coordinated field operation. It combines **Supabase Authentication, PostgreSQL, Row Level Security, Realtime, secure RPCs, and interactive maps** to provide a live operational view of active incidents and responder availability.

The project is designed around one goal: **reduce the gap between reporting an emergency and getting the right responder to the right location.**

---

## Overview

ResQLink connects three role-based experiences:

| Role | Responsibility |
| --- | --- |
| **Civilian** | Report an emergency with type, severity, and GPS coordinates. |
| **Admin / Command Center** | Monitor incidents live, track responders, and dispatch available units. |
| **Field Responder** | Receive assigned missions, share live location, and progress missions through their lifecycle. |

### Mission lifecycle

```text
Civilian reports incident
        │
        ▼
     PENDING
        │
        │ Admin dispatches available responder
        ▼
PENDING + RESPONDER ASSIGNED
        │
        │ Responder accepts
        ▼
     ACCEPTED
        │
        │ Responder arrives
        ▼
      ARRIVED
        │
        │ Responder resolves
        ▼
     RESOLVED
        │
        ▼
 Incident archive
```

---

## Why ResQLink?

Traditional emergency reporting often separates **reporting, dispatch, and field operations**. ResQLink brings those workflows into one real-time system.

### Core capabilities

- 🚨 Emergency reporting for **Flood, Fire, Medical, and Structural** incidents
- 📍 GPS-based incident coordinates
- 🗺️ Live incident and responder map
- 📡 Supabase Realtime updates without manual refresh
- 👨‍💼 Role-based command center for administrators
- 👨‍🚒 Responder-only mission queue
- 🚑 Secure responder dispatch with availability checks
- 📱 Mobile-first responder workflow
- 📍 Continuous responder GPS updates while on duty
- 🔐 PostgreSQL Row Level Security
- 🛡️ Database-enforced authorization through `SECURITY DEFINER` RPCs
- ⏱️ Mission timestamps: assigned, accepted, arrived, and resolved
- 🗄️ Automatic resolved-incident archival
- ⚡ Indexed incident and responder queries for operational workloads

---

## Architecture

```text
┌─────────────────────── Client Layer ───────────────────────┐
│                                                           │
│  Civilian UI       Admin Command Center     Responder UI  │
│      │                     │                     │         │
└──────┼─────────────────────┼─────────────────────┼─────────┘
       │                     │                     │
       └─────────────────────┼─────────────────────┘
                             ▼
                    Supabase Client SDK
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
       Supabase Auth                  Supabase Realtime
              │                             │
              └──────────────┬──────────────┘
                             ▼
                    PostgreSQL Database
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
      profiles           incidents       incident_archive
          │                  │                  │
          └──────────────┬───┴──────────────────┘
                         ▼
                    RLS + RPCs
```

---

## Tech Stack

### Frontend

- **React 19** — component-based UI
- **Vite** — development server and production bundling
- **Tailwind CSS 4** — responsive styling
- **React Router 7** — role-based application routing
- **Lucide React** — interface icons
- **React Leaflet + Leaflet** — incident and responder mapping

### Backend / Data

- **Supabase Auth** — authentication and sessions
- **PostgreSQL** — persistent application data
- **Supabase Realtime** — live incident and responder updates
- **PostgreSQL RLS** — row-level authorization
- **PostgreSQL RPCs** — server-side validation for sensitive operations
- **Database trigger** — resolved-incident archival

### Tooling / Deployment

- **Oxlint** — JavaScript/React linting
- **Vercel** — frontend deployment
- **Supabase Cloud** — backend and database hosting

---

## Role-based workflows

### 1. Civilian

A civilian can:

1. Sign in.
2. Select an emergency type.
3. Select severity.
4. Capture or provide latitude/longitude.
5. Submit the emergency report.
6. View their own submitted incidents.

The client automatically associates the report with the authenticated user's ID. Database policies prevent civilians from modifying dispatch information or accessing other users' incidents.

### 2. Admin / Command Center

An administrator gets an operational view containing:

- Live incident feed
- Severity indicators
- Active/pending mission statistics
- Available and busy responders
- Incident map
- Responder locations
- Incident selection and inspection
- Secure responder dispatch

Dispatch is not implemented as a trusted client-side update. The client calls the `dispatch_incident` PostgreSQL RPC, which validates the administrator role, locks the relevant rows, verifies responder availability, assigns the responder, and marks the responder busy.

### 3. Field Responder

A responder sees only assigned active missions and can progress them through:

```text
Accept Mission → Arrived at Location → Issue Resolved
```

The browser can continuously publish the responder's GPS coordinates through a protected database RPC. When a mission is resolved, the responder becomes available again and the incident is archived.

---

## Security model

ResQLink treats the frontend as an **untrusted client**. UI restrictions are for usability; PostgreSQL is the security boundary.

### Authentication

Supabase Auth manages user identity and sessions.

### Roles

Each authenticated user has a corresponding `profiles` row with a role such as:

- `civilian`
- `admin`
- `responder`

### RLS principles

| Operation | Civilian | Responder | Admin |
| --- | :---: | :---: | :---: |
| Create incident | ✅ | authenticated | authenticated |
| Read own incidents | ✅ | — | — |
| Read assigned incidents | — | ✅ | — |
| Read all active incidents | ❌ | ❌ | ✅ |
| Dispatch responder | ❌ | ❌ | ✅ |
| Update mission stage | ❌ | assigned only | ❌ |
| Update own responder location | ❌ | ✅ | ❌ |
| Read responder operations | ❌ | own | ✅ |
| Read incident archive | ❌ | ❌ | ✅ |

Sensitive state changes are additionally enforced through PostgreSQL functions rather than relying on client-side checks.

> **Important:** never put a Supabase `service_role` key in the frontend. Only the public/anon key belongs in Vite client-side environment variables.

---

## Database operations

The operations migration adds and hardens the responder/incident workflow.

### Responder operations

- `update_responder_location(latitude, longitude)`
- `update_responder_availability(availability)`

### Dispatch

- `dispatch_incident(incident_id, responder_id)`

The dispatch operation uses row locking to reduce race conditions when multiple command-center users attempt to assign the same incident or responder.

### Mission state machine

- `update_incident_status(incident_id, new_status)`

Allowed transitions:

```text
pending  → accepted
accepted → arrived
arrived  → resolved
```

Invalid transitions are rejected at the database layer.

### Archival

When an incident changes to `resolved`, a PostgreSQL trigger copies the resolved record and its mission timestamps into `incident_archive`.

---

## Realtime data flow

```text
PostgreSQL change
       │
       ▼
Supabase Realtime
       │
       ├──────────────► Admin Command Center
       │
       └──────────────► Assigned Responder
```

The frontend subscribes to PostgreSQL changes and updates the incident/responder views without requiring a page refresh.

Responder location changes follow the reverse direction:

```text
Responder GPS
     │
     ▼
Protected RPC
     │
     ▼
profiles.latitude / longitude
     │
     ▼
Supabase Realtime
     │
     ▼
Admin map
```

---

## Project structure

```text
resqlink/
├── public/
│   └── favicon.svg
│
├── src/
│   ├── components/
│   │   ├── admin/
│   │   │   ├── IncidentMap.jsx
│   │   │   └── MapOverlay.jsx
│   │   └── common/
│   │       └── ProtectedRoute.jsx
│   │
│   ├── contexts/
│   │   └── AuthContext.jsx
│   │
│   ├── hooks/
│   │   ├── useIncidents.js
│   │   ├── useResponderIncidents.js
│   │   └── useResponders.js
│   │
│   ├── lib/
│   │   └── supabase.js
│   │
│   ├── pages/
│   │   ├── AdminDashboard.jsx
│   │   ├── CivilianDashboard.jsx
│   │   ├── Login.jsx
│   │   └── ResponderDashboard.jsx
│   │
│   ├── services/
│   │   ├── incidentService.js
│   │   └── responderService.js
│   │
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
│
├── supabase/
│   └── migrations/
│       └── 20260902184300_resqlink_operations.sql
│
├── .env.example
├── .gitignore
├── .oxlintrc.json
├── index.html
├── package.json
├── package-lock.json
└── vite.config.js
```

---

## Getting started

### Prerequisites

- Node.js 20+
- npm
- A Supabase project
- A modern browser with geolocation support for responder tracking

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd resqlink
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create `.env` from the included example:

```bash
cp .env.example .env
```

Set:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

For Windows PowerShell, create the file manually if `cp` is unavailable.

### 4. Configure Supabase

The application expects the core ResQLink database objects to exist:

- `profiles`
- `incidents`
- `incident_archive`
- the project's incident/user role enums

Then apply:

```text
supabase/migrations/20260902184300_resqlink_operations.sql
```

The migration adds responder availability/location fields, operational indexes, secure RPCs, archival behavior, and Realtime publication configuration.

### 5. Enable authentication

In Supabase, enable the authentication provider used by the application. ResQLink currently uses email/password sign-in.

Every authenticated application user needs a matching `profiles` row with the correct role.

### 6. Start development

```bash
npm run dev
```

Open the local Vite URL shown in the terminal.

---

## Available scripts

```bash
npm run dev       # Start development server
npm run build     # Create production build
npm run preview   # Preview production build locally
npm run lint      # Run Oxlint
```

Recommended pre-push check:

```bash
npm run lint
npm run build
```

---

## Production deployment

### Frontend — Vercel

1. Push the repository to GitHub.
2. Import the repository into Vercel.
3. Use the Vite project root as the project root.
4. Add the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables.
5. Deploy.

### Backend — Supabase

Supabase hosts:

- Authentication
- PostgreSQL
- RLS policies
- RPC functions
- Realtime
- incident archival trigger

The frontend should only contain the public Supabase client credentials intended for browser use.

---

## Operational safeguards

ResQLink includes database-level safeguards for the most important operations:

- Admin authorization is checked inside dispatch RPCs.
- Responder authorization is checked before mission updates.
- A responder can update only their own GPS location.
- Dispatch verifies that the target responder is actually a responder.
- Dispatch verifies responder availability.
- Dispatch verifies the incident is still pending and unassigned.
- Mission transitions are ordered and validated by PostgreSQL.
- Invalid GPS coordinates are rejected by the location RPC.
- Resolved incidents are archived automatically.
- Indexes support common incident/responder lookups.

---

## Current limitations

This repository is an operational prototype rather than a certified emergency-services platform.

For real-world emergency deployment, additional work would be required around:

- High-availability architecture
- Disaster recovery and backups
- Observability and alerting
- Audit-log immutability
- Rate limiting and abuse prevention
- Infrastructure redundancy
- Offline-first responder capabilities
- Push/SMS/voice escalation
- Geospatial routing and ETA calculation
- Automated incident prioritization
- Comprehensive automated tests
- Formal security assessment
- Privacy, retention, and regulatory requirements

**ResQLink should not be used as the sole system for real emergency dispatch without appropriate operational and safety validation.**

---

## Roadmap

Potential next-generation capabilities:

- [ ] AI-assisted incident prioritization
- [ ] Nearest-responder recommendation
- [ ] Route and ETA optimization
- [ ] Push notifications
- [ ] Offline responder mode
- [ ] Multi-agency dispatch
- [ ] Incident heatmaps and historical analytics
- [ ] SLA and response-time dashboards
- [ ] Immutable audit event stream
- [ ] Automated integration tests
- [ ] End-to-end Playwright testing

---

## Screenshots

Recommended GitHub screenshots for the project showcase:

1. Civilian emergency reporting screen
2. Admin command center
3. Live incident/responder map
4. Responder mission screen
5. Mission lifecycle after resolution

Add project screenshots under `docs/screenshots/` when available.

---

## Engineering highlights

ResQLink demonstrates practical full-stack engineering beyond a standard CRUD application:

- Role-based application architecture
- Real-time event-driven UI
- PostgreSQL RLS security model
- Database-side authorization
- Transaction-safe dispatch with row locking
- State-machine-style mission transitions
- Browser geolocation integration
- Live operational map visualization
- Automated database archival
- Responsive interfaces for desktop command centers and mobile field users

---

## License

This project is currently intended as a portfolio/educational project. Add a formal license before distributing it for external use.

---

## Author

**Divanshu Aggarwal**

ResQLink was built as a full-stack emergency-response engineering project with a focus on real-time systems, secure database design, responsive interfaces, and operational workflows.
