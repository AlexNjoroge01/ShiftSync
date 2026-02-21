# ShiftSync — Technical Blueprint
> Multi-Location Staff Scheduling Platform for Coastal Eats

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16+ (App Router, Full Stack) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| Icons | Lucide React |
| Animations | Framer Motion |
| Forms & Validation | React Hook Form + Zod v4 |
| ORM | Prisma + Prisma adapter pg |
| Database | PostgreSQL |
| Auth | NextAuth.js v5 |
| State Management | Zustand (client state) |
| Server State / Fetching | TanStack React Query |
| Notifications (UI) | Sonner (toast notifications) |

---

## Project Structure

```
shiftsync/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── admin/
│   │   │   ├── page.tsx                  # Admin overview
│   │   │   ├── users/page.tsx
│   │   │   ├── locations/page.tsx
│   │   │   └── audit/page.tsx
│   │   ├── manager/
│   │   │   ├── page.tsx                  # Manager dashboard
│   │   │   ├── schedule/page.tsx
│   │   │   ├── shifts/page.tsx
│   │   │   ├── staff/page.tsx
│   │   │   ├── overtime/page.tsx
│   │   │   ├── fairness/page.tsx
│   │   │   └── swaps/page.tsx
│   │   ├── staff/
│   │   │   ├── page.tsx                  # Staff dashboard
│   │   │   ├── schedule/page.tsx
│   │   │   ├── availability/page.tsx
│   │   │   └── swaps/page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── users/route.ts
│   │   ├── locations/route.ts
│   │   ├── shifts/
│   │   │   ├── route.ts
│   │   │   ├── [id]/route.ts
│   │   │   └── [id]/assign/route.ts
│   │   ├── swaps/route.ts
│   │   ├── availability/route.ts
│   │   ├── notifications/route.ts
│   │   ├── audit/route.ts
│   │   ├── analytics/route.ts
│   │   └── realtime/route.ts             # SSE endpoint
│   ├── page.tsx                          # Landing page
│   └── layout.tsx
├── components/
│   ├── ui/                               # shadcn/ui components
│   ├── schedule/
│   │   ├── WeekCalendar.tsx
│   │   ├── ShiftCard.tsx
│   │   ├── AssignStaffModal.tsx
│   │   ├── WhatIfPanel.tsx
│   │   └── OvernightShiftBadge.tsx
│   ├── swaps/
│   │   ├── SwapRequestCard.tsx
│   │   ├── DropRequestCard.tsx
│   │   └── CoverageModal.tsx
│   ├── notifications/
│   │   ├── NotificationCenter.tsx
│   │   └── NotificationBell.tsx
│   ├── analytics/
│   │   ├── FairnessReport.tsx
│   │   ├── OvertimeDashboard.tsx
│   │   └── HoursDistributionChart.tsx
│   ├── onduty/
│   │   └── OnDutyDashboard.tsx
│   └── layout/
│       ├── Sidebar.tsx
│       ├── Header.tsx
│       └── RoleGuard.tsx
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   ├── timezone.ts
│   ├── scheduling/
│   │   ├── constraints.ts               # All constraint checks
│   │   ├── suggestions.ts               # Alternative suggestions logic
│   │   ├── overtime.ts                  # Overtime calculation
│   │   └── fairness.ts                  # Fairness score logic
│   ├── realtime/
│   │   └── sse.ts                       # Server-Sent Events manager
│   └── audit.ts
├── hooks/
│   ├── useRealtime.ts
│   ├── useNotifications.ts
│   ├── useSchedule.ts
│   └── useOvertimeCheck.ts
├── store/
│   ├── scheduleStore.ts
│   ├── notificationStore.ts
│   └── uiStore.ts
├── types/
│   └── index.ts
└── prisma/
    ├── schema.prisma
    └── seed.ts
```

---

## Phase 1: Database Schema (Prisma)

### Models

