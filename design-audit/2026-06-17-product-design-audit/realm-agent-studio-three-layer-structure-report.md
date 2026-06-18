# Realm Agent Studio Three-Layer Structure Report

Date: 2026-06-17

## 1. Product Design Conclusion

Realm Agent Studio should not present its full complexity inside a 3D HUD. The right structure is:

1. Spatial Overview: communicate system shape, status, and workflow topology.
2. Docked Workbench: support high-density, precise form editing.
3. Review Gate: prove candidate, owner review, admitted write path, and failure boundaries before any public success claim.

This keeps the product future-facing and immersive without turning complex owner operations into unreadable decoration. The 3D layer is not the form. It is the spatial command surface that routes the owner into exact workbenches.

## 2. Authority And Existing Product Surfaces

Realm Agent Studio is scoped to current-user owner-created public Realm Agents. It is not a generic agent management center, LocalAgent runtime console, Forge-imported system curation tool, or world NPC backend.

Current app routes already imply the product surface model:

| Route | Product surface | Structural role |
| --- | --- | --- |
| `/portfolio` | Owner portfolio | Spatial Overview entry and portfolio scan |
| `/portfolio/create` | Agent creation | Docked Workbench plus Review Gate |
| `/portfolio/:agentId` | Agent cockpit/detail | Spatial Overview for one agent |
| `/portfolio/:agentId/settings` | Settings read/edit | Docked Workbench |
| `/portfolio/:agentId/settings/review` | Settings proposal/review | Review Gate |
| `/portfolio/:agentId/assets` | Identity/media/voice candidates | Docked Workbench plus candidate history |
| `/portfolio/:agentId/posts` | Agent-authored post drafting/publish | Docked Workbench plus Review Gate |
| `/portfolio/:agentId/posts/schedule` | Single local schedule | Docked Workbench; app-local only |
| `/portfolio/:agentId/insights` | Source-backed insights | Spatial Overview metric surface |
| `/ai-config` | Runtime AI route configuration | Capability/control surface |

## 3. Current Field And Capability Inventory

### 3.1 Portfolio Fields

Portfolio list currently normalizes:

| Field | Meaning | Source posture | UI layer |
| --- | --- | --- | --- |
| `id` | Realm Agent/user projection id | Realm source-backed | Overview/detail |
| `displayName` | Public display name | Realm source-backed | Overview + Workbench |
| `handle` | Public handle | Realm source-backed | Overview + Workbench |
| `coverUrl` / `profileCoverUrl` | Public cover read projection | Read projection; owner write blocked for cover | Overview/detail |
| `avatarUrl` | Avatar read/write URL selection surface | Avatar URL selection admitted after owner review | Overview + Assets Workbench |
| `ownerScope` | `owner-created` | Must stay current-user owner-created | Overview boundary badge |
| `realmState` | Realm state evidence | Read evidence only; not Studio lifecycle | Overview status |
| `worldName` / world evidence | World attachment/read evidence | Realm source-backed | Overview + Create Workbench |
| `updatedAt` | Last update evidence | Read evidence | Overview sorting |
| `friendCount` | First-version metric | Only source-backed when present; unavailable is not zero | Overview metric |

Portfolio controls currently include query, filter, and sort. `friendCount` filter supports available/unavailable states. This is exactly where the 3D overview can be useful: it can show portfolio topology and health without exposing editable fields.

### 3.2 Agent Creation Fields

Creation draft fields currently include:

| Field | Role | Required for Realm create? | Layer |
| --- | --- | --- | --- |
| `handle` | Public handle | Yes, with handle availability preflight | Workbench + Review Gate |
| `displayName` | Public identity | Yes | Workbench + Review Gate |
| `concept` | Creation concept/worldview seed | Yes | Workbench + Graph |
| `description` | Public profile text | Optional create/update | Workbench |
| `ruleText` | Visible behavior rules candidate | Optional create rules; not raw owner default | Advanced/review only |
| `selectedWorldId` | Required Realm world id | Yes, source-backed by world list | Workbench + Review Gate |
| `dnaPrimary` | Required archetype | Yes | Workbench |
| `dnaSecondary` | Optional traits | Optional | Workbench |
| `referenceImageUrl` | Reviewed visual reference URL | Optional; not public asset truth | Identity candidate lane |
| `originalDescription` | Owner seed text | Client-only; not submitted to Realm | Graph/source evidence |

