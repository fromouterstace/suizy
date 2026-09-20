# Suizy First Secure Vertical Slice

**Roadmap step:** 0.3 — Freeze the first vertical slice  
**Approved scope:** Google Chat command → Google Calendar resolution → persisted meeting request → honest Google Chat acknowledgment  
**Specification date:** 2026-09-20  
**Status:** Approved for implementation after prerequisite roadmap gates pass

## 1. Purpose

The first vertical slice proves that Suizy can safely receive a supported Google Chat command, identify the relevant Calendar event and Meet conference when evidence permits, persist one canonical request, and return an accurate acknowledgment.

This slice does **not** make Suizy join, record, transcribe, or process a live meeting. It establishes the trusted request and correlation foundation on which later Fathom and Google Meet work can build.

## 2. User Story

As the approved Suizy owner, I can mention Suizy in an approved Google Chat context with:

```text
@Suizy join
```

Suizy verifies the Chat event, determines whether one relevant Calendar event can be resolved, persists the request and evidence, and responds with one of four bounded outcomes:

1. request accepted and event resolved;
2. request accepted but user selection is required;
3. request accepted but no relevant event was found;
4. request rejected or safely failed.

At no point does request acceptance mean that Suizy or Fathom joined the meeting.

## 3. Supported Command

### Canonical command

```text
@Suizy join
```

### Accepted normalization

After Google Chat mention metadata is removed, Suizy may accept:

- leading or trailing whitespace;
- case-insensitive `join`;
- whitespace-only separation between mention and command.

These examples normalize to the canonical command:

```text
@Suizy join
@Suizy JOIN
@Suizy     join
```

### Unsupported commands

All other commands are unsupported in this slice, including:

```text
@Suizy record
@Suizy transcribe
@Suizy summarize
@Suizy join <url>
@Suizy join <meeting code>
@Suizy email everyone
```

An unsupported command must not query Calendar, create a meeting request, call a provider, or perform an external write beyond the bounded synchronous help response to the originating verified Chat interaction.

### Command safety rules

- Maximum normalized command length must be explicitly bounded before parsing.
- Unknown arguments are rejected rather than ignored.
- A user-provided URL or meeting code is never fetched or accepted in this slice.
- Chat message text is not logged.
- The command cannot supply owner identity, space authorization, Calendar owner, or state.

## 4. Actors and Ownership

### Approved owner

Suizy v0 has exactly one approved human owner.

The owner is identified by an immutable Google Workspace identity obtained from the verified Google Chat event. Display name and email address are attributes, not primary authorization keys.

Before implementation, configuration must define:

- the approved Google Workspace user identity;
- approved direct-message or Chat-space identifiers;
- the Calendar connector identity;
- the environment in which those identities are valid.

### Authorization boundary

A verified Google request is necessary but not sufficient.

Suizy must also confirm:

1. the invoking Google identity is the configured owner;
2. the Chat space or direct-message context is allowed;
3. the event belongs to the configured environment;
4. the command is supported;
5. the request has not already been processed.

No client-supplied owner ID or Calendar identity is authoritative.

### Calendar ownership

The Calendar connector must be bound to the approved owner or to an explicitly approved Calendar identity.

Calendar events from another owner, delegated account, or shared calendar must not be selected unless that calendar has been explicitly added to the authorization policy in a later approved step.

## 5. External Boundaries

The slice crosses these trust boundaries:

```text
Google Chat
    │ verified interaction event
    ▼
Chat authentication and authorization
    │ normalized command
    ▼
Meeting request service
    │ bounded owner-scoped query
    ▼
Replit Google Calendar connector
    │ minimized candidate records
    ▼
Calendar resolver
    │ selected / ambiguous / none
    ▼
PostgreSQL transaction
    │ persisted request + audit event
    ▼
Safe synchronous Chat acknowledgment
```

Fathom, Google Meet REST, and Google Meet Media are outside this slice.

## 6. Canonical Request States

