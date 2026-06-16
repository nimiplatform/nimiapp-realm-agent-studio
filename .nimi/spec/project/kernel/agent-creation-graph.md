---
id: SPEC-REALM-AGENT-STUDIO-AGENT-CREATION-GRAPH-001
title: Agent Creation Graph
status: active
owner: "@team"
updated: 2026-06-16
---

# Agent Creation Graph

Agent Creation Graph is the Studio-owned candidate and review model for intelligent Realm Agent creation and maintenance. It turns owner descriptions, downloaded CharacterCard files, and existing owner Realm Agents into reviewed write plans. It is not Realm truth.

## Graph Authority

- `R-RAS-GRAPH-001` Agent Creation Graph is an owner-reviewed candidate workspace; it is not Realm Agent truth, Runtime truth, LocalAgent memory, Forge provenance, or a substitute for an admitted Realm write result.
- `R-RAS-GRAPH-002` Agent Creation Graph is the canonical Studio model for AI-assisted creation and maintenance flows; description seed, CharacterCard import, existing-agent remix, avatar/profile-cover generation, and post generation must flow through the graph before any public write.
- `R-RAS-GRAPH-003` Every graph instance must carry `sourcePackage`, `normalizedGraph`, `reviewState`, `writePlan`, and `provenance` sections before the owner can submit an admitted Realm action.
- `R-RAS-GRAPH-004` Admitted graph source modes are owner description, downloaded local CharacterCard, existing current-owner Realm Agent detail/settings/public media, and manual advanced entry.
- `R-RAS-GRAPH-005` Direct third-party URL fetching, remote Chub.ai import, remote package scraping, and background network enrichment are not admitted until this spec adds an explicit source, copyright, and network policy.
- `R-RAS-GRAPH-006` The graph must preserve original source fields and source type as local evidence visible to the owner; Studio must not hide source loss, inferred mapping, or rejected material behind a successful AI draft.
- `R-RAS-GRAPH-007` Source parsing must classify each source field as `mapped`, `candidateOnly`, `unmapped`, or `rejected`; unclassified source fields are a graph failure state.

## Source Ingestion

- `R-RAS-GRAPH-008` CharacterCard import admits downloaded local JSON files and downloaded local PNG files with supported embedded card metadata only after parser validation succeeds.
- `R-RAS-GRAPH-009` CharacterCard mapping must show the owner how source fields map into Studio graph sections and must keep unmapped fields visible as review notes.
- `R-RAS-GRAPH-010` Imported source material cannot bypass owner review, handle preflight, world selection, Realm create response validation, or admitted settings write validation.
- `R-RAS-GRAPH-011` Existing-agent remix may use only current-authenticated-user owner detail, admitted owner settings projection, public media URLs, and local candidate lineage.
- `R-RAS-GRAPH-012` Existing-agent remix must not mutate the source agent, copy private state, copy LocalAgent runtime state, or claim the source agent's Realm truth as a new agent's truth.
- `R-RAS-GRAPH-013` Owner description seed must generate a complete graph with explicit missing decisions; a flat prefilled form is insufficient when required graph sections remain absent.

## Runtime AI Boundary

- `R-RAS-GRAPH-014` Runtime may assist graph drafting only from owner-provided or owner-approved source context that is visible in the current graph.
- `R-RAS-GRAPH-015` Runtime graph output must be strict structured candidate data; malformed, partial, untyped, or unverifiable output fails closed and cannot populate hidden write fields.
- `R-RAS-GRAPH-016` Graph sections must include identity, DNA/archetype, behavior, worldview, greeting, communication voice, content voice, visual brief, voice brief, post brief, source provenance, missing decisions, risk notes, and write plan.
- `R-RAS-GRAPH-017` The write plan must map each accepted graph field to an admitted Realm Studio write path or mark it `blocked` / `deferred` with the governing rule ID.
- `R-RAS-GRAPH-018` The graph must not introduce provider/model routing, lifecycle state, ownerId override, hidden worldId override, raw AgentRule content, private memory, or unreviewed rule JSON into create or update payloads.
- `R-RAS-GRAPH-019` The owner must review and accept every writeable graph section before Studio can call create, settings update, asset selection, or post publishing actions derived from the graph.

## Truth And Write Semantics

- `R-RAS-GRAPH-020` Graph acceptance is not Realm create success, settings success, asset publication success, avatar selection success, or post publish success.
- `R-RAS-GRAPH-021` Realm Agent creation derived from a graph still succeeds only through `POST /api/agent` / `AgentsService.agentControllerCreate` and only after the canonical response contains an id.
- `R-RAS-GRAPH-022` After graph-derived creation succeeds, Studio must route the owner to an Agent Cockpit for maintenance actions instead of treating creation as a terminal success screen.
- `R-RAS-GRAPH-023` Agent Cockpit consumes source-backed agent status, admitted owner settings projection, public media, local candidates, and graph lineage; it must not consume private LocalAgent memory or runtime transcript state.
- `R-RAS-GRAPH-024` Identity Studio candidates for avatar, profile cover, voice, and visual profile remain local candidates until the relevant admitted Realm/Runtime operation succeeds.
- `R-RAS-GRAPH-025` Content Studio post variants derived from the graph or current agent remain local candidates until human review and Realm publish success.
- `R-RAS-GRAPH-026` Maintenance suggestions must be source-backed by current agent state, graph lineage, owner-visible gaps, or owner-provided prompts; Studio must not invent urgent work from unavailable metrics.

## Failure And Audit

- `R-RAS-GRAPH-027` Graph flows must expose named failure states for source import unavailable, source parse failed, graph invalid, required mapping incomplete, review missing, route unbound, unsupported CharacterCard shape, and unauthorized Runtime source transmission.
- `R-RAS-GRAPH-028` Source content must not be transmitted to Runtime unless the owner explicitly triggers generation, rewrite, or normalization for the visible graph.
- `R-RAS-GRAPH-029` Technical source previews may be placed behind disclosure controls, but the primary product surface must show user-level mapping, unresolved decisions, and blocked writes in plain owner-facing language.
- `R-RAS-GRAPH-030` Implementation tests, design audits, and closeout notes for intelligent creation or maintenance must cite `R-RAS-GRAPH-*` IDs and prove the candidate/truth boundary.