DNA currently admits these primary archetypes: `CARING`, `PLAYFUL`, `INTELLECTUAL`, `CONFIDENT`, `MYSTERIOUS`, `ROMANTIC`.

Secondary traits currently admit: `HUMOROUS`, `SARCASTIC`, `GENTLE`, `DIRECT`, `OPTIMISTIC`, `REALISTIC`, `DRAMATIC`, `PASSIONATE`, `REBELLIOUS`, `INNOCENT`, `WISE`, `ECCENTRIC`. Recommended max is 3.

Creation readiness must fail closed when handle, display name, concept, selected world, `dnaPrimary`, source-backed world evidence, or current handle availability check is missing.

### 3.3 Agent Creation Graph Sections

The Agent Creation Graph is the right model for "complexity without chaos". Existing graph sections are:

| Graph section | Purpose | Suggested UI treatment |
| --- | --- | --- |
| `identity` | display name, handle, profile description | Workbench form group |
| `dna` | primary archetype, secondary traits | Workbench selection group |
| `behavior` | visible behavior notes/rules candidate | Advanced review group |
| `worldview` | concept anchor | Workbench text group |
| `greeting` | follow-up settings candidate | Deferred lane |
| `communicationVoice` | inferred communication style | Candidate lane |
| `contentVoice` | post-studio voice | Candidate lane |
| `visualBrief` | avatar/profile cover visual brief | Identity Studio lane |
| `voiceBrief` | voice demo brief | Identity Studio lane |
| `postBrief` | first post ideas | Content/Post Studio lane |
| `sourceProvenance` | owner description/manual/card/remix evidence | Source drawer |
| `missingDecisions` | unresolved product decisions | Review Gate checklist |
| `riskNotes` | forbidden/private/unadmitted fields | Review Gate warning rail |
| `writePlan` | admitted create/update/candidate/deferred actions | Review Gate payload map |

This graph should not be rendered as a giant editable graph full of input fields. The graph should act as a structured navigation and review index. Detailed editing belongs in the docked workbench.

### 3.4 Owner Settings Fields

Owner settings draft currently includes:

| Group | Fields |
| --- | --- |
| Identity | `displayName`, `description`, `greeting`, `publicRole`, `worldview` |
| Natural language | `naturalLanguageIntent` |
| Personality | `personalitySummary`, `relationshipMode`, `interestsText`, `goalsText` |
| Communication | `contentStyle`, `formality`, `responseLength`, `sentiment` |
| Boundaries | `allowedThemesText`, `disallowedThemesText` |
| Positioning | `targetAudience`, `positioning` |
| Expert/review only | `rawRuleTextCandidate` |

Settings update input maps those fields into:

- top-level `displayName`, `description`, `greeting`, `naturalLanguageIntent`;
- `identity.publicRole`, `identity.worldview`;
- `personality.summary`, `personality.relationshipMode`, `personality.interests`, `personality.goals`;
- `communication.contentStyle`, `communication.formality`, `communication.responseLength`, `communication.sentiment`;
- `boundaries.allowedThemes`, `boundaries.disallowedThemes`;
- `positioning.targetAudience`, `positioning.positioning`.

Forbidden owner settings keys include `handle`, `worldId`, `avatarUrl`, `profileCoverUrl`, `provider`, `model`, `localAgent`, `lifecycle`, `state`, `dna`, `agentRule`, `agentRules`, and `ruleText`.

This field count is why a 3D HUD cannot be the editing surface. Settings must be a dense but stable workbench: left section index, center editor, right proposal/diff/validation rail.

### 3.5 Identity, Media, And Voice Candidate Fields

Identity pack can derive candidate prompts from source-backed current-agent fields:

| Candidate | Current status | Public write posture |
| --- | --- | --- |
| `avatar` | candidate-only | Avatar URL selection admitted after owner URL review |
| `profile-cover` | candidate-only | Owner-scoped profile cover write blocked |
| `portrait-reference` | candidate-only | Resource-to-Agent Binding blocked |
| `post-image-style` | candidate-only | Post attachment candidate only |
| `voice-demo` | candidate-only | Voice publication blocked |