The persisted request uses backend snake_script values.

### Initial states

| State | Meaning |
|---|---|
| `requested` | A verified and authorized command has been accepted and persisted. |
| `calendar_resolved` | Exactly one approved Calendar event and Meet reference were deterministically selected. |
| `calendar_ambiguous` | Multiple plausible approved events require owner selection. |
| `calendar_not_found` | No approved relevant event with sufficient evidence was found. |
| `rejected` | Authentication, authorization, command validation, or policy rejected the request. |
| `failed` | An internal or connector error prevented safe completion. |

### Explicitly absent states

These states must not exist or be implied in this slice:

- `joined`;
- `recording`;
- `transcribing`;
- `fathom_joined`;
- `meet_connected`;
- `artifacts_pending`;
- `completed`.

### Allowed transitions

```text
verified event
    └── requested
          ├── calendar_resolved
          ├── calendar_ambiguous
          ├── calendar_not_found
          └── failed

invalid or unauthorized event
    └── rejected
```

Rules:

- `rejected` may be recorded as a security/audit event without creating a canonical meeting request containing message content.
- Terminal state updates and their domain events must commit transactionally.
- Replaying the same Chat event returns the original safe outcome and does not create another request.
- A state transition cannot imply provider participation, consent, recording, transcription, or completion.

## 7. Idempotency

### Idempotency key

The primary idempotency key is:

```text
environment + provider("google_chat") + verified_chat_event_id
```

If Google does not supply a stable unique event ID in the selected interaction payload, implementation must stop and update this specification with a documented deterministic alternative before proceeding.

### Idempotency requirements

- Enforce the key with a database unique constraint.
- Check authorization before returning any previously persisted outcome.
- Concurrent duplicate deliveries must result in one request and one terminal-resolution event.
- A duplicate must not repeat Calendar writes, Chat sends, provider calls, or audit effects.
- The originating synchronous Chat response may be reconstructed from canonical safe fields.
- Hashing message text is not an acceptable substitute for a provider event ID because identical valid commands can occur more than once.

## 8. Calendar Query Contract

### Query purpose

Calendar is queried only to identify an event plausibly active or imminent when the verified command was received.

### Required bounds

Implementation must define and test:

- a narrow time window around the verified event timestamp;
- maximum events requested;
- pagination limit;
- connector timeout;
- retry limit;
- fields requested or retained.

The exact time window must be chosen in the Calendar implementation step and recorded as configuration or a named domain constant. It must not be silently widened to search the user's history.

### Candidate fields

The resolver may use only the minimum required fields:

- Calendar event ID;
- start and end timestamps;
- event status;
- organizer identity;
- approved calendar identity;
- attendee identity only if needed for owner correlation;
- structured conference solution/type;
- structured Meet URI or conference identifier;
- recurrence instance identity when applicable.

The following must not be retained merely for resolution:

- full event description;
- attachments;
- unrelated attendee metadata;
- private extended properties;
- arbitrary links;
- conference entry points unrelated to the selected Meet reference.

### Meet reference extraction

- Use structured Calendar conference fields first.
- Do not fetch a URL found in an event.
- Do not treat arbitrary description text as a trusted Meet link.
- Store the normalized provider reference and a safe provider-specific identifier.
- Do not include the Meet URL in logs or ordinary Chat acknowledgments.

## 9. Resolution Policy

### Deterministic evidence order

The resolver considers:

1. approved Calendar identity;
2. event time overlap with the verified Chat event timestamp;
3. active/non-cancelled event status;
4. structured Google Meet conference reference;
5. owner organizer/attendee relationship when needed;
6. temporal proximity.

Exact structured identifiers outrank heuristic evidence.

### Success

Resolution succeeds only when one candidate clearly satisfies the policy and no similarly ranked candidate creates ambiguity.

Required result:

- one canonical meeting;
- one canonical meeting request;
- one Calendar provider reference;
- zero or one normalized Meet provider reference;
- persisted resolution evidence and confidence category;
- `calendar_resolved` state;
- one append-only resolution event.

