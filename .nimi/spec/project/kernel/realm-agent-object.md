---
id: SPEC-REALM-AGENT-STUDIO-REALM-AGENT-OBJECT-001
title: Realm Agent Object
status: active
owner: "@team"
updated: 2026-05-21
---

# Realm Agent Object

## Composition

Realm Agent Studio treats a public Realm Agent as a composed Realm source entity,
not as an app-local `RealmAgent` table. The product object is composed from:

- author account role evidence: Feed projection treats `Account.role = AGENT`
  as RealmAgent author truth for `agent_activity`
  (`.nimi/spec/realm/kernel/feed-contract.md:95` to `:105`);
- `AgentProfile` projection/read fields, including `greeting`, world fields,
  ownership type, state, and stats evidence in current generated schema
  (`sdk/src/realm/generated/schema.ts:3890` to `:3932`);
- `AgentRule` entries bound to world scope, which anchor agent truth
  (`.nimi/spec/realm/kernel/truth-contract.md:31` to `:33`);
- world scope and `OASIS` as the unique system main world
  (`.nimi/spec/realm/kernel/truth-contract.md:47` to `:53`);
- Realm `Binding` rows for public presentation/use/import relations, with
  `AGENT` as an active host type (`.nimi/spec/realm/kernel/binding-contract.md:22`
  to `:36`);
- Realm `Post` rows authored by the agent account, with Post truth owned by
  Realm Feed (`.nimi/spec/realm/kernel/feed-contract.md:47` to `:54`);
- social projections admitted by Realm Social, where AgentFriend relationships
  are ordinary Friendship rows (`.nimi/spec/realm/kernel/social-contract.md:34`
  to `:52`).

## Truth Anchor And Editing Semantics

`AgentRule` remains the canonical Realm truth anchor for owner-created agent
behavior and policy (`.nimi/spec/realm/kernel/truth-contract.md:31` to `:33`).
**[R-RAS-AGENT-001]** Studio does not promote explicit raw `AgentRule` CRUD to the default owner UX.
The default owner-facing model is owner settings input, proposal, review, and
acceptance. **[R-RAS-AGENT-002]** Raw rule text, lines, and rule objects may be shown for review,
audit, replay, or expert confirmation only after Realm admits a dedicated
owner-scoped rule-content read surface. **[R-RAS-AGENT-003]** Public projections expose aggregates
only and must not be reused as rule-content review authority.

**[R-RAS-AGENT-004]** Accepted owner edits must eventually flow through a canonical owner-scoped
Realm settings/truth ingress that derives or compiles canonical truth writes.
**[R-RAS-AGENT-005]** Current `AgentRulesService` rule operations are world-scoped
(`/api/world/by-id/{worldId}/agents/{agentId}/rules...`) and must not be
reused as the Studio default owner save path
(`sdk/src/realm/generated/operation-map.ts:97` to `:115`; `:209` to `:220`).
Studio owner setting save uses `PATCH /api/me/agents/{agentId}/settings`, which
is admitted by Realm truth authority as the current-user `MASTER_OWNED`
settings ingress. **[R-RAS-AGENT-006]** It accepts owner-reviewed structured settings and compiles or
derives versioned `AgentRule` truth writes server-side; it does not admit raw
rule CRUD or owner rule-content review.

## Owner Boundary

**[R-RAS-AGENT-007]** Realm Agent Studio manages user-owned public Realm Agents only. Current DTO
evidence exposes `AgentOwnershipType` as `MASTER_OWNED | WORLD_OWNED`
(`sdk/src/realm/generated/schema.ts:3889`), but **[R-RAS-AGENT-008]** this app spec does not
rename that source model. **[R-RAS-AGENT-009]** Studio owner-created scope is the current
authenticated user's `MASTER_OWNED` Realm Agents and excludes `WORLD_OWNED`
agents.

Studio portfolio reads use the current-user owner-owned RealmAgent read surface:
`GET /api/me/agents` / `listMyRealmAgents` returns `UserLiteDto[]`
(`sdk/src/realm/generated/schema.ts:2674` to `:2686`; `:11802` to `:11819`),
and `GET /api/me/agents/{agentId}` / `getMyRealmAgent` returns one
`UserLiteDto` (`sdk/src/realm/generated/schema.ts:2694` to `:2706`; `:11822`
to `:11844`). **[R-RAS-AGENT-010]** These surfaces are current authenticated user scoped and
`MASTER_OWNED` only.

Forge-imported system-curation surfaces, including
`/api/agent/forge-imported-system/**`, belong outside Realm Agent Studio.
**[R-RAS-AGENT-036]** Studio must not call them as portfolio, detail, settings,
media, voice, chat-readiness, owner-quota, or metric authority. **[R-RAS-AGENT-037]**
Studio must not claim `SYSTEM` AgentRule provenance or
`forge-imported-system-agent-settings:*` source refs.

**[R-RAS-AGENT-011]** `GET /api/creator/agents` is a creator/world-creator surface, not the Studio
canonical my-agents surface and not an owner create path. **[R-RAS-AGENT-012]** `/api/creator/agents`
belongs to World Creator / Maintainer semantics and may be cited only as
non-owner evidence. `GET /api/agent/dev/my-agents` is an Agent Development
surface and carries development/limit/stats/delete/unbind/state management
context; **[R-RAS-AGENT-013]** Studio must not use it as canonical portfolio authority.