Media candidate inputs:

| Candidate type | Fields |
| --- | --- |
| Visual image | `resourceType`, `bindingPoint`, `prompt`, `notes`, `aspectRatio` |
| Avatar package | visual image fields plus `packageTarget`, `motionNotes`, `interactionNotes` |
| Voice demo | `scriptText` |

Admitted candidate constants:

- Resource types: `IMAGE`, `VIDEO`, `AUDIO`; visual generation currently normalizes to `IMAGE`.
- Binding points: `AGENT_AVATAR`, `AGENT_PORTRAIT`, `AGENT_CANDIDATE`, `AGENT_VOICE_SAMPLE`.
- Avatar package targets: `SPRITE2D`, `LIVE2D`, `VRM`.

The UI should treat this as an Identity Studio with four states: source context, generation request, candidate output, publication boundary. Public asset truth cannot be implied from Runtime generation.

### 3.6 Post And Schedule Fields

Local post draft fields:

| Field | Purpose | Boundary |
| --- | --- | --- |
| `caption` | Realm post caption | Required for publishable draft |
| `tagsText` | comma-separated tags | Candidate until publish |
| `humanReviewed` | owner review confirmation | Required before publish/schedule |
| `attachmentEnabled` | attachment toggle | Candidate |
| `attachmentTargetType` | `RESOURCE`, `ASSET`, or `BUNDLE` | Must be canonical envelope type |
| `attachmentTargetId` | target id | Required when attachment is enabled |

Post candidate payload includes:

- `candidate: true`;
- source `realm-agent-studio.local-post-draft`;
- agent reference from canonical owner detail;
- `realmCreatePost.attachments`;
- optional `caption`;
- optional `tags`;
- `review.humanReviewed: true`.

Forbidden post payload keys include `worldId`, `id`, `authorId`, `scheduledAt`, `scheduleId`, `queue`, `campaign`, `recurrence`, `publicSuccess`, `publishSuccess`, `moderationSuccess`, `provider`, `modelResolved`, and LocalAgent fields.

Local schedule fields:

| Field | Purpose | Boundary |
| --- | --- | --- |
| `localDate` | local date | app-local |
| `localTime` | local time | app-local |
| `localRunAt` | normalized local run time | app-local |
| `appLocalOnly` | explicit boundary | must remain true |
| `execution.mode` | foreground when due | not Realm queue |
| `realmPublish` | pending owner app open | not publish success |

This belongs in a Post Studio workbench, not a 3D orbit panel. The spatial layer can show "one local schedule exists" or "post publish gate blocked", but editing caption/tags/attachments must be 2D.

## 4. Proposed Three-Layer Product Structure

### 4.1 Layer 1: Spatial Overview

Purpose: make the product understandable at system level.

This layer should show:

- portfolio constellation: each owner-created public Realm Agent as a node;
- current agent identity core;
- graph completeness rings: identity, DNA, worldview, media, voice, post;
- review status: candidate, reviewed, write-ready, blocked, deferred;
- only admitted high-level metrics: `friendCount` available/unavailable;
- failure states as first-class signals: Realm unavailable, permission missing, route unbound, source unavailable.

This layer should not show:

- long text inputs;
- raw JSON payloads;
- full settings fields;
- attachment IDs;
- raw rule content;
- LocalAgent runtime state;
- provider/model routing details except in AI config context.

Recommended visual components:

- Agent identity core.
- Orbiting module rails: Portfolio, Creation Graph, Settings, Identity Studio, Post Studio, Metrics.
- Status ribbons: `source-backed`, `candidate-only`, `owner-review-required`, `Realm-write-required`, `blocked`.
- Spatial breadcrumbs into workbench sections.

### 4.2 Layer 2: Docked Workbench

Purpose: allow precise high-density editing without losing context.

The workbench should be a stable 2D product surface. It can float inside a 3D scene, but the editable controls must behave like serious software.

Recommended layout:

| Area | Role |
| --- | --- |
| Left rail | Graph/field group navigation and completion state |
| Center canvas | Actual form fields, inputs, selects, uploads, textareas |
| Right rail | AI proposal, validation, source evidence, write plan preview |
| Bottom/action rail | Save draft, generate candidate, review, submit to Realm |