### Ambiguity

Resolution is ambiguous when two or more approved candidates are similarly plausible under the deterministic policy.

Required result:

- one canonical meeting request;
- `calendar_ambiguous` state;
- a bounded candidate set;
- no event attached as the selected meeting;
- no Meet/Fathom/live action;
- a safe owner choice requested in the originating Chat context.

Candidate presentation must minimize data. Use a short title only when authorized and necessary, plus bounded local start time. Do not include attendee lists, descriptions, or Meet URLs.

Candidate selection is a future atomic interaction within the first milestone, but the initial `join` event must not auto-select a low-confidence candidate.

### No event found

Required result:

- one canonical meeting request;
- `calendar_not_found` state;
- no fabricated event or meeting reference;
- no widened historical search;
- no provider participation claim.

### Failure

Failures include connector timeout, unavailable database, malformed provider response, or internal invariant failure.

Required result:

- safe `failed` outcome when persistence permits;
- correlation ID;
- categorized internal error;
- no stack trace, provider body, credential, event content, or Calendar data in the response;
- no blind retry of a non-idempotent action.

## 10. Safe Chat Responses

Responses use frontend/API camelScript only at their explicit wire/UI boundary. Backend domain fields remain snake_script. Boundary mappers own conversion.

### Allowed response fields

A synchronous acknowledgment may contain:

- stable public request reference;
- bounded status code;
- short human-readable status;
- selected event start time when authorized and useful;
- minimized event title when authorized and useful;
- bounded candidate choices for ambiguity;
- correlation/reference code for support.

It must not contain:

- access tokens or credentials;
- Calendar connector identifiers;
- database IDs intended to remain internal;
- full participant or attendee lists;
- event descriptions;
- transcript, summary, or recording content;
- Meet URLs or meeting codes;
- signed artifact URLs;
- raw provider errors;
- claims of joining, recording, consent, or transcription.

### Required response language

#### Resolved

```text
I found the matching Calendar event and recorded your request. I have not joined or started recording the meeting.
```

#### Ambiguous

```text
I found more than one possible Calendar event. Choose one before I continue. I have not joined or started recording any meeting.
```

#### Not found

```text
I recorded your request but could not identify a matching Calendar event. I have not joined or started recording a meeting.
```

#### Unsupported command

```text
For now, the supported command is “@Suizy join”. This records and resolves a request; it does not make Suizy join or record a meeting.
```

#### Unauthorized

Return a minimal denial that does not reveal the configured owner, allowed spaces, Calendar identity, or whether a candidate meeting exists.

#### Internal failure

```text
I could not safely process that request. No meeting was joined or recorded. Reference: <correlation reference>
```

## 11. Persistence Contract

### Minimum meeting request fields

- canonical request ID;
- owner ID;
- source provider `google_chat`;
- verified Chat event ID;
- allowed Chat space/thread reference;
- normalized command enum;
- request state;
- environment;
- correlation ID;
- received timestamp;
- created and updated timestamps.

### Conditional resolution fields

- canonical meeting ID;
- Calendar provider reference;
- normalized Meet provider reference if structurally available;
- confidence category;
- resolver version;
- resolution timestamp.

### Prohibited persistence

- Chat bearer token;
- service-account private key;
- connector token;
- raw Chat payload;
- raw Calendar payload;
- full Chat message;
- full Calendar event description;
- signed URL;
- Fathom credential or payload;
- transcript or recording data.

## 12. Audit Events

### Required audit/domain events

