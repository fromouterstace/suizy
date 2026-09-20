# Suizy External Capability Matrix

**Roadmap step:** 0.2 — Verify external capabilities  
**Verified on:** 2026-09-20  
**Scope:** Fathom External API, Google Chat API, Google Meet REST API, Google Meet Media API, and Replit Google Workspace connectors  
**Rule:** Official documentation is authoritative. Search snippets, prior assumptions, product marketing, and observed UI behavior are not implementation contracts.

## Status Definitions

- **Supported** — Current official documentation explicitly describes the operation.
- **Conditional** — Supported only with named account, scope, permission, consent, enrollment, product, or runtime constraints.
- **Unsupported** — Current official documentation does not expose the required operation or explicitly describes a different boundary.
- **Unverified** — The reviewed official documentation does not establish enough detail to implement safely.
- **Deferred** — Supported or conditionally supported, but intentionally excluded from Suizy v0.

## Source Register

### Fathom

- [API overview](https://developers.fathom.ai/api-overview)
- [OpenAPI specification](https://developers.fathom.ai/api-reference/openapi.yaml)
- [Webhooks](https://developers.fathom.ai/webhooks.md)
- [OAuth application guidance](https://developers.fathom.ai/oauth.md)
- [SDK available methods](https://developers.fathom.ai/sdks/available-methods.md)

### Google Chat

- [Receive and respond to interaction events](https://developers.google.com/workspace/chat/receive-respond-interactions)
- [Verify requests from Google Chat](https://developers.google.com/workspace/chat/verify-requests-from-chat)
- [Authenticate and authorize Chat apps](https://developers.google.com/workspace/chat/authenticate-authorize)
- [Authenticate as a Chat app](https://developers.google.com/workspace/chat/authenticate-authorize-chat-app)

### Google Meet REST

- [Meet REST API overview](https://developers.google.com/workspace/meet/api/guides/overview)
- [Authenticate and authorize Meet REST requests](https://developers.google.com/workspace/meet/api/guides/authenticate-authorize)
- [Meet REST v2 reference](https://developers.google.com/workspace/meet/api/reference/rest/v2)
- [Work with artifacts](https://developers.google.com/workspace/meet/api/guides/artifacts)
- [Work with participants](https://developers.google.com/workspace/meet/api/guides/participants)
- [Create and manage meeting spaces](https://developers.google.com/workspace/meet/api/guides/meeting-spaces)

### Google Meet Media

- [Meet Media API overview](https://developers.google.com/workspace/meet/media-api/guides/overview)
- [Get started with Meet Media API](https://developers.google.com/workspace/meet/media-api/guides/get-started)
- [Meet Media API reference](https://developers.google.com/workspace/meet/media-api/reference/dc/media_api)

### Replit

- [Replit Integrations](https://docs.replit.com/features/integrations/overview)
- [Managing Replit connectors](https://docs.replit.com/replitai/managing-connectors)

## Operation Matrix

### Replit Google Workspace Connectors

| Planned operation | Status | Official evidence and limits | Minimum access / consent | Security and retention implications | Suizy owner | Next verification |
|---|---|---|---|---|---|---|
| Authorize Google Calendar without application-managed tokens | Supported | Replit connectors manage provider credentials and tokens outside individual app code. | User/workspace authorization through Replit; exact granted Google scopes depend on connector configuration. | Never copy connector tokens into environment variables, source, logs, or database rows. Use separate development and production connections. | Replit connector configuration + `CalendarGateway` | Connect the intended account and inspect the actual consent/scopes before the first data read. |
| Read Calendar events and settings | Supported | Replit's integrations catalog explicitly lists Google Calendar read/write access for events and settings. | Authorized Calendar connector. | Query a narrow time window and selected fields; do not retain event descriptions or attendees unless needed. | `CalendarGateway` | Perform one bounded read against a controlled event and record returned fields without committing payloads. |
| Read structured Meet conference data from Calendar events | Conditional | Calendar event reads are supported; whether the connector returns all required structured conference fields is not guaranteed by the overview documentation. | Authorized Calendar connector; event must contain conference data. | Prefer structured conference fields over parsing arbitrary descriptions. Treat URLs as untrusted and never fetch them automatically. | `CalendarGateway` | Inspect a controlled Meet event and verify conference ID/URI fields exposed by the connector. |
| Create or update Calendar events | Deferred | Replit documents Calendar read/write event access. | Connector write access and explicit approved feature. | Externally visible writes require preview, authorization, idempotency, and an audit event. | Future Calendar command service | Defer until a roadmap step explicitly needs Calendar writes; inspect exact connector write behavior then. |
| Send/receive/manage Gmail | Deferred | Replit lists Gmail send, receive, and management capability. | Gmail connector and granted scopes. | Email is externally visible; drafts must not auto-send. Validate recipients and headers and minimize meeting content. | Future `GmailGateway` | Connect only when the approved follow-up-draft feature begins. |
| Access/manage Drive files and folders | Deferred | Replit lists Drive file/folder access and management. | Drive connector and granted scopes. | Validate destinations and sharing; do not persist signed URLs or expose broad folder access. | Future `DriveGateway` | Connect only for an approved artifact-storage feature and verify actual scopes. |
| Create/read/edit Google Docs | Deferred | Replit lists Docs create/read/edit capability. | Docs connector and granted scopes. | Require approved destination and sharing policy; escape untrusted transcript content. | Future `DocsGateway` | Connect only for the approved meeting-notes export step. |
| Receive Google Chat mentions through a Replit Workspace connector | Unsupported | Replit's connector catalog does not document Google Chat app interaction-event hosting as a Google Workspace connector capability. | Separate Google Chat app configuration is required. | Do not infer Chat app authority from Calendar/Gmail/Drive/Docs authorization. | Google Chat adapter | Use the official Chat API HTTP interaction architecture. |
| Join or consume Google Meet media through a Replit Workspace connector | Unsupported | Replit's listed Workspace connector operations do not establish Meet bot or Meet Media functionality. | Separate Meet APIs, Cloud project, OAuth, eligibility, and consent are required. | Connector authorization must never be represented as meeting participation consent. | Meet adapters | Keep Meet REST and Media integrations separate. |

### Fathom External API

| Planned operation | Status | Official evidence and limits | Minimum access / consent | Security and retention implications | Suizy owner | Next verification |
|---|---|---|---|---|---|---|
| Authenticate a personal v0 integration with an API key | Supported | Fathom documents API-key authentication for REST resources. | Fathom API key generated by the account owner. | Store only in Replit Secrets; use separate keys per environment if Fathom permits; rotate on exposure. | `FathomProvider` configuration | Request the key through the secrets flow only when implementation reaches Phase 7. |
| Authenticate multiple Fathom users with OAuth | Conditional / Deferred | Fathom documents OAuth app registration and SDK support. Registration and redirect configuration are required. | Registered Fathom OAuth app, client credentials, redirect URI, and user authorization. | Requires token lifecycle, revocation, state/PKCE assessment, owner binding, and expanded threat model. | Future Fathom OAuth adapter | Exclude from personal v0; re-verify scopes and token behavior before multi-user work. |
| List/filter meetings | Supported | `GET /meetings` supports cursor pagination and filters including date, recorder, team, meeting type, and invitee-domain properties. | Authorized API key or OAuth token with access to the meeting. | Use bounded date ranges/pages. Do not log titles, invitees, share URLs, or raw responses. | `FathomProvider` | Run one bounded controlled probe; record shape and pagination without committing payloads. |
| Retrieve meeting metadata | Supported | Meeting responses include provider IDs, timestamps, meeting/share URLs, recorder, invitees, and optional derived content. | Caller must have Fathom access to the meeting. | Minimize mapped fields; preserve provenance; treat URLs and names as untrusted. | Fathom meeting mapper | Validate the exact current response against synthetic mapping fixtures. |
| Retrieve calendar invitees and speaker attribution | Supported with limits | Meeting schemas include `calendar_invitees`; transcript items include speaker display name and optionally matched invitee email. | Access to the meeting/recording. | Invitees are not automatically authoritative attendance. Speaker matching can be incomplete or incorrect; do not silently merge people. | Participant normalizer | Verify one controlled meeting with invited non-attendees and multiple speakers. |
| Retrieve summaries | Supported | `/recordings/{recording_id}/summary` returns directly or posts to a destination URL; `/meetings?include_summary=true` is unavailable to OAuth apps. | Access to recording; OAuth apps must use recording endpoint. | Treat summaries as provider-derived untrusted content. Destination callbacks would add another authenticated endpoint and are unnecessary for v0. | `FathomProvider` | Use direct retrieval in v0; verify output and error behavior with a controlled recording. |
| Retrieve transcripts | Supported | `/recordings/{recording_id}/transcript` returns directly or posts to a destination URL; `/meetings?include_transcript=true` is unavailable to OAuth apps. | Access to recording; OAuth apps must use recording endpoint. | Transcript text is confidential and untrusted. Apply retention before storage; never log or commit it. | `FathomProvider` + transcript normalizer | Use direct retrieval in v0 and verify speaker/timestamp semantics. |
| Retrieve action items/highlights | Supported | Meeting listing supports optional action items/highlights; webhook configuration can include action items. | Access to meeting. | Store source/provenance; content cannot authorize external actions. | Artifact normalizer | Confirm exact fields in a controlled meeting and use synthetic fixtures. |
| Request recording download | Conditional | Recording download generation is asynchronous for video; completed URLs expire in about 24 hours. Access is limited to authorized owners/team/share levels. | Caller must have recording download permission. | Treat signed URL as a credential. Do not persist/log/send it. If fetched, enforce HTTPS/provider allowlists and safe redirects. | Artifact service | Verify authorized and forbidden cases; do not implement download until needed. |
| Receive meeting-completion content through webhooks | Supported | Fathom webhooks notify when new meeting content is ready and can optionally include summary, transcript, and action items. | Registered HTTPS destination and webhook secret. | Minimize webhook payload selection; verify before parsing; no raw payload retention by default; queue after authentication. | Fathom webhook route | Register separate development and production webhooks only after stable endpoints exist. |
| Verify webhook authenticity and replay window | Supported | Headers are `webhook-id`, `webhook-timestamp`, and `webhook-signature`; signed content uses raw body; HMAC-SHA256, constant-time comparison, and a typical five-minute tolerance are documented. | Webhook signing secret. | Apply size/content-type/rate limits before expensive work; support secret rotation; store ID for idempotency. | Fathom webhook security layer | Build positive, altered-body, invalid-signature, stale, oversized, and replay tests. |
| Trigger a Fathom bot to join an arbitrary Meet URL through the external API | Unsupported | The reviewed OpenAPI exposes meetings, recording summary/transcript/downloads, teams/users/types, and webhooks; it does not expose a join/start-bot operation. | None documented. | Suizy must not claim a Fathom join occurred based on request creation or Calendar resolution. | Product/orchestration layer | Exclude from v0. Reconsider only if future official Fathom documentation adds a supported endpoint. |
| API rate-limit handling | Supported requirement | Fathom returns `429` and rate-limit headers. Heavy summary/transcript requests: 30 per 60 seconds; recording-download requests: 30 per 60 seconds; OAuth token endpoint: 60 per 60 seconds per app. Limits may be adjusted. | Authenticated request. | Honor `Retry-After`; bound concurrency; use jittered backoff; never retry non-idempotent requests blindly. | Provider client/job runner | Confirm live response headers during the controlled API probe. |

### Google Chat API

| Planned operation | Status | Official evidence and limits | Minimum access / consent | Security and retention implications | Suizy owner | Next verification |
|---|---|---|---|---|---|---|
| Configure an interactive Chat app | Supported | Google documents Cloud project, OAuth consent screen, Chat API enablement, and an interaction endpoint for interactive apps. | Business or Enterprise Workspace account with Chat, Cloud project, configured Chat app, approved installation/publication. | Use separate development/production Cloud projects or app registrations where feasible. Restrict installation to approved users/spaces. | Chat app configuration | Configure only after a stable development endpoint and owner/space policy exist. |
| Receive `@Suizy` mention events | Supported | Interaction events explicitly include users @mentioning a Chat app. | Chat app installed in an allowed direct message or space. | Verify Google request first; validate event/user/space; enforce owner and space allowlists; minimize retained message text. | Chat interaction route | Capture one controlled event shape without committing the payload. |
| Verify an HTTP interaction request came from Google Chat | Supported | Google sends a bearer token in the `Authorization` header for each HTTPS request; token type/verification depends on configured authentication audience. Invalid tokens should receive `401`. | Correct endpoint authentication audience and Google-issued bearer token validation. | Authenticate before provider calls or persistence. Validate issuer, audience, signature, and time claims according to official architecture; never log token/header. | Chat request-authentication layer | Select URL-audience ID token vs project-number JWT configuration and implement official verification tests. |
| Respond synchronously to an interaction | Supported | A Chat app can return a `Message` synchronously and must respond within 30 seconds. Synchronous interaction responses themselves do not require a Chat API access token. | Verified interaction request. | Return quickly with minimal data; do not perform long provider work in the request. Response goes to the originating space. | Chat handler | Verify the 30-second requirement and return an immediate acknowledgment in a controlled space. |
| Send delayed/asynchronous status messages | Conditional | Calling the Chat API asynchronously requires authentication and authorization. App auth can use a service account; `chat.bot` is supported for methods that allow app authorization. | Service account/app authorization and method-compatible scope; user auth only when acting for a user. | Private key must be secret-managed; destination must be owner/space authorized; sends must be idempotent and audited. | Chat notifier | Confirm the exact message-create method, supported auth type, and minimum scope before implementation. |
| Use `chat.app.*` scopes | Conditional / Deferred | Google states scopes beginning `chat.app.*` require one-time administrator approval. | Workspace administrator approval. | Avoid unless a required method cannot use `chat.bot`; scope expansion needs security review. | Chat authorization owner | Exclude from first slice unless official method requirements prove necessary. |
| Retain full Chat event payloads | Unsupported by Suizy policy | Google delivers event data, but Suizy has no product need to retain raw payloads. | N/A | Retain only verified event ID, owner, space/thread reference, timestamp, normalized command, and necessary provenance. | Chat ingestion layer | Confirm minimized fields during the controlled event test. |
| Chat API rate/usage limits | Unverified for selected methods | The reviewed overview establishes API authentication but the exact quota depends on method/project and was not fixed in this review. | Cloud project quotas. | Implement bounded retries and observe quota headers/errors; do not assume unlimited sends. | Chat provider client | Record quotas for the selected async method before enabling notifications. |

### Google Meet REST API

| Planned operation | Status | Official evidence and limits | Minimum access / consent | Security and retention implications | Suizy owner | Next verification |
|---|---|---|---|---|---|---|
| Create a Meet space | Supported / Deferred | `spaces.create` creates a meeting space. | `meetings.space.created`; user authorization. | Creates externally usable meeting infrastructure; requires explicit approved feature and audit. | Future Meet space service | Exclude from first vertical slice; verify scope only if scheduling is requested. |
| Read a Meet space | Conditional | `spaces.get` supports meeting-code or resource lookup subject to user access and OAuth scope. | Prefer `meetings.space.readonly` for spaces the user can access; `meetings.space.created` is narrower to app-created spaces. | Do not expose meeting codes/URIs in logs or unauthorized responses. | `GoogleMeetProvider` | Resolve one controlled space with minimum scope. |
| Patch settings or end an active conference | Supported / Deferred | The `spaces` resource exposes patch and `endActiveConference` methods. | Method-specific Meet scope and authorized user. | Externally visible/destructive. Requires explicit approval, strong authorization, idempotency, and audit. | Future Meet control service | Exclude from v0. Re-verify exact method scopes before any implementation. |
| List/get conference records | Supported | `conferenceRecords.get/list` exposes conference instances; list accepts `meetings.space.created` or `meetings.space.readonly`. | User OAuth and access to the relevant meeting records. | Scope results to owner and bounded time/space. Do not equate a meeting space with one conference record. | `GoogleMeetProvider` | Query one controlled completed conference and document availability delay. |
| List participants and participant sessions | Supported | Conference-record participant and participant-session resources are documented. | User OAuth with a supported Meet read scope and access to conference. | Participant records are sensitive. Distinguish attendance sessions from Calendar invitees and Fathom speaker matches. | Meet participant adapter | Compare controlled results with Calendar/Fathom without committing identities. |
| List recordings | Supported | Conference-record recording resources are documented as Meet-generated artifacts. | User OAuth and access to the conference record. | Metadata access does not automatically grant file download access. Preserve provider provenance. | Meet artifact adapter | Verify metadata fields and permission behavior in a controlled conference. |
| List transcripts and transcript entries | Supported | Conference-record transcript and transcript-entry resources are documented. | User OAuth and access to the conference record. | Apply transcript retention, owner scoping, output escaping, and no-log rules before ingestion. | Meet transcript adapter | Verify one controlled transcript and availability timing. |
| Download recording/transcript files from Drive | Conditional / Deferred | Meet authorization guidance lists `drive.readonly` for downloading recording/transcript files from Drive; it is a restricted scope. | Restricted `drive.readonly` scope, OAuth verification requirements as applicable, and file permission. | Broad/high-risk scope. Prefer metadata or connector-based narrower access; do not request for first slice. | Future artifact service | Exclude from v0 until a concrete download requirement justifies restricted-scope review. |
| Start recording or transcription through Meet REST | Unsupported for current v0 assumption | Artifact documentation says participants configure artifacts in Meet before the conference ends; reviewed REST resources retrieve artifacts but do not establish a general start-recording/transcription control for Suizy. | None established for this operation. | Do not claim Suizy initiated capture. Record only observed artifact status and consent/provider evidence. | Product/orchestration layer | Exclude from v0 unless future official methods explicitly support it. |
| Join a live Meet through Meet REST | Unsupported | Meet REST manages spaces and post-conference records/artifacts; it is not a live media client. | N/A | Never interpret `spaces.get`, conference-record access, or artifact access as live participation. | Product/orchestration layer | Live feasibility belongs only to the Media API track. |
| Meet REST rate/usage limits | Unverified for selected calls | Google provides usage-limit documentation, but exact operational quotas for Suizy's selected methods/project were not established in this review. | Cloud project quotas. | Use bounded pages, timeouts, concurrency, and retry only safe reads. | Meet provider client | Record current project quotas and method errors before production use. |

### Google Meet Media API

| Planned operation | Status | Official evidence and limits | Minimum access / consent | Security and retention implications | Suizy owner | Next verification |
|---|---|---|---|---|---|---|
| Consume live audio streams | Conditional | The Media API overview documents consuming audio streams from a conference. Current reference material labels the API Developer Preview. | Developer Preview enrollment requirements, registered Cloud project, OAuth principal, `meetings.conference.media.readonly`, admin setting, host/eligible consenter, and supported meeting. | Audio is highly sensitive. No storage until consent, retention, encryption, and deletion controls are approved. | Future Media API client | Verify target Workspace/project/principal eligibility before any prototype. |
| Consume live video streams | Conditional | The Media API overview documents consuming video streams. | Same preview, OAuth, admin, meeting, and consent requirements as live audio. | Do not record or persist video during feasibility beyond approved ephemeral testing. | Future Media API client | Run only Google's official sample in a controlled meeting after approval. |
| Consume live participant metadata | Conditional | The Media API overview documents participant metadata over conference resource data channels. | Same preview, OAuth, admin, and consent requirements. | Participant identity and session data must be owner-scoped and minimized. | Future Media API client | Compare the controlled metadata to REST participant records. |
| Connect when encryption or watermark is enabled | Unsupported under documented conditions | The overview says the connection is rejected for encrypted or watermarked meetings. | N/A | Do not attempt bypasses or fallback browser automation. | Media feasibility owner | Encode as a hard unsupported state if Media work proceeds. |
| Connect without an eligible consenter present | Unsupported | Workspace meetings require a person in the owning organization who can consent; consumer meetings require the initiator to be present. | Eligible consenter in the call. | A Chat command or Calendar event is not consent. Record actual provider consent state separately. | Media feasibility owner | Observe the official consent flow in a controlled meeting. |
| Make Suizy visible to participants | Conditional / Not equivalent to a participant tile | Documentation states eligible host/co-host/organization participants see an initiation dialog and anyone can stop the Media API. It does not establish that the app appears as an ordinary human participant tile. | Successful consent flow and active Media API session. | Product language must describe the observed UI exactly and not say “joined as a participant” without evidence. | Product + Media feasibility owner | Record participant-visible behavior during the controlled official-sample test. |
| Transmit Suizy audio/video into the meeting | Unsupported by reviewed capability statement | The overview describes consuming audio/video/participant metadata. It does not establish outbound media transmission as a supported Suizy operation. | None established. | No custom WebRTC workaround or impersonation. | Product/orchestration layer | Exclude from v0 unless future official documentation explicitly supports transmission. |
| Use Media API as a production v0 dependency | Conditional / Excluded from first slice | Developer Preview and enrollment/consent restrictions make availability conditional. | All current eligibility requirements plus product/security approval. | Must have a separate threat review, incident response, retention controls, runtime limits, and participant-awareness validation. | Architecture owner | Keep as independent feasibility Phase 9; do not block Chat → Calendar → Fathom workflow. |
| Media API quotas and operational limits | Unverified | Reviewed pages describe stream behavior and eligibility but did not establish all production quota values required for capacity design. | Eligible project and active API access. | No production commitment until quotas, stream caps, timeouts, and failure modes are measured/documented. | Media feasibility owner | Inspect current project quota console and official usage-limit pages after enrollment. |

## Security Requirements by Provider

| Provider boundary | Request authentication | Minimum access | Consent / authorization signal | Rate-limit handling | Retention rule | Environment separation |
|---|---|---|---|---|---|---|
| Replit Calendar connector | Replit-managed connector authorization | Calendar access only for initial slice; actual granted scopes must be inspected | User/workspace connector authorization; not Meet capture consent | Connector/provider limits not fixed here; bound queries and retries | Retain only canonical fields required for resolution | Separate development and production connector grants where supported |
| Fathom REST | API key for personal v0 | Endpoints required for meetings/artifacts only | Fathom account/recording access | Honor `429`/`Retry-After`; heavy and download limits are 30/60 seconds | No raw responses; transcript lifecycle applies before storage | Separate API keys and webhook registrations |
| Fathom webhook | HMAC-SHA256 over exact raw body with ID/timestamp/signature | Dedicated webhook secret | Valid signature plus owner-scoped meeting access | Pre-auth body/rate limits; dedupe before jobs | No raw body by default; persist minimal ID/provenance | Separate secrets/endpoints per environment |
| Google Chat interaction | Verify Google bearer token, audience, issuer, signature, and time claims | Interaction endpoint only | Verified Google event plus allowed owner/space | Pre-auth request limits; synchronous reply within 30 seconds | Persist normalized command/provenance only | Separate app registrations/endpoints where feasible |
| Google Chat asynchronous API | Service account/app auth when method permits; user OAuth only when necessary | Prefer `chat.bot`; avoid `chat.app.*` unless required | Owner/space authorization and approved notification policy | Observe method/project quotas; idempotent bounded retries | Store message/thread references, not message bodies by default | Separate service accounts/credentials |
| Meet REST | User OAuth | Prefer `meetings.space.readonly`; `meetings.space.created` for app-created spaces; avoid restricted Drive scope | OAuth grant plus resource permission | Bound pages/concurrency; verify project quotas | Apply participant/transcript lifecycle before persistence | Separate Cloud clients/projects and redirect URIs |
| Meet Media | OAuth and preview-eligible registered project/principal | `meetings.conference.media.readonly` only for feasibility | Admin enablement plus in-meeting eligible consenter and provider UI | Unverified until eligible; enforce strict stream/runtime limits | No captured media retention during feasibility | Isolated feasibility project/credentials and controlled meetings |

## Retention and Data-Minimization Decisions

Before any production meeting is processed:

1. Do not retain raw Chat or Fathom webhook bodies by default.
2. Do not log authorization headers, webhook signatures, connector data, meeting titles, invitees, Meet links, transcripts, summaries, recording URLs, or provider response bodies.
3. Treat Fathom signed download URLs as credentials; do not persist or send them through Chat.
4. Persist only canonical fields required by the current feature, with owner and provenance.
5. Do not ingest transcripts until approved retention and deletion behavior exists.
6. Keep test fixtures synthetic and non-sensitive.
7. Keep development and production accounts, credentials, webhooks, databases, and Cloud registrations separate.

## Explicit v0 Exclusions

The following claims or behaviors are excluded from Suizy v0 unless later official documentation and a separate approved roadmap step establish them:

- Triggering a Fathom bot to join an arbitrary Meet URL through the External API.
- Treating Replit's Calendar connector as a Google Chat or Meet bot integration.
- Joining a live Meet through the Meet REST API.
- Starting Meet recording or transcription through an undocumented REST operation.
- Bypassing Meet Media encryption, watermark, admin, enrollment, or consent restrictions.
- Claiming the Meet Media client appears as a normal participant tile without observed official behavior.
- Transmitting Suizy audio or video through a receive-only documented Media capability.
- Automatically sending email, writing Calendar/Docs/Drive/Sheets, ending conferences, or deleting data without explicit authorization, idempotency, and audit.

## Required Next Verifications

1. **Replit Calendar controlled read:** connect the intended account, record actual scopes, and inspect structured conference fields without retaining a production payload.
2. **Google Chat authentication design:** select URL-audience ID token or project-number JWT verification, then prove valid/invalid/audience/replay behavior.
3. **Fathom controlled API probe:** confirm response shape, permissions, pagination, and rate-limit headers with one non-confidential meeting.
4. **Fathom webhook fixtures:** verify exact raw-body signing, five-minute replay tolerance, rotation strategy, and idempotency before registration.
5. **Meet REST controlled conference:** verify resource availability, permission behavior, and artifact timing under `meetings.space.readonly`.
6. **Meet Media eligibility:** verify Developer Preview enrollment, Cloud project, principal, participant, admin, scope, and consent requirements before any sample run.
7. **Quota register:** record actual Chat, Meet REST, Media, Replit connector, and Fathom project/account limits when credentials are configured.

## Acceptance Decision

Phase 0.2 documentation acceptance is satisfied when this matrix has been reviewed and approved:

- Every currently planned external operation has a status.
- Every row identifies an official source, implementation owner, and next verification.
- Scope, authentication, consent, rate-limit, retention, and environment implications are captured.
- Unsupported operations are explicitly excluded from v0.

GitHub delivery remains a separate completion condition: commit this file with:

```text
docs(roadmap): verify external capabilities
```

and push it to the approved branch without tokens, real provider payloads, transcripts, participant data, or private URLs.