Workbench modules:

1. Create Workbench
   - Identity: handle, display name, description.
   - Concept/worldview: concept, original description.
   - World: source-backed list, OASIS default, selected-world preview.
   - DNA: primary archetype, secondary traits.
   - Behavior: visible behavior notes/rule lines as advanced candidate.
   - Visual reference: reference image URL and generation prompt.

2. Settings Workbench
   - Natural-language intent.
   - Identity/public role/worldview.
   - Personality/interests/goals.
   - Communication style/formality/length/sentiment.
   - Boundaries allowed/disallowed themes.
   - Target audience/positioning.
   - Raw rule candidate as deferred expert review only.

3. Identity Studio Workbench
   - Build identity pack from source-backed fields.
   - Generate visual image candidates.
   - Generate avatar package design sheet.
   - Upload reviewed identity image Resource.
   - Select reviewed avatar URL.
   - Synthesize voice demo.
   - Local creative history with `publicTruth: false`.

4. Post Studio Workbench
   - Draft caption and tags.
   - Optional attachment envelope target.
   - Runtime post copy proposal.
   - Human review checkbox.
   - Publish through Realm create post.
   - Single local schedule as app-local candidate.

5. Insights Workbench
   - `friendCount` only when source-backed.
   - Source unavailable state instead of zero.
   - No trend, post performance, profile views, reactions, revenue, or health score.

### 4.3 Layer 3: Review Gate

Purpose: prevent false success and make truth boundaries visible.

Every material workflow needs a Review Gate before public claims:

| Workflow | Candidate state | Review requirement | Public success condition |
| --- | --- | --- | --- |
| Create Agent | draft + graph | owner accepts required graph sections | Realm create returns canonical object with `id` |
| Settings update | draft/proposal | owner-reviewed changed fields | owner settings update succeeds through admitted path |
| Avatar URL | URL draft | owner-reviewed valid URL | avatar select call confirms success |
| Visual image | Runtime image artifact | owner review | no public profile truth unless admitted write path exists |
| Avatar package | design sheet/rigging brief | owner review | not published; future artifacts required |
| Voice demo | Runtime audio artifact | owner review | not public voice truth unless admitted path exists |
| Post | local post draft | human reviewed | Realm `PostsService.createPost` returns canonical post id |
| Schedule | reviewed local post candidate | local date/time future | app-local schedule only; not Realm publish |
| Metric | read projection | source present | show value; absent means source unavailable |

Review Gate UI should include:

- `What will be written`: exact admitted target.
- `What will remain local`: candidates, drafts, local history.
- `What is blocked`: owner binding, profile cover write, raw rule review, unready attachment.
- `What source backs this`: Realm service, Runtime capability, local-only store.
- `Forbidden fields detected`: lifecycle, provider/model, LocalAgent, worldId for post, etc.
- `Failure recovery`: preserve draft/candidate and name failed source.

## 5. How This Solves The "Many Fields In A 3D Website" Problem

The mistake would be to make the 3D hero carry the form. That would create visual noise, poor accessibility, poor keyboard behavior, unreadable generated content, and a toy-like control surface.

The product-grade solution is progressive density:

1. 3D layer shows shape and state.
2. User selects a module.
3. The module opens a docked workbench with real controls.
4. AI helps fill candidate fields but never hides the source.
5. Review Gate explains what becomes Realm truth and what remains candidate/local.
6. Spatial Overview updates after canonical results return.

This lets the site be visually impressive while the core work remains exact.

## 6. Recommended Information Architecture For The Website / Demo

If this is implemented as a promotional or concept website, the first scroll experience should be:

### Section A: Spatial Command Entry

- Headline: `Realm Agent Studio`.
- Subline: `Operate public Realm Agents as durable Agent IP`.
- 3D identity core with six orbit modules.
- Minimal chips: `Owner-created`, `Candidate-first`, `Realm truth`, `Fail-closed`.

### Section B: From Overview To Workbench

Show the transition from 3D module to docked workbench. Use Creation Graph as the first example because it explains the whole product.

