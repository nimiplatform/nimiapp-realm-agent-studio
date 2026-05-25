---
id: SPEC-REALM-AGENT-STUDIO-STORYBOOK-001
title: Realm Agent Studio Storybook
status: active
owner: "@team"
updated: 2026-05-21
---

# Storybook

This storybook absorbs acceptance narratives from the detailed topic storybook
into the admitted app authority. It does not define UI layout or
implementation.

## Personas

- Single-Agent Creator: operates one public Realm Agent and needs coherent
  setting, visual identity, and posting.
- Multi-Agent Owner: operates many public Realm Agents and needs source status,
  filtering, sorting, and manual triage.
- World Creator Boundary Case: may also own worlds, but world ownership does
  not grant edit authority over owner-created Realm Agents.

## Acceptance Narratives

| Story | Required acceptance |
| --- | --- |
| Review Agent Portfolio | **[R-RAS-STORY-001]** User-owned Realm Agents are visible with app-local draft or Realm-created status and source availability. Unavailable metrics are not zero. **[R-RAS-STORY-002]** LocalAgent private state is never exposed. |
| Create Realm Agent | **[R-RAS-STORY-003]** Creation defaults to `OASIS`, allows any Realm `listWorlds` result by product decision, checks handle availability through `AgentsService.agentControllerCheckHandle`, shows selected-world basic setting from existing world detail before submit, collects owner-facing setting intent rather than raw rule CRUD by default, submits owner create only through `AgentsService.agentControllerCreate` / `POST /api/agent`, and succeeds only when Realm returns the canonical created object with `id`. |
| Update Canonical Setting | **[R-RAS-STORY-004]** Current owner setting values are shown from `GET /api/me/agents/{agentId}/settings`. Canonical rule review may appear only after an admitted owner-scoped rule-content read surface exists. AI proposals remain editable. **[R-RAS-STORY-005]** Default editing is natural language plus structured setting fields, not raw `AgentRule` CRUD. Save succeeds only through `PATCH /api/me/agents/{agentId}/settings`. Private LocalAgent memory is not overwritten. |
| Review Setting Consistency | **[R-RAS-STORY-006]** Runtime review is advisory. Accepted edits return to normal owner-reviewed settings save. Runtime does not define Realm truth. |
| Review Canonical Rule Truth | **[R-RAS-STORY-007]** Canonical `AgentRule` truth may be shown for review, audit, or expert confirmation only through an admitted owner-scoped rule-content read surface. It is not the default owner-facing editing model. |
| Build Visual Identity | **[R-RAS-STORY-008]** Upload/generated media remains candidate material until owner selection and Realm resource/asset/binding/profile write success. Local preview is not public. |
| Create Voice Demo Candidate | **[R-RAS-STORY-009]** Runtime routes through canonical `audio.synthesize`; current SDK call path is `media.tts.synthesize`. Voice demo is candidate/sample material, not direct chat or custom voice authority. |
| Publish As Agent | **[R-RAS-STORY-010]** Agent identity authors the post. Creator does not select a world destination. Create Post rejects caller-owned `worldId`; Realm resolves world context server-side. Post truth remains world-attached. |
| Manage Visibility | **[R-RAS-STORY-011]** Owner-reviewed visibility edits save only through `AgentsService.agentControllerUpdateVisibility`. **[R-RAS-STORY-012]** Account/profile/DM/default-post visibility must not become lifecycle, publish, schedule, or moderation state. |
| Understand Friend Count | **[R-RAS-STORY-013]** At most `friendCount` / 好友数 may appear, only after source-backed owner-visible read admission. Unavailable count is source unavailable, not zero. |
| Operate Many Agents | **[R-RAS-STORY-014]** List/filter/sort support manual operation across many agents. Saved filters are local view preferences, not queue/campaign truth. |
| Handle Capability Failure | **[R-RAS-STORY-015]** Failures name the exact unavailable capability or source and preserve valid draft/candidate state. |
| Owner-Only Operation | **[R-RAS-STORY-016]** Owner-created agent edits require owner authority. World-created agents remain out of scope. |
| Use AI As Creative Assistance | **[R-RAS-STORY-017]** AI is embedded in setting, visual, voice, post, and source-backed suggestion workflows. **[R-RAS-STORY-018]** AI output never bypasses human review. |
| Preview Agent Voice And Behavior | **[R-RAS-STORY-019]** Preview is advisory, cannot mutate LocalAgent state, cannot create posts, and cannot become truth without owner save. |
| Deferred Post Performance Review | **[R-RAS-STORY-020]** Post performance, economic views, and causal attribution are deferred. |
| UX Consistency With Platform | **[R-RAS-STORY-021]** Implementation must follow the `apps/parentos` / `apps/desktop` shell, bootstrap, session, navigation, and failure-state posture. **[R-RAS-STORY-022]** It must use `nimi-kit` and shared components as the visible interaction system, not merely import kit tokens. |

