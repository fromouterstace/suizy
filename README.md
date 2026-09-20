# 👻 Suizy

> **A meeting assistant built to turn conversations into useful, structured, actionable knowledge.**

Suizy is a personal meeting assistant built initially for **Google Workspace, Google Meet, and Fathom**.

The first goal is intentionally simple:

**Mention Suizy. Resolve the meeting. Capture what matters. Make it useful.**

```text
@Suizy join
      │
      ▼
Google Chat
      │
      ▼
Suizy Orchestration
      │
      ├── 📅 Google Calendar
      ├── 🎙️ Fathom
      ├── 🎥 Google Meet
      └── 🗄️ PostgreSQL
              │
              ▼
      Canonical Meeting Record
              │
      ┌───────┼────────┐
      ▼       ▼        ▼
 Transcript  Summary   Actions
```

---

## 🎯 Mission

Suizy should eliminate the friction between **having a conversation** and **doing something useful with it**.

For the first version, that means:

1. Receive an `@Suizy join` request in Google Chat.
2. Identify the relevant Google Calendar event and Google Meet conference.
3. Create and track a canonical meeting request.
4. Use supported provider workflows to obtain meeting information.
5. Ingest completed-meeting data from Fathom.
6. Normalize that information into Suizy-owned records.
7. Produce useful meeting artifacts such as transcripts, summaries, decisions, actions, and follow-ups.

Suizy is being built **for one user first**.

The priorities are:

**Useful → Simple → Reliable → Understandable → Replaceable → Extensible**

---

## 🧠 The Core Principle

### Suizy owns Suizy.

Google, Fathom, and future providers are integrations—not the application itself.

External data is normalized into Suizy's canonical domain:

```text
User
Integration
Meeting
MeetingRequest
Participant
Transcript
TranscriptSegment
Artifact
Summary
Decision
Action
Event
Job
```

Provider-specific identifiers and metadata may be associated with these objects, but external response objects never become Suizy's canonical model.

This keeps integrations replaceable and prevents the architecture from becoming dependent on any single provider.

---

## 🔌 Integration Model

Suizy v0 has three distinct integration lanes:

```text
                 Google Chat
                      │
                      ▼
            ┌──────────────────┐
            │      SUIZY       │
            │   Orchestration  │
            └────────┬─────────┘
                     │
       ┌─────────────┼─────────────┐
       ▼             ▼             ▼
 📅 Calendar      🎙️ Fathom    🎥 Google Meet
   Replit          Provider        APIs
 Connector         Adapter
       │             │             │
       └─────────────┼─────────────┘
                     ▼
                PostgreSQL
                     │
                     ▼
             Suizy Domain Model
```

### 📅 Replit + Google Workspace

Use Replit's native Google Workspace integrations for routine Workspace functionality wherever they satisfy the requirement.

**Google Calendar is required for v0.**

It provides the context Suizy needs to correlate:

`@Suizy join`

with:

`the meeting Stace actually means`

Additional Workspace integrations should be added only when a real feature requires them:

* ✉️ **Gmail** — follow-up drafts
* 📁 **Drive** — meeting artifacts
* 📝 **Docs** — editable meeting notes
* 📊 **Sheets** — structured exports

Don't integrate something merely because we can.

---

## 🎙️ Fathom

**Fathom is an explicit Suizy v0 integration.**

Fathom is initially Suizy's first `MeetingProvider` and can provide processed meeting information including:

* meetings and metadata
* participants/invitees
* speaker-attributed transcripts
* summaries
* action items and highlights
* recording artifacts
* webhook-driven meeting completion

The preferred ingestion model is:

```text
Fathom finishes processing
          ↓
    🔔 Signed webhook
          ↓
 Suizy verifies authenticity
          ↓
Resolve canonical meeting
          ↓
 Fetch missing artifacts
          ↓
 Normalize into Suizy
          ↓
Emit domain events
```

Fathom is extremely useful.

**Fathom is not Suizy.**

The integration remains behind a provider boundary so it can evolve or be replaced without rewriting Suizy.

---

## 💬 Google Chat

Google Chat is Suizy's initial conversational interface.

The defining interaction is:

> `@Suizy join`

Suizy should:

**understand → resolve → persist → act → respond**

A Chat command must never cause Suizy to claim that it joined, recorded, or processed a meeting unless the underlying provider actually performed that action.

Truthful state is a product feature.

---

## 🎥 Google Meet

Meet functionality is deliberately separated into two categories.

### Meet REST API

Useful for supported meeting and post-meeting information such as:

* Meet spaces
* conference records
* participants
* participant sessions
* recordings
* transcripts
* transcript entries

### Meet Media API

Live meeting access is a separate feasibility track.

Before Suizy claims live participation, we must verify:

* account and Workspace eligibility
* API availability
* required OAuth scopes
* administrator requirements
* participant/host consent
* participant-visible behavior
* media restrictions
* runtime requirements