**[R-RAS-AGENT-014]** World ownership does not grant edit authority over an owner-created Realm Agent.
Generic world-created agents and Forge-imported system curation belong outside
Realm Agent Studio. **[R-RAS-AGENT-015]** AgentFriend creation/removal
linkages must not mutate the source RealmAgent truth
(`.nimi/spec/realm/kernel/social-contract.md:92` to `:100`).

## Local Draft And Update Boundary

**[R-RAS-AGENT-016]** Realm Agent Studio must not define a Realm Agent lifecycle state machine. A
local draft can exist before Realm creation, but **[R-RAS-AGENT-017]** creation succeeds only after
Realm creates the composed source entity. **[R-RAS-AGENT-018]** After creation, the first Studio
version supports update operations only through separately admitted owner update
writes. **[R-RAS-AGENT-019]** Owner setting updates use the owner-scoped settings/truth ingress
`PATCH /api/me/agents/{agentId}/settings`, which compiles or derives canonical
truth writes; **[R-RAS-AGENT-020]** raw world-scoped rule CRUD is not that owner update model.

Current generated Realm DTO evidence exposes `AgentState` as
`INCUBATING | READY | ACTIVE | SUSPENDED | FAILED`
(`sdk/src/realm/generated/schema.ts:3990` to `:3999`). **[R-RAS-AGENT-021]** Studio may cite that
state as Realm evidence if needed, but it must not map it into a Studio-owned
four-state owner lifecycle or expose delete, pause, archive, or publish-state
transitions as first-version Realm Agent operations. Current creator routes
expose a delete operation (`sdk/src/realm/generated/schema.ts:868` to `:884`),
but **[R-RAS-AGENT-022]** delete is not a first-version Studio product operation.

Generated evidence also exposes `POST /api/agent/accounts/{id}/public`
(`sdk/src/realm/generated/schema.ts:76`; `:7732` to `:7739`). **[R-RAS-AGENT-023]** That operation is
only a public-operation candidate; it does not create Studio lifecycle
authority.

## Creation

**[R-RAS-AGENT-024]** Creation succeeds only after Realm creates a real composed source entity. **[R-RAS-AGENT-025]** A
local form draft, AI draft, or partially generated asset is not creation
success.

Current generated schema evidence for agent creation includes:

- `POST /api/agent` / `AgentsService.agentControllerCreate` as the owner-scoped
  create operation (`sdk/src/realm/generated/operation-map.ts:272` to `:290`);
- `CreateAgentDto.handle`, `displayName`, `concept`, `description`, `dna`,
  `dnaPrimary`, `dnaSecondary`, `referenceImageUrl`, `rules`, and required
  `worldId` (`sdk/src/realm/generated/schema.ts:4536` to `:4563`);
- `CreateAgentRulesDto` with `format`, `lines`, and `text`
  (`sdk/src/realm/generated/schema.ts:4558` to `:4577`);
- `CreateAgentResponseDto.id`, `state`, `user`, and `dna`
  (`sdk/src/realm/generated/schema.ts:4519` to `:4527`).

Studio owner create admission:

- **[R-RAS-AGENT-026]** Studio create writes call only
  `realm.services.AgentsService.agentControllerCreate(body)` /
  `POST /api/agent`.
- **[R-RAS-AGENT-027]** The submitted body is a `CreateAgentDto` owner allowlist: `handle`,
  `displayName`, `concept`, optional `description`, `worldId`, optional visible
  `rules` as `CreateAgentRulesDto` only when derived from accepted owner
  settings input, required archetype DNA via `dnaPrimary`, optional
  owner-reviewed `dnaSecondary`, optional reviewed `referenceImageUrl`, and
  `ownershipType: MASTER_OWNED`.
- **[R-RAS-AGENT-028]** Studio must not submit `WORLD_OWNED`, creator/maintainer fields, lifecycle,
  provider/model, LocalAgent, fake state, id, author/owner ids, hidden
  personality/worldview fields, or full raw `dna` JSON in this create path.
  `dnaPrimary` / `dnaSecondary` are admitted only as the SDK/Realm archetype
  create form, and `referenceImageUrl` is admitted only as reviewed visual
  reference input; it is not public asset or binding truth.
- **[R-RAS-AGENT-029]** Studio create UX is owner setting input first. **[R-RAS-AGENT-030]** Raw `CreateAgentRulesDto`
  editing/review may exist as expert semantics, but it is not the default
  owner-facing model.
- **[R-RAS-AGENT-031]** `OASIS` defaulting and world selection remain source-backed by
  `WorldsService.worldControllerListWorlds`; selected-world preview remains
  `WorldsService.worldControllerGetWorldDetailWithAgents`.
- **[R-RAS-AGENT-032]** Success requires the canonical Realm create response object with `id`. **[R-RAS-AGENT-033]** Missing object or missing `id` is failure. **[R-RAS-AGENT-034]** Studio must not synthesize success,
  and failure preserves the local draft while naming the exact source or
  capability.
- Current DTO `worldId` proves active agents are world-bound. **[R-RAS-AGENT-035]** Product decision
  says all Realm `listWorlds` results are selectable for Studio creation.
