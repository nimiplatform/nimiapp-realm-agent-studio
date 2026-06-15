---
id: SPEC-REALM-AGENT-STUDIO-CORE-RULES-001
title: Realm Agent Studio Core Cross-Cutting Rules
status: active
owner: "@team"
updated: 2026-05-25
---

# Core Cross-Cutting Rules

These rules are the cross-cutting invariants every Realm Agent Studio kernel document depends on. Domain-specific rules (`R-RAS-SCOPE-*`, `R-RAS-AGENT-*`, ...) are admitted only when consistent with the rules below. Any conflict between a domain rule and a `R-RAS-CORE-*` rule must be resolved by escalating, not by reading the domain rule as an override.

## Authority And Spec Posture

- **[R-RAS-CORE-001]** `.nimi/spec/project/kernel/**` is the only normative product/app authority root for Realm Agent Studio; no topic file, conversation note, renderer screenshot, or generated artifact may be promoted into parallel product truth.
- **[R-RAS-CORE-002]** Every implementation, test, governance check, and review comment that references a Realm Agent Studio rule MUST cite the `R-RAS-<DOMAIN>-NNN` ID; narrative paraphrase without an ID is not a valid authority citation.
- **[R-RAS-CORE-003]** Kernel rule changes require updating both the affected kernel document and `tables/rule-catalog.yaml` in the same change; the catalog and the doc set must never diverge.

## No Parallel Truth, No Pseudo-Success

- **[R-RAS-CORE-004]** Realm Agent Studio MUST NOT create app-local shadow truth for Realm Agent identity, settings, assets, posts, visibility, or metrics; every public success state must resolve to an admitted Realm, Runtime, or SDK authority owned outside this app spec.
- **[R-RAS-CORE-005]** Local draft saved, AI generation complete, candidate selected, local schedule created, attachment preview resolved, and Runtime output accepted are never substitutes for the corresponding admitted Realm write success.
- **[R-RAS-CORE-006]** Placeholder success, synthesized moderation success, fake return values, renderer-local truth, and zero-fill metrics are forbidden as substitutes for source-backed truth or admitted failure states.

## Owner Authority And Surface Boundary

- **[R-RAS-CORE-007]** Realm Agent Studio MUST keep its default owner portfolio scoped to current-authenticated-user `MASTER_OWNED` Realm Agents. The only admitted `WORLD_OWNED` exception is the CBDB curated system-agent lane for Halliday-owned seeded agents; generic world-created agents, world NPCs, and world maintainer tooling remain out of scope.
- **[R-RAS-CORE-008]** Studio MUST NOT reuse creator/world-maintainer/world-control surfaces (including `/api/creator/agents`, `/api/agent/dev/my-agents`, `AgentRulesService` world-scoped CRUD, `WorldControlService.worldControlControllerBatchUpsertWorldBindings`, `UpdateCreatorAgentDto.*`) as default owner save, read, or review paths.
- **[R-RAS-CORE-009]** `AgentRule` remains the canonical Realm truth anchor; raw `AgentRule` CRUD MUST NOT be promoted to the default owner editing UX, and canonical rule review remains deferred until Realm admits a dedicated owner-scoped rule-content read surface.

## Auth, Runtime, And SDK Custody

- **[R-RAS-CORE-010]** Realm and Runtime access MUST go through `@nimiplatform/sdk`; app code MUST NOT use app-local REST bypasses, app-owned long-lived auth token storage, hardcoded provider/model routing, fake Runtime sessions, or Desktop host impersonation.
- **[R-RAS-CORE-011]** Runtime is an AI consumption layer only; Runtime MUST NOT own Realm Agent truth, publish authority, moderation, permissions, lifecycle, metrics, or product state.

## UI System Posture

- **[R-RAS-CORE-012]** Realm Agent Studio implementation MUST use `nimi-kit` as the visible interaction system and follow the established `apps/parentos` / `apps/desktop` posture for shell, bootstrap, session, navigation, failure states, and SDK client construction; importing kit tokens is not sufficient and a parallel app-local component system requires a recorded kit gap before implementation.

## AI Posture

- **[R-RAS-CORE-013]** AI output MUST remain candidate material until owner human review accepts it AND the relevant admitted Realm write succeeds; AI generation, candidate selection, local preview, or Runtime acceptance alone are not Realm truth.
- **[R-RAS-CORE-014]** Runtime requests MUST receive only admitted public or owner-approved context; Runtime MUST NOT receive private LocalAgent memory, emotion, cognition, local chat transcript, or app-specific memory fragments.

## Fail-Closed Default

- **[R-RAS-CORE-015]** Every typed contract, source-availability, capability, permission, attachment-readiness, binding-shape, owner-authority, or admitted-write-owner gap MUST fail closed with a named failure state (per `failure-semantics.md`); fallback that hides contract violations, synthesized success after a typed/cached path fails, and silent recovery that masks an authority gap are forbidden.
- **[R-RAS-CORE-016]** Unavailable count is not zero; unavailable source is a product state, not a default value.

## Verification

This document is itself a kernel doc and is enumerated in `tables/rule-catalog.yaml` under prefix `R-RAS-CORE`. Adding, removing, or rewording a `R-RAS-CORE-*` rule MUST update the catalog in the same change. Downstream domain rules whose statement conflicts with a `R-RAS-CORE-*` invariant must be revised in the same change.
