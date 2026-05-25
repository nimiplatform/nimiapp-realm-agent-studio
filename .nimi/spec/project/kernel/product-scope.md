---
id: SPEC-REALM-AGENT-STUDIO-PRODUCT-SCOPE-001
title: Realm Agent Studio Product Scope
status: active
owner: "@team"
updated: 2026-05-22
---

# Product Scope

## Product Position

Realm Agent Studio is for agent owners who incubate and operate user-owned
public Realm Agents as durable Agent IP. **[R-RAS-SCOPE-001]** It is not a general agent management
center. **[R-RAS-SCOPE-002]** It does not manage LocalAgent private runtime forks, world-created
agents, world NPCs, or Forge package sources.

The primary user is an agent owner who may operate one public Realm Agent or a
portfolio of public Realm Agents. **[R-RAS-SCOPE-003]** The first-version depth is owner-only: no
invited editors, no team workspace, and no world-owner override over
owner-created agents.

## In Scope

- **[R-RAS-SCOPE-004]** Portfolio scan of user-owned Realm Agents with app-local draft or
  Realm-created status, selected world, last updated state, and source
  availability.
- **[R-RAS-SCOPE-005]** Create Realm Agent with public identity, `OASIS` default world, optional world
  selection from any Realm `listWorlds` result by product decision,
  handle availability preflight, selected-world basic setting preview from
  existing world detail, and visible public fields before submit.
- **[R-RAS-SCOPE-006]** Update canonical public setting through owner settings input: natural
  language, structured setting fields, AI proposal/review, and canonical rule
  review only when an admitted owner-scoped rule-content read surface exists.
- **[R-RAS-SCOPE-007]** Generate or upload visual/media candidates, keep app-local preview/history
  only, and mark assets public only after Realm write succeeds.
- **[R-RAS-SCOPE-008]** Generate voice-demo candidates through Runtime `audio.synthesize` when the
  route is available, with current SDK use through `media.tts.synthesize`.
- **[R-RAS-SCOPE-009]** Compose agent-authored Realm posts with canonical attachment envelope targets,
  human review, moderation status, and Realm publish result.
- **[R-RAS-SCOPE-010]** App-local single schedule for one human-reviewed local post draft.
- **[R-RAS-SCOPE-011]** `friendCount` / 好友数 from Realm `UserLiteDto.friendCount` when the source
  field is present. For RealmAgent users, Realm derives it from human-agent
  Friendship rows.
- **[R-RAS-SCOPE-012]** App shell, session posture, navigation, loading/failure states, and SDK client
  construction must follow `apps/parentos` / `apps/desktop` patterns. **[R-RAS-SCOPE-013]** The app
  must use `nimi-kit` as the visible interaction system and `@nimiplatform/sdk`
  for Realm/Runtime access.

## Out Of Scope

- **[R-RAS-SCOPE-014]** LocalAgent private memory, emotion, cognition, runtime state, or app-specific
  memory fragments.
- **[R-RAS-SCOPE-015]** RealmAgent direct chat as a Studio feature.
- **[R-RAS-SCOPE-016]** World-created agents, world-owned NPCs, package-derived world agents, and
  world maintainer tooling.
- **[R-RAS-SCOPE-017]** Forge `agentBlueprint` provenance or package-to-RealmAgent import mapping.
- **[R-RAS-SCOPE-018]** World transfer.
- **[R-RAS-SCOPE-019]** Team collaboration, invited editors, shared operation, or workspace roles.
- **[R-RAS-SCOPE-020]** Explicit raw `AgentRule` CRUD as the default owner-facing editing model.
- **[R-RAS-SCOPE-021]** Setting version history, rollback, diff impact attribution, and productized
  notification to existing LocalAgent forks.
- **[R-RAS-SCOPE-022]** Campaign calendars, recurring schedules, auto queues, bulk automation, and
  post performance analytics.
- **[R-RAS-SCOPE-023]** Gift, revenue, settlement, payout, and economic surfaces.
- **[R-RAS-SCOPE-024]** Profile-view metrics until Realm admits view-event authority.
- **[R-RAS-SCOPE-025]** A standalone visual shell, ad hoc design system, app-owned long-lived auth
  token storage, or app-level REST bypass around the SDK.

## First-Version Depth

Many-agent operation is list, filter, sort, and manual action. **[R-RAS-SCOPE-026]** Saved filters may
exist only as app-local view preferences and must not become queue, cohort, or
campaign truth.

AI is embedded inside concrete owner workflows. **[R-RAS-SCOPE-027]** AI output is draft or candidate
material until the owner accepts it and the relevant Realm write succeeds.

`AgentRule` remains the canonical Realm truth anchor for owner-created agent
behavior and policy. **[R-RAS-SCOPE-028]** Studio does not make explicit raw `AgentRule` editing the
default owner UX. **[R-RAS-SCOPE-029]** The default owner model is settings input, proposal, review,
and acceptance; raw rule text/lines are review, audit, or expert semantics only
after an admitted owner-scoped rule-content read surface exists.

Accepted owner setting edits flow through the canonical owner-scoped Realm
ingress `PATCH /api/me/agents/{agentId}/settings`, which derives or compiles
canonical truth writes. **[R-RAS-SCOPE-030]** Studio must not reuse `AgentRulesService` world-scoped
`/api/world/.../rules` CRUD semantics as the default owner save path.

**[R-RAS-SCOPE-031]** Public success requires the authoritative operation to succeed. **[R-RAS-SCOPE-032]** Local draft
save, local asset preview, AI generation, and local schedule creation are never
Realm publish or public asset success.

## Source References

- Topic product authority draft:
  `.nimi/topics/ongoing/2026-05-21-realm-agent-studio-product-flow-storybook/product-document.md`
- Topic detailed storybook:
  `.nimi/topics/ongoing/2026-05-21-realm-agent-studio-product-flow-storybook/user-storybook-detailed.md`
- Topic boundary and forbidden shortcuts:
  `.nimi/topics/ongoing/2026-05-21-realm-agent-studio-product-flow-storybook/topic.yaml`