| Event | When emitted | Minimum safe fields |
|---|---|---|
| `chat.command.received` | Verified and authorized command accepted | owner ID, source event reference, space reference, command enum, correlation ID, timestamp |
| `meeting.requested` | Canonical request created | request ID, owner ID, source, correlation ID, timestamp |
| `calendar.event.resolved` | One candidate selected | request ID, meeting ID, provider-reference ID, confidence category, resolver version, timestamp |
| `calendar.event.ambiguous` | Selection required | request ID, candidate count, resolver version, timestamp |
| `calendar.event.not_found` | No candidate satisfies policy | request ID, resolver version, timestamp |
| `request.rejected` | Verified request fails authorization/policy | reason category, source type, correlation ID, timestamp |
| `request.failed` | Safe processing failure | request ID when available, safe error category, correlation ID, timestamp |
| `chat.acknowledgment.sent` | Synchronous acknowledgment prepared/sent | request ID when available, outcome enum, destination reference, timestamp |

### Audit exclusions

Audit events must not contain:

- message text;
- event descriptions;
- participant/attendee lists;
- Meet URLs;
- tokens or signatures;
- provider response bodies;
- stack traces;
- transcript or recording data.

Audit records are append-oriented and cannot be mutated by the frontend.

## 13. Security Controls

### Request authentication

- Verify the Google-issued bearer token according to the configured Chat authentication audience.
- Validate signature, issuer, audience, issued-at, and expiration as required by the official architecture.
- Reject an invalid token with `401` before command processing, Calendar access, or persistence.
- Never log the authorization header or token claims containing unnecessary identity data.

### Authorization

- Match the verified Google identity to the configured owner.
- Match the Chat space/context to the allowlist.
- Bind the Calendar connector identity to the approved owner/environment.
- Derive authority server-side; ignore owner IDs in untrusted payload fields.

### Input and resource limits

- HTTPS only.
- Enforce content type.
- Enforce strict body-size and command-length limits.
- Apply request rate limits before Calendar/provider work.
- Set connector and database timeouts.
- Bound Calendar time range, page size, candidate count, and retries.
- Return within Google Chat's synchronous response deadline.

### Data protection

- Use Replit Secrets or connector-managed storage for credentials.
- Do not retain raw Chat or Calendar payloads.
- Do not ingest or create transcript/recording content in this slice.
- Use synthetic fixtures in tests.
- Apply owner scoping to every persisted query.
- Escape any event title rendered to Chat or UI.
- Use allowlisted structured response fields.

### Logging

Allowed default fields:

- timestamp;
- operation;
- safe outcome;
- latency;
- correlation ID;
- provider category;
- safe error category.

Prohibited default fields:

- request body;
- Chat text;
- authorization header;
- Google identity attributes not required for the log;
- event title/description;
- attendees;
- Meet URL/code;
- provider payload;
- database connection details.

## 14. External Side-Effect Policy

### Authorized in this slice

Only these effects are authorized after request authentication and owner/space authorization:

1. bounded read from the approved Calendar connector;
2. creation/update of Suizy-owned canonical request, meeting, reference, idempotency, and audit records;
3. bounded synchronous response to the originating verified Chat interaction.

### Not authorized in this slice

- creating or modifying Calendar events;
- sending asynchronous Chat messages;
- sending email;
- creating Docs, Drive files, or Sheets rows;
- calling Fathom;
- registering a Fathom webhook;
- joining or ending a Meet;
- starting recording/transcription;
- accessing live media;
- downloading artifacts;
- inviting or messaging participants;
- deleting provider data.

Any new external effect requires a separate roadmap step, preview, authorization policy, idempotency, audit event, tests, and approval.

## 15. Explicit Out-of-Scope Behavior

The first slice does not:

- command a Fathom bot to join;
- assert that Fathom is scheduled to attend;
- join through Google Meet REST;
- connect through Google Meet Media;
- appear as a normal participant;
- obtain participant attendance;
- record audio or video;
- obtain a transcript;
- generate a summary;
- create action items;
- send follow-ups;
- write to Calendar, Gmail, Drive, Docs, or Sheets;
- support multiple Suizy users;
- search arbitrary historical meetings;
- accept user-provided meeting URLs.

## 16. Required Tests

All test filenames follow:

```text
module-testpurpuse-test.extension
```

Minimum test purposes:

- `chat-request-authentication-test.ts`
- `chat-owner-authorization-test.ts`
- `chat-space-authorization-test.ts`
- `chat-command-normalization-test.ts`
- `chat-command-rejection-test.ts`
- `meeting-request-idempotency-test.ts`
- `meeting-request-concurrency-test.ts`
- `meeting-request-state-transition-test.ts`
- `calendar-query-bounds-test.ts`
- `calendar-event-resolution-test.ts`
- `calendar-event-ambiguity-test.ts`
- `calendar-event-not-found-test.ts`
- `calendar-cross-owner-rejection-test.ts`
- `chat-safe-acknowledgment-test.ts`
- `logging-sensitive-data-redaction-test.ts`
- `audit-event-minimization-test.ts`

Security tests must include invalid token, wrong audience, expired token, wrong owner, disallowed space, oversized body, oversized command, replay, concurrent duplicate, connector timeout, malformed Calendar response, ambiguous event, malicious event title, and accidental sensitive-log detection.

## 17. Acceptance Scenarios

### Scenario A — Resolved

Given:

- a valid Google Chat request;
- the approved owner and Chat context;
- canonical `join`;
- one approved overlapping Calendar event with structured Meet conference data;

Then:

- one request is persisted;
- one meeting and Calendar reference are attached;
- state is `calendar_resolved`;
- minimized audit events are appended;
- the acknowledgment says the request was recorded;
- the acknowledgment says Suizy has not joined or recorded.

### Scenario B — Ambiguous

Given two similarly ranked approved events:

- one request is persisted;
- state is `calendar_ambiguous`;
- no event is silently selected;
- no Meet/provider action occurs;
- bounded choices are returned.

### Scenario C — Not found

Given no qualifying event:

- one request is persisted;
- state is `calendar_not_found`;
- query bounds are not silently widened;
- no provider action occurs;
- the acknowledgment is truthful.

### Scenario D — Replay

Given the same verified Chat event twice:

- one request exists;
- no duplicate meeting, reference, or audit effect is created;
- the original safe outcome is returned.

### Scenario E — Unauthorized

Given a valid Google request from a non-owner or disallowed space:

- no Calendar query occurs;
- no canonical meeting request is created;
- a minimal denial is returned;
- a minimized rejection audit event may be recorded;
- no owner/configuration detail is disclosed.

### Scenario F — Failure

Given a connector or database failure:

- no false success or join claim is returned;
- partial writes roll back where required;
- the response contains only a safe reference;
- logs contain no sensitive request/provider data.

## 18. Definition of Done

The first vertical slice is implemented only when:

1. the supported command and exclusions match this specification;
2. Google Chat request authentication is proven with positive and negative tests;
3. owner and Chat-context authorization are enforced server-side;
4. Calendar access is owner-bound, bounded, minimized, and read-only;
5. success, ambiguity, not-found, rejected, replay, concurrency, and failure paths pass;
6. request state, provider references, idempotency, and audit events are transactional;
7. Chat responses use only allowlisted fields and truthful language;
8. logs and fixtures contain no secrets or real meeting data;
9. no Fathom or live Meet behavior is called or implied;
10. the focused security checks pass;
11. implementation commits follow `github-hygiene.md`;
12. the implementation commit is pushed through the approved GitHub workflow.

## 19. Approval Record

Approval of this specification authorizes only the bounded slice described here. It does not authorize:

- connecting new providers;
- requesting additional OAuth scopes;
- accepting real confidential transcripts;
- sending asynchronous messages;
- writing to external Workspace services;
- live Meet access;
- deployment to production.

Any material change to commands, states, owner model, Calendar search bounds, response fields, external effects, or exclusions requires a new atomic documentation change and approval before implementation.

## 20. GitHub Delivery

Commit this specification as:

```text
docs(scope): freeze first secure vertical slice
```

Push it to the approved branch without credentials, real Chat/Calendar payloads, participant data, Meet links, transcripts, recordings, or private URLs.