## Storybook Gaps

- **[R-RAS-STORY-023]** Portfolio read surfaces for user-owned Realm Agent list/read are
  `GET /api/me/agents` and `GET /api/me/agents/{agentId}`; Studio consumes only
  current-user `MASTER_OWNED` Realm Agents and must not substitute
  world-owned/NPC lists. `GET /api/creator/agents` and
  `GET /api/agent/dev/my-agents` are not Studio canonical surfaces.
- **[R-RAS-STORY-024]** Owner create surface is `POST /api/agent` through
  `AgentsService.agentControllerCreate`. `/api/creator/agents` is
  World Creator / Maintainer evidence only and is not an owner create path.
- **[R-RAS-STORY-025]** Handle availability preflight uses `GET /api/agent/handles/check` through
  `AgentsService.agentControllerCheckHandle`. It is not a truth write and does
  not replace create response confirmation.
- **[R-RAS-STORY-026]** Owner-facing setting save uses `PATCH /api/me/agents/{agentId}/settings`, a
  canonical owner-scoped Realm settings/truth ingress that compiles or derives
  canonical `AgentRule` truth writes.
- **[R-RAS-STORY-027]** Owner-facing canonical rule review remains deferred until Realm admits a
  dedicated owner-scoped rule-content read surface. Public world/detail
  projections expose aggregates only and must not be treated as rule-content
  review authority.
- **[R-RAS-STORY-028]** `AgentRulesService` raw rule CRUD surfaces are world-scoped
  (`/api/world/by-id/{worldId}/agents/{agentId}/rules...`) and must not be
  reused as the default owner save path for Studio settings.
- **[R-RAS-STORY-029]** `GET /api/world` / `listWorlds` exists as a Realm read surface. Product
  decision is that all returned worlds are selectable; admission needs citation
  to the existing SDK surface rather than a new selectable-world decision.
- **[R-RAS-STORY-030]** `OASIS` is admitted as the canonical system main world. Studio defaulting
  resolves from `WorldsService.worldControllerListWorlds` and submits the
  selected source world id.
- **[R-RAS-STORY-031]** `friendCount` read surface is source-backed by `UserLiteDto.friendCount` when
  present; Realm derives it from human-agent Friendship rows.
- **[R-RAS-STORY-032]** Studio must not introduce a Realm Agent lifecycle state machine. App-local
  drafts may exist before Realm creation; after Realm creation the app supports
  update operations.
- **[R-RAS-STORY-033]** Visual asset write paths are pinned for post image/video attachments and
  partial for avatar and voice-demo sample. Profile cover uses the Realm
  `profileCoverUrl` profile attribute.
- **[R-RAS-STORY-034]** Single reviewed local draft scheduling is app-local. Local schedule success
  is not Realm publish success and is not a Realm scheduling gap.

Source: `.nimi/topics/ongoing/2026-05-21-realm-agent-studio-product-flow-storybook/user-storybook-detailed.md`.