**User**
- id, name, email, hashedPassword, role (ADMIN | MANAGER | STAFF)
- desiredHoursPerWeek (nullable)
- notificationPreference (IN_APP | IN_APP_EMAIL)
- createdAt, updatedAt

**Location**
- id, name, address, timezone (IANA string e.g. `America/Los_Angeles`)
- createdAt, updatedAt

**LocationAssignment** (Manager ↔ Location)
- managerId, locationId, assignedAt

**LocationCertification** (Staff ↔ Location)
- id, userId, locationId, certifiedAt
- revokedAt (nullable) — soft delete

**Skill**
- id, name (unique)

**UserSkill**
- userId, skillId

**Availability** (recurring weekly)
- id, userId, dayOfWeek (0–6), startTime (HH:mm), endTime (HH:mm)
- timezone (stored at time of creation — user's reference tz)

**AvailabilityException** (one-off)
- id, userId, date (YYYY-MM-DD), isUnavailable (bool)
- startTime (nullable), endTime (nullable)

**Shift**
- id, locationId, date (YYYY-MM-DD), startTimeUtc (DateTime), endTimeUtc (DateTime)
- requiredSkillId, headcount, isPublished, publishedAt
- editCutoffHours (default 48), isPremium (auto-set: Fri/Sat evening)
- createdBy (userId), createdAt, updatedAt

**ShiftAssignment**
- id, shiftId, userId, status (ASSIGNED | CANCELLED | SWAPPED)
- assignedBy (managerId), assignedAt

**SwapRequest**
- id, type (SWAP | DROP), status (PENDING | STAFF_ACCEPTED | MANAGER_APPROVED | CANCELLED | EXPIRED)
- requesterId, shiftAssignmentId
- targetUserId (nullable — for SWAP type)
- targetShiftAssignmentId (nullable — for bilateral swap)
- managerNote (nullable), cancelledReason (nullable)
- expiresAt, createdAt, updatedAt

**OvertimeOverride**
- id, shiftAssignmentId, managerId, reason, createdAt

**Notification**
- id, userId, type (enum), title, message, isRead, meta (Json), createdAt

**AuditLog**
- id, actorId, action (string), entityType (string), entityId (string)
- before (Json nullable), after (Json nullable), createdAt

---

## Phase 2: Auth & Role System

### NextAuth v5 Setup
- Credentials provider with bcrypt password check
- JWT strategy — embed `role`, `id`, `locationIds` (for managers) in token
- Session extended with custom fields via `callbacks.jwt` and `callbacks.session`

### Middleware
- Protect `/admin/*` — ADMIN only
- Protect `/manager/*` — MANAGER and ADMIN
- Protect `/staff/*` — all authenticated users
- Redirect unauthenticated to `/login`

### Authorization Helpers (lib/auth.ts)
- `requireRole(session, role)` — throws 403 if insufficient
- `assertLocationAccess(session, locationId)` — managers can only access their locations
- `getManagerLocations(userId)` — returns array of locationIds

---

## Phase 3: User Management

### Admin Capabilities
- Create / edit / deactivate users with role
- Assign managers to locations (`LocationAssignment`)
- Certify staff at locations (`LocationCertification`)
- Assign skills to staff (`UserSkill`)
- Revoke certifications (soft delete with `revokedAt`)

### Staff Capabilities
- View own profile
- Set desired hours per week
- Manage recurring availability per day of week (with their local timezone stored)
- Add availability exceptions (specific dates: full unavailability or partial window)
- Set notification preferences

### Manager Capabilities
- View all staff certified at their locations
- See each staff member's skills, certifications, availability, and current week hours

---

## Phase 4: Shift Scheduling

### Creating Shifts
- Manager selects: location (scoped to theirs), date, start time, end time, required skill, headcount
- System auto-sets `isPremium = true` if shift is on Friday or Saturday and starts between 17:00–23:59 location local time
- Times stored as UTC in DB
- Overnight shifts: `endTimeUtc` may be next day — this is valid and expected

### Publishing
- Manager publishes a full week at once (sets `isPublished = true` on all shifts in the week for that location)
- Staff can only see published shifts
- Unpublish allowed if current time is more than `editCutoffHours` before the earliest shift in that week

### Editing Published Shifts
- Blocked if within cutoff window (hard block with clear message)
- If within cutoff, manager must provide override reason (audit logged)
- On any shift edit: auto-cancel all PENDING or STAFF_ACCEPTED SwapRequests for that shift, notify all parties

### Constraint Engine (lib/scheduling/constraints.ts)

Run these checks in order on every assignment attempt:

1. **Skill check** — Does the staff member have the required skill?
2. **Certification check** — Is the staff member certified at this location (and not revoked)?
3. **Availability check** — Does the shift fall within their recurring availability for that day? (Convert shift times to staff's reference timezone for comparison). Check exceptions too.
4. **Double-booking check** — Does this person have any overlapping ShiftAssignment (across all locations)?
5. **Rest period check** — Is there at least 10 hours between the end of their previous shift and start of this one, and between end of this shift and start of their next?
6. **Daily hours check** — Would this shift push them over 8 hours for the day (warn) or 12 hours (hard block)?
7. **Weekly hours check** — Would this push them to 35+ hours (warn) or 40+ hours (overtime warning)?
8. **Consecutive days check** — Are they on their 6th consecutive day (warn) or 7th (require override with reason)?

Each violation returns a structured object:
```
{ violated: true, rule: string, explanation: string, suggestions: Suggestion[] }
```

### Suggestions Engine (lib/scheduling/suggestions.ts)
When a constraint fails, query for staff who:
- Have the required skill
- Are certified at the location
- Are available during the shift
- Have no conflicts
- Are not approaching overtime

Return top 3–5 suggestions with their current week hours shown.

### Concurrent Assignment Protection
- Use PostgreSQL `SELECT FOR UPDATE` (via Prisma `$queryRaw`) when assigning a staff member
- If two managers assign the same person simultaneously, second transaction gets a DB-level conflict
- Return HTTP 409 with message: "This staff member was just assigned to a conflicting shift. Please refresh."
- Frontend uses optimistic locking: show conflict toast via Sonner immediately

---

## Phase 5: Shift Swapping & Coverage

### Swap Request Flow

**DROP request:**
1. Staff A submits drop request for their assignment → status: PENDING
2. System checks: staff A cannot have >3 pending requests total (error if exceeded)
3. System sets `expiresAt = shift.startTimeUtc - 24 hours`
4. Notifies manager: "Staff A has dropped shift X"
5. Any qualified staff can claim it → status: STAFF_ACCEPTED
6. Manager approves → original assignment cancelled, new assignment created → status: MANAGER_APPROVED
7. Notify all parties at each step

**SWAP request:**
1. Staff A requests swap with Staff B for their specific shifts
2. Constraint check: would the swap be valid for both parties?
3. Status: PENDING, notify Staff B
4. Staff B accepts → status: STAFF_ACCEPTED, notify manager
5. Manager approves → swap executed → status: MANAGER_APPROVED
6. Notify all parties

**Cancellation:**
- Staff A can cancel a PENDING swap before Staff B accepts
- If manager edits the shift while swap is PENDING or STAFF_ACCEPTED → auto-cancel, notify all parties
- Reason stored in `cancelledReason`

**Expiry (Vercel Cron):**
- Cron job runs hourly: find DROP requests where `expiresAt < now` and status is still PENDING → set EXPIRED, notify requester

---

## Phase 6: Overtime & Labor Law

### Overtime Calculation (lib/scheduling/overtime.ts)
- Calculate weekly hours: sum of (endTimeUtc - startTimeUtc) for all ASSIGNED shifts in the ISO week
- Calculate daily hours: sum per calendar day (in location's timezone)
- Track consecutive days: find longest streak of days with at least one shift (regardless of shift duration — a 1-hour shift counts as a worked day, documented decision)

### Warning Levels
| Trigger | Type | Behavior |
|---|---|---|
| Weekly hours ≥ 35 | Warning | Yellow highlight, toast warning |
| Weekly hours ≥ 40 | Warning | Orange highlight, overtime cost shown |
| Daily hours > 8 | Warning | Yellow badge on shift |
| Daily hours > 12 | Hard Block | Cannot assign without override |
| 6th consecutive day | Warning | Manager alerted |
| 7th consecutive day | Hard Block | Requires manager override + documented reason stored in OvertimeOverride |

### What-If Panel
- On hover/focus of "Assign Staff" button, show a preview panel:
  - Staff member's current week hours
  - Hours after this assignment
  - Any warnings that would be triggered
  - Projected overtime cost delta (cost = hours_over_40 × hourly_rate × 1.5)

### Overtime Dashboard
- Per-location weekly view: each staff member row showing projected hours, overtime flag, cost
- Color-coded: green (<35h), yellow (35–40h), orange (40+h)

---

## Phase 7: Fairness Analytics

### Data Tracked
- Hours per staff member per week/month/custom period
- Premium shift count per staff member (isPremium = true assignments)
- Desired hours vs. scheduled hours gap

### Fairness Score
- For each staff member: `premiumShiftCount / totalPremiumShiftsInPeriod × 100`
- Show as a bar chart ranked lowest to highest
- Flag anyone below 50% of the average as "under-represented in premium shifts"

### Reports UI
- Date range picker
- Location filter (admin sees all, manager sees theirs)
- Table: staff name | total hours | premium shifts | desired hours | scheduled hours | gap
- Export: CSV download (no third-party lib needed — build manually)

---

## Phase 8: Real-Time Features

### Strategy: Server-Sent Events (SSE)
- Single SSE endpoint: `GET /api/realtime`
- Client connects on dashboard load, reconnects on disconnect
- Server sends typed events:

| Event Type | Payload |
|---|---|
| `schedule:published` | locationId, weekStart |
| `schedule:updated` | shiftId, locationId |
| `swap:new` | swapRequestId |
| `swap:updated` | swapRequestId, status |
| `assignment:conflict` | userId, shiftId, conflictingManagerId |
| `onduty:update` | locationId, currentStaff[] |

### SSE Manager (lib/realtime/sse.ts)
- In-memory map of `userId → Response` (works for single instance; note: not horizontally scalable without Redis — document as known limitation)
- `broadcast(userIds[], event)` function called from API routes after mutations

### On-Duty Dashboard
- Shows currently active shifts (startTimeUtc ≤ now ≤ endTimeUtc) grouped by location
- Refreshes via SSE `onduty:update` events
- Fallback: polling every 60 seconds if SSE disconnects

### Concurrent Assignment Conflict
- When Manager A assigns staff X, immediately broadcast `assignment:conflict` to all managers who have the same staff member's assignment form open
- Frontend: if user is on assign modal and receives this event for the same userId → show Sonner toast + disable assign button + prompt refresh

---

## Phase 9: Notifications

### Notification Types (enum)
- SHIFT_ASSIGNED, SHIFT_CHANGED, SHIFT_CANCELLED
- SCHEDULE_PUBLISHED, SCHEDULE_UNPUBLISHED
- SWAP_REQUESTED, SWAP_ACCEPTED, SWAP_APPROVED, SWAP_CANCELLED, SWAP_EXPIRED
- DROP_AVAILABLE, DROP_CLAIMED
- OVERTIME_WARNING
- AVAILABILITY_CHANGED

### Delivery
- Always: create `Notification` record in DB
- If user preference is IN_APP_EMAIL: also send via Resend + React Email template
- Sonner toast shown in real-time via SSE for in-app users

### Notification Center UI
- Bell icon in header with unread count badge
- Dropdown panel: list of notifications, newest first
- Click marks as read, links to relevant entity
- "Mark all as read" button
- Persisted — survives page refresh

---

## Phase 10: Calendar & Time Handling

### Storage Rule
- ALL times stored as UTC `DateTime` in PostgreSQL
- Location timezone stored as IANA string (e.g. `America/New_York`)
- Staff availability stored with day of week + HH:mm (local reference) + their reference timezone at time of creation

### Display Rule
- Always convert shift times to the **location's timezone** for display
- Use `Intl.DateTimeFormat` with the location's IANA timezone

### Availability Matching (lib/timezone.ts)
- When checking if a shift falls within staff availability:
  1. Convert shift startTimeUtc to the **staff's availability reference timezone**
  2. Get day of week and time in that timezone
  3. Compare against their recurring availability for that day
- DST transitions: because we store HH:mm as "wall clock intent," the system respects the human's intended local time even when UTC offset changes

### Overnight Shifts
- `endTimeUtc > startTimeUtc` — always true even for overnight (e.g. 23:00 → 03:00 next day)
- Duration = `endTimeUtc - startTimeUtc` — straightforward
- Display: show "Overnight" badge when shift crosses midnight in location timezone
- Constraint checks use the actual UTC datetimes — no special cases needed

---

## Phase 11: Audit Trail

### What Gets Logged
Every mutation to: Shift, ShiftAssignment, SwapRequest, LocationCertification, User, Availability

### AuditLog Record
- `actorId` — who performed the action
- `action` — CREATE, UPDATE, DELETE, PUBLISH, UNPUBLISH, ASSIGN, UNASSIGN, APPROVE, CANCEL
- `entityType` — "Shift", "ShiftAssignment", etc.
- `entityId` — the record's ID
- `before` — JSON snapshot before change (null for creates)
- `after` — JSON snapshot after change (null for deletes)
- `createdAt`

### Viewing & Exporting
- Managers: view audit log for any shift they manage
- Admins: full audit log with filters (date range, location, entity type, actor)
- Export: generate CSV on server, stream as download

---

## Phase 12: Seed Data

Seed must cover:

**Locations (4):**
- Coastal Eats Downtown — `America/New_York`
- Coastal Eats Midtown — `America/New_York`
- Coastal Eats West Side — `America/Los_Angeles`
- Coastal Eats Venice — `America/Los_Angeles`

**Users:**
- 1 Admin
- 2 Managers (each managing 2 locations, one per timezone)
- 12 Staff members with varied skills and certifications
  - At least 2 staff certified at locations in both timezones
  - At least 1 staff approaching overtime (34h already scheduled)
  - At least 1 staff with a pending swap request
  - At least 1 staff with Saturday night premium shifts heavily skewed

**Shifts:**
- Current week + next week pre-populated
- At least one overnight shift
- At least one shift that would cause a double-booking if naively assigned
- At least 3 premium (Fri/Sat evening) shifts
- At least one shift with a pending swap

---

## Phase 13: Deployment Setup

**Environment Variables:**
```
DATABASE_URL
NEXTAUTH_SECRET
NEXTAUTH_URL
RESEND_API_KEY
```

**Database:**
- PostgreSQL (connection pooling compatible with Prisma adapter pg)

---

## Phase 14: Error Handling & UX Standards

- Every form submission: show Sonner success toast on success, error toast on failure with the error message
- Every server action or API call wrapped in try/catch — never expose raw errors to client
- Loading states on all async operations (use TanStack Query `isLoading`)
- Empty states for all list views ("No shifts scheduled yet", etc.)
- Constraint violations: show inline under the relevant field AND as a toast
- Suggestions shown in a callout box below the error: "Try assigning: John D. (28h this week), Maria S. (31h this week)"

---

## ⚠️  Build Error Prevention Guide

This section is critical. Follow every rule below to prevent build failures and TypeScript errors.

### 1. TypeScript Strict Mode
- `tsconfig.json` must have `"strict": true`
- Never use `any` — use `unknown` and narrow it, or define proper interfaces
- All component props must have explicit TypeScript interfaces or type aliases
- All event handlers must be typed: `(e: React.ChangeEvent<HTMLInputElement>) => void`
- All async functions must have explicit return types: `Promise<void>`, `Promise<User>`, etc.
- All API route handlers must return `NextResponse` with typed response bodies

### 2. Server vs Client Components
- Default to Server Components — only add `"use client"` when the component uses hooks or browser APIs
- NEVER import `useState`, `useEffect`, `useRef`, or any React hook inside a Server Component
- NEVER import server-only modules (Prisma, NextAuth server helpers) inside Client Components
- Pass data from Server → Client via props, not by importing server modules in client files
- If a component needs both server data and client interactivity, split it: Server Component fetches data, passes to a `"use client"` child

### 3. App Router Conventions
- All pages are in `app/` directory using App Router — never mix with `pages/` directory
- Dynamic routes: `app/shifts/[id]/page.tsx` — params typed as `{ params: { id: string } }`
- Never use `getServerSideProps` or `getStaticProps` — these are Pages Router only
- Use `generateMetadata` for page metadata
- Loading states: create `loading.tsx` alongside `page.tsx`
- Error boundaries: create `error.tsx` alongside `page.tsx`

### 4. Next.js API Routes (App Router)
- All API routes use the Route Handler pattern: `export async function GET(request: Request) {}`
- Never use the old `export default function handler(req, res)` pattern
- Always return `NextResponse.json()` — never `res.json()`

### 5. Import Discipline
- Before importing any component, verify the file exists at that path
- shadcn/ui components must be installed via `npx shadcn@latest add [component]` before importing
- Never import from `@/components/ui/X` unless that file has been explicitly created
- All Lucide icons must be verified in the Lucide React docs before use — icon names change between versions
- Zustand: import `create` from `zustand`, not a default export
- TanStack Query: import from `@tanstack/react-query` — verify exact export names

### 6. Prisma Usage
- Always import Prisma client from a singleton: `import { prisma } from '@/lib/prisma'`
- The singleton pattern prevents "too many connections" in dev:
  ```ts
  // lib/prisma.ts
  import { PrismaClient } from '@prisma/client'
  const globalForPrisma = global as unknown as { prisma: PrismaClient }
  export const prisma = globalForPrisma.prisma ?? new PrismaClient()
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
  ```
- Never instantiate `new PrismaClient()` inside a component or API route directly
- Run `npx prisma generate` before building — CI/CD must include this step

### 7. NextAuth v5 Specifics
- Config exported from `lib/auth.ts` as `export const { handlers, auth, signIn, signOut } = NextAuth({...})`
- Route handler at `app/api/auth/[...nextauth]/route.ts` exports: `export const { GET, POST } = handlers`
- Session access in server components: `import { auth } from '@/lib/auth'; const session = await auth()`
- Session access in client components: `import { useSession } from 'next-auth/react'`
- Never call `auth()` inside a Client Component

### 8. React Hook Form + Zod v4
- Schema definition: `import { z } from 'zod'` — Zod v4 has API changes from v3, verify method names
- Resolver: `import { zodResolver } from '@hookform/resolvers/zod'`
- Form fields must use `register` or `Controller` — never access form values without registering them
- Always call `handleSubmit` in the form's `onSubmit` — never call the submit handler directly

### 9. next/image
- Always provide `width` and `height` props, OR use `fill` prop with a relative-positioned parent
- `alt` prop is required — never omit it
- Remote images: add the domain to `next.config.ts` under `images.remotePatterns`

### 10. next/link
- Always use `<Link href="...">` from `next/link` for internal navigation — never use `<a>` tags for internal routes
- The `href` prop must be a string or object — never undefined

### 11. Framer Motion
- Import: `import { motion } from 'framer-motion'`
- `motion` components must be used in Client Components only — add `"use client"` to any file using Framer Motion
- Never use `motion` in Server Components

### 12. Zustand Store Patterns
- Define stores with explicit TypeScript interfaces for state and actions
- Use `create<StoreType>()(...)` — note the double invocation pattern
- Slice pattern for large stores — one store per domain (scheduleStore, notificationStore, uiStore)

### 13. TanStack React Query
- Wrap the app in `QueryClientProvider` in a Client Component provider
- Never call `useQuery` or `useMutation` in Server Components
- Always provide `queryKey` as an array: `['shifts', locationId, weekStart]`
- Use `invalidateQueries` after mutations to keep data fresh

### 14. Sonner Toast Notifications
- Add `<Toaster />` to root layout (Client Component wrapper)
- Import: `import { toast } from 'sonner'`
- Must be called only in Client Components or event handlers
- Standard pattern for all user actions:
  - Success: `toast.success('Shift assigned successfully')`
  - Error: `toast.error('Failed to assign shift: ' + error.message)`
  - Warning: `toast.warning('This staff member will exceed 35 hours this week')`

### 15. Environment Variables
- Server-side only vars: no `NEXT_PUBLIC_` prefix — never expose to client
- Client-safe vars: must have `NEXT_PUBLIC_` prefix
- Always check for undefined: `const url = process.env.DATABASE_URL!` (use `!` only after confirming it's always set)
- Access in server components/routes only — never in Client Components

### 16. Build Checklist Before Deployment
1. Run `npx prisma generate`
2. Run `npx tsc --noEmit` — fix ALL TypeScript errors before deploying
3. Run `next build` locally and fix any build errors
4. Verify all `"use client"` directives are present where needed
5. Verify no Server Component imports hooks
6. Verify all shadcn/ui components are installed
7. Verify all environment variables are set in hosting platform
8. Run `npx prisma migrate deploy` (not `dev`) in production
9. Check all dynamic route params are correctly typed
10. Verify SSE endpoint handles client disconnection gracefully

---

## Evaluation Scenario Handlers

**Sunday Night Chaos** — Staff calls out 1hr before shift:
1. Manager opens shift → sees assignment
2. Clicks "Find Coverage" → system runs suggestions engine instantly
3. Top qualified + available staff shown with current hours
4. Manager assigns with one click → staff notified via SSE + Sonner toast

**Overtime Trap** — Manager building a 52h schedule:
- What-If Panel shows hours incrementally as shifts are added
- At 35h: yellow warning shown
- At 40h+: orange warning + projected overtime cost shown
- Each specific shift card that contributes to overtime is highlighted

**Timezone Tangle** — Staff available "9am-5pm" at both PT and ET locations:
- Availability stored with staff's home timezone
- When assigning to ET location: 9am ET check runs — converts to staff's reference tz
- The system correctly evaluates: if staff is in PT and shift is 9am ET (= 6am PT), they are NOT available
- See `explanations.md` for full decision

**Simultaneous Assignment** — Two managers assign same bartender:
- DB-level row lock on staff member's assignment record
- First transaction wins; second gets 409 conflict response
- Second manager sees Sonner error: "Conflict: [Name] was just assigned by another manager. Please refresh."
- SSE broadcasts conflict event to all managers with that staff member open

**Fairness Complaint** — Employee claims no Saturday nights:
- Manager opens Fairness Report → filter by staff member → date range: last 90 days
- Premium shift column shows exact count and which dates
- Compare against team average — fairness score shown

**Regret Swap** — Staff A wants to cancel pending swap:
- Before Staff B accepts: Staff A can cancel directly → status CANCELLED, Staff B notified
- After Staff B accepts but before manager approval: Staff A must contact manager who can reject the swap request
- System documents: once STAFF_ACCEPTED, requester cannot self-cancel (protects Staff B)