### Section C: Create Workbench

Show dense fields in groups:

- Identity.
- World.
- DNA.
- Behavior.
- Visual reference.
- Write plan.

The point is to prove the product can handle real form complexity.

### Section D: Owner Settings Review

Show AI proposal as candidate patch:

- current field;
- proposed value;
- changed key;
- owner accept/reject;
- forbidden field warning;
- raw rule review deferred.

### Section E: Identity Studio

Show candidate generation and blocked publication truth:

- avatar candidate;
- profile cover candidate blocked;
- portrait/reference candidate blocked;
- voice demo candidate;
- local history `publicTruth: false`.

### Section F: Post Studio And Schedule

Show:

- caption/tags/attachment envelope;
- human review required;
- Realm publish result required;
- single local schedule as foreground-only local candidate.

### Section G: Source-Backed Metrics

Show:

- `friendCount` if present;
- source unavailable if absent;
- no invented zero, trend, performance, or health score.

## 7. Component-Level Recommendations

### Spatial Overview Components

- Agent Node: avatar/initial, display name, handle, source state.
- Completeness Ring: graph sections ready/needs decision/blocked.
- Truth Path: candidate -> owner review -> admitted write -> Realm confirmation.
- Source Badge: Realm, Runtime, app-local.
- Failure Beacon: typed failure state.

### Workbench Components

- Section Navigator with counts: required, optional, candidate, blocked.
- Field Row with source posture: editable, source-backed read-only, deferred, blocked.
- Proposal Diff: current/proposed/changed keys/rationale.
- Evidence Drawer: service source, payload preview, rule ids.
- JSON Technical Preview behind disclosure, never primary.
- Sticky Action Rail: Save Draft, Generate Candidate, Review, Submit.

### Review Gate Components

- Submit Target Card: `POST /api/agent`, `PATCH /api/me/agents/{agentId}/settings`, `PostsService.createPost`, etc.
- Candidate Ledger: local draft, Runtime artifact, local history, app-local schedule.
- Blocked Writes Ledger: profile cover owner write, Resource-to-Agent Binding, voice publication, raw rule read.
- Forbidden Field Detector: visible list with exact field names.
- Success Contract: canonical object/id required.

## 8. Design Rules For The 3D Direction

1. Never render full forms as floating HUD fragments.
2. Use 3D for navigation, topology, state, and transition.
3. Use 2D for text entry, validation, payload review, uploads, and decisions.
4. Keep spatial panels abstract until selected.
5. Put all long-form editing in stable workbench panels.
6. Treat source unavailable as visible state, not hidden fallback.
7. Make blocked/deferred states visually first-class.
8. Keep candidate and public truth visually distinct.
9. Do not expose LocalAgent private runtime, private memory, or chat transcript.
10. Do not imply Realm publication unless the admitted Realm operation succeeded.

## 9. Recommended Next Design Artifact

The next useful artifact is not another pure hero render. It should be a composite screen:

- left 35 percent: light 3D Spatial Overview, with current agent and module map;
- right 65 percent: Docked Create Workbench, showing real grouped fields;
- bottom/right rail: Review Gate summary with write plan and blocked/deferred lanes.

This artifact would prove the actual design answer to the form-density problem: immersive environment plus exact industrial-grade editing.

## 10. Implementation Implications

For a future coded prototype:

- The 3D scene should be a shell around real React controls, not a replacement for controls.
- Workbench panels should use the existing `@nimiplatform/kit` interaction system.
- Three.js can own the spatial background, module nodes, and transitions.
- React owns every field, form state, diff, validation, and review action.
- Runtime-generated images should be assets, not CSS/SVG stand-ins.
- Text in generated hero art must be replaced by real DOM text.
- Keyboard/focus behavior belongs to the 2D workbench layer.
- The review gate should be coded as structured data, not visual-only copy.

## 11. Summary

Realm Agent Studio can be visually immersive without losing product rigor if the architecture is explicit:

- Spatial Overview: show product topology and source-backed state.
- Docked Workbench: edit complex fields precisely.
- Review Gate: prove owner review, admitted write path, and truth boundary.

This is the structure that lets Realm Agent Studio feel like a future industrial product instead of a decorative 3D dashboard.
