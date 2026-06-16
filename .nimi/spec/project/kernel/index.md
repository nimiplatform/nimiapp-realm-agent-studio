---
id: SPEC-REALM-AGENT-STUDIO-KERNEL-INDEX-001
title: Realm Agent Studio Kernel Authority
status: active
owner: "@team"
updated: 2026-05-25
---

# Realm Agent Studio Kernel Authority

## Scope

This kernel is the single authoritative product/app contract source for Realm Agent Studio. Every kernel document below carries explicit `R-RAS-<DOMAIN>-NNN` rule IDs. Implementation, tests, and review must cite these IDs; they must not duplicate kernel rule prose.

Realm Agent Studio is the owner operation center for user-owned public Realm Agents as durable Agent IP. It is not a general agent management center. Generic world-created agents, world NPCs, Forge-imported system curation, LocalAgent private state, Forge package provenance, and provider/model routing are out of scope.

## Rule ID Format

`R-RAS-<DOMAIN>-NNN`

| Domain | Mnemonic | Kernel Document |
|---|---|---|
| `CORE` | Cross-cutting authority and posture invariants | `core-rules.md` |
| `SCOPE` | Product scope, in/out scope, first-version depth | `product-scope.md` |
| `AGENT` | Realm Agent object composition, truth anchor, owner boundary, creation | `realm-agent-object.md` |
| `SETTING` | Agent setting field admission map and write-path rules | `agent-setting-field-map.md` |
| `ASSET` | Asset / Binding candidate lifecycle and admitted write paths | `asset-and-binding.md` |
| `POST` | Post publishing world boundary, attachment envelope, human review | `post-publishing.md` |
| `RUNTIME` | Runtime AI consumption boundary and truth posture | `runtime-ai-consumption.md` |
| `METRIC` | Owner-visible metric source-backing and gap admission | `metrics-and-realm-gaps.md` |
| `FAIL` | Required failure states, success rules, fail-closed requirements | `failure-semantics.md` |
| `STORY` | Acceptance narratives and storybook gaps | `storybook.md` |
| `ACCEPT` | Product acceptance gates, waves, and preflight | `product-acceptance-and-execution-plan.md` |

The canonical rule catalog enumerating every admitted rule ID lives in [`tables/rule-catalog.yaml`](tables/rule-catalog.yaml).

## Canonical Surface Summary

- `GET /api/me/agents` is the Studio canonical owner my-agents portfolio list surface.
- `GET /api/me/agents/{agentId}` is the Studio canonical owner my-agents detail surface.
- `POST /api/agent` / `AgentsService.agentControllerCreate` is the Studio owner-scoped Realm Agent create surface.
- `GET /api/agent/handles/check` / `AgentsService.agentControllerCheckHandle` is the Studio create preflight handle availability surface; it writes no truth and must not replace Realm create confirmation.
- `GET/PATCH /api/me/agents/{agentId}/settings` is the Studio owner-scoped settings read/write surface; the write surface compiles owner-reviewed structured settings into Realm profile writes and versioned `AgentRule` truth writes and is not raw `AgentRule` CRUD.
- `POST /api/agent/accounts/{id}/avatar` / `AgentsService.agentControllerSelectAvatar` is the Studio owner-scoped avatar URL selection surface; it is not a Resource/Binding upload path.
- `GET/PATCH /api/agent/accounts/{id}/visibility` are owner-scoped social visibility setting surfaces; they must not be mapped into a Realm Agent lifecycle or publication state machine.
- `GET /api/creator/agents`, `/api/agent/forge-imported-system/**`, and `GET /api/agent/dev/my-agents` belong outside Realm Agent Studio and must not become owner portfolio surfaces.
- Top-level `friendCount` is the only admitted first-version owner-visible metric field.

## Kernel Document Read Order

1. `core-rules.md` — cross-cutting authority and posture invariants.
2. `product-scope.md`
3. `realm-agent-object.md`
4. `agent-setting-field-map.md`
5. `asset-and-binding.md`
6. `post-publishing.md`
7. `runtime-ai-consumption.md`
8. `metrics-and-realm-gaps.md`
9. `failure-semantics.md`
10. `storybook.md`
11. `product-acceptance-and-execution-plan.md`

## Kernel Tables

- [`tables/rule-catalog.yaml`](tables/rule-catalog.yaml) — full enumerated registry of every `R-RAS-*` rule with level, title, statement, and source kernel doc. `table_family: support_registry`. Implementation guards and machine checks must reference IDs in this catalog.

## Authority Inputs

Active inputs absorbed into the kernel above (not parallel authority):

- `.nimi/topics/ongoing/2026-05-21-realm-agent-studio-product-flow-storybook/product-document.md`
- `.nimi/topics/ongoing/2026-05-21-realm-agent-studio-product-flow-storybook/user-storybook-detailed.md`
- `.nimi/topics/ongoing/2026-05-21-realm-agent-studio-product-flow-storybook/topic.yaml`
- `.nimi/spec/realm/kernel/truth-contract.md`
- `.nimi/spec/realm/kernel/feed-contract.md`
- `.nimi/spec/realm/kernel/attachment-contract.md`
- `.nimi/spec/realm/kernel/resource-contract.md`
- `.nimi/spec/realm/kernel/asset-contract.md`
- `.nimi/spec/realm/kernel/binding-contract.md`
- `.nimi/spec/realm/kernel/social-contract.md`
- `.nimi/spec/runtime/kernel/tables/capability-vocabulary-mapping.yaml`
- `.nimi/spec/runtime/kernel/rpc-surface.md`
- `sdk/src/runtime/types-media.ts`
- `sdk/src/realm/generated/schema.ts` as current generated DTO evidence only.

## Desktop Runtime Caller Authority

Realm Agent Studio's standalone Tauri shell uses a fixed Nimi local first-party
Runtime account caller:

| Field | Value |
| --- | --- |
| `appId` | `nimi.realm-agent-studio` |
| `appInstanceId` | `nimi.realm-agent-studio.local-first-party` |
| `deviceId` | `local-first-party-device` |
| `mode` | `ACCOUNT_CALLER_MODE_LOCAL_FIRST_PARTY_APP` |

Runtime owns account session, app-session metadata, and mediated Realm unary
invocation. Studio must not call first-party account-control or raw-token
surfaces directly, and must not expose app-owned Realm token custody.

## Hard Boundaries

- This spec tree must not create app-local shadow truth. Every public success state must resolve to Realm, Runtime, or SDK authority owned outside this app spec.
- Implementation must use `nimi-kit` as the visible interaction system and `@nimiplatform/sdk` for Realm/Runtime access. App code must not use app-local REST bypasses, hardcoded provider/model routing, or app-owned long-lived auth token storage.
- `pnpm dev:realm:agent:studio` is the valid desktop development entry. It must not fall back to browser/Vite acceptance, app-local session tokens, fake Runtime sessions, or Desktop host impersonation.

## Source Drift

Any topic wording that implies removing Post world attachment is source drift and is not admitted here. Current Realm Feed authority says Post truth is world-attached and carries `worldId` (`.nimi/spec/realm/kernel/feed-contract.md:47` to `:54`). The correct Realm Agent Studio product boundary is that creator UX does not expose a selected post destination world, and Create Post must not accept caller-owned `worldId`; Realm server authority resolves `worldId` from author context (`.nimi/spec/realm/kernel/feed-contract.md:107` to `:118`).