**Suizy does not pretend to be a human browser client.**

Unsupported browser automation is explicitly out of scope.

---

## ⚙️ Technology

Suizy begins as a **modular monolith**.

| Layer                    | Technology        |
| ------------------------ | ----------------- |
| Language                 | TypeScript        |
| Runtime                  | Node.js           |
| API                      | Fastify           |
| Frontend                 | React + Vite      |
| Database                 | PostgreSQL        |
| ORM                      | Drizzle           |
| Validation               | Zod               |
| Workspace                | Replit Connectors |
| Meeting Intelligence     | Fathom            |
| Development / Deployment | Replit            |
| Source Control           | GitHub            |

### Things we are *not* necromancing yet 🪦

No:

* microservices
* Kubernetes
* Kafka
* custom WebRTC infrastructure
* custom speech-recognition models
* blockchain implementation
* billing
* enterprise multi-tenancy
* mobile applications

The architecture should leave doors open without building rooms nobody needs yet.

---

## ⚡ Events

Suizy uses lightweight PostgreSQL-backed domain events.

Initial examples:

```text
chat.command.received
calendar.event.resolved
meeting.requested
meeting.started
meeting.completed
transcript.received
transcript.processed
summary.created
action.created
followup.created
```

This gives Suizy asynchronous behavior and provenance without prematurely introducing distributed infrastructure.

---

## 🔐 Security & Privacy

Meetings can contain extremely sensitive information.

Security is therefore part of the architecture—not a cleanup project.

Suizy follows several baseline rules:

* 🔑 Secrets never enter source control.
* 🪪 External requests are authenticated.
* 🔏 Webhook signatures are verified.
* 👤 Data access is owner-scoped.
* ♻️ External events are processed idempotently.
* 🧹 Data has explicit retention and deletion behavior.
* 📝 Full transcripts are not casually logged.
* 🔗 Signed artifact URLs are treated like credentials.
* 🎥 Live media requires explicit supported consent mechanisms.
* 📦 Provider payloads are treated as untrusted input.

---

## 🚦 Current Milestone

### Milestone 01 — `@Suizy join`

The first milestone is deliberately narrow.

```text
@Suizy join
      ↓
authenticate Chat interaction
      ↓
resolve Calendar event
      ↓
identify Meet
      ↓
create canonical MeetingRequest
      ↓
persist state
      ↓
respond honestly in Chat
```

Success means Suizy can reliably understand and track the request.

It **does not** require pretending that Suizy has already entered the conference.

Fathom ingestion becomes the next vertical slice.

---

## 🗺️ Roadmap

The implementation proceeds in atomic, reviewable stages:

**Phase 0 — Verify**
Understand the repository, verify provider capabilities, and freeze the first vertical slice.

**Phase 1 — Initialize**
Establish the TypeScript application and GitHub workflow.

**Phase 2 — Application Boundary**
Fastify, health checks, errors, correlation IDs, and safe observability.

**Phase 3 — Identity & Persistence**
Authentication, privacy lifecycle, canonical records, events, and idempotency.

**Phase 4 — Core Domain**
Commands, meeting-request state machine, and provider contracts.

**Phase 5 — Google Calendar**
Connect and normalize Calendar context.

**Phase 6 — Google Chat**
Bring `@Suizy join` to life.

**Phase 7 — Fathom**
Ingest meetings, transcripts, summaries, actions, and artifacts.

**Phase 8 — Close the Loop**
Chat → Calendar → Fathom → Suizy → useful meeting record.

**Phase 9 — Meet Feasibility**
Determine exactly what supported live participation can become.

**Phase 10 — Workspace Actions**
Docs, Gmail, Drive, Sheets, and searchable meeting history.

---

## 🧭 Engineering Philosophy

### Build what is Suizy. Integrate what isn't.

We don't rebuild Google Calendar.

We don't rebuild Fathom merely to say we did.

We build the orchestration, canonical knowledge model, user experience, provider abstraction, and intelligence that make **Suizy** Suizy.

### Earn complexity.

Start with the smallest architecture that solves the current problem.

Add infrastructure when the product demonstrates the need—not because a future architecture diagram looks cooler with another box.

### Providers are replaceable. Data is ours.

External services perform capabilities.

Suizy maintains the canonical understanding of what happened.

### Tell the truth.

If a provider hasn't joined a meeting, Suizy hasn't joined it.

If correlation is ambiguous, ask.

If an API doesn't support something, say so.

No simulated capability.

---

## 👻 Why “Suizy”?

Because names should be allowed to have a little fun.

The architecture, however, should remain boring until boring stops working.

---

### Current Status

**🌱 Stage:** Initial architecture
**🎯 Target:** `@Suizy join`
**🏗️ Architecture:** Modular monolith
**📅 Workspace:** Google + Replit
**🎙️ Meeting Provider:** Fathom
**🗄️ State:** PostgreSQL
**👻 Banshees necromanced:** 0

*For now.*
