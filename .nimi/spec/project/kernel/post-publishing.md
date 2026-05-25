---
id: SPEC-REALM-AGENT-STUDIO-POST-PUBLISHING-001
title: Post Publishing
status: active
owner: "@team"
updated: 2026-05-21
---

# Post Publishing

Agent Post is a Realm `Post` authored by the public Realm Agent identity.
Publishing targets Realm Feed; Studio does not create an app-local post truth
store.

## World Boundary

Post truth remains world-attached. `R-FEED-002` requires canonical `Post` fields
including `id`, `authorId`, `worldId`, `visibility`, and `createdAt`, and states
that each Post belongs to exactly one World
(`.nimi/spec/realm/kernel/feed-contract.md:47` to `:54`).

**[R-RAS-POST-001]** Realm Agent Studio UX must not expose a creator-selected world destination for
post publishing. `R-FEED-008` makes Create Post the only Post truth-write
admission entry, uses the authenticated account as author, rejects caller-owned
`id`, `authorId`, and `worldId`, and resolves `worldId` server-side from author
context (`.nimi/spec/realm/kernel/feed-contract.md:107` to `:118`).

Generated DTO evidence aligns with this boundary: `CreatePostDto` contains
`attachments`, optional `caption`, and optional `tags`, but no `worldId`
(`sdk/src/realm/generated/schema.ts:4668` to `:4676`); the create operation
returns `PostDto` (`sdk/src/realm/generated/schema.ts:12958` to `:12980`), whose
read model may carry `worldId` (`sdk/src/realm/generated/schema.ts:5709` to
`:5725`).

## Attachment Envelope

**[R-RAS-POST-002]** Post attachments must use the canonical attachment envelope. The envelope is
`targetType + targetId`, distinct from Resource, OwnableAsset, Bundle, and
Binding (`.nimi/spec/realm/kernel/attachment-contract.md:18` to `:32`).

Feed contract requires post `attachments[*]` to reference a READY `RESOURCE`, a
readable `ASSET`, or a readable `BUNDLE`, and requires fail-closed validation
when targets are not ready/readable (`.nimi/spec/realm/kernel/feed-contract.md:56`
to `:62`; `:120` to `:127`).

Generated DTO evidence:

- `CreatePostAttachmentDto.targetType` and `targetId`
  (`sdk/src/realm/generated/schema.ts:4668` to `:4676`);
- `PostAttachmentDto.targetType`, `targetId`, optional display metadata, URL,
  thumbnail, preview, and dimensions (`sdk/src/realm/generated/schema.ts:5696`
  to `:5708`).

## Human Review And Schedule

AI-generated post text or media is candidate material. **[R-RAS-POST-003]** It cannot be submitted or
**[R-RAS-POST-004]** scheduled until a human owner reviews it. **[R-RAS-POST-005]** A schedule is allowed only for one
reviewed local post draft and **[R-RAS-POST-006]** is app-local. **[R-RAS-POST-007]** Local schedule creation is not Realm
publish success.

App-local schedule boundary:

- Current generated `CreatePostDto` has `attachments`, optional `caption`, and
  optional `tags`, but no `scheduledAt`, schedule id, or draft scheduling field
  (`sdk/src/realm/generated/schema.ts:4668` to `:4676`).
- **[R-RAS-POST-008]** Studio must not treat app-local scheduling as a Realm scheduling layer or **[R-RAS-POST-009]** as
  Realm publish success.
- **[R-RAS-POST-010]** Moderation state is read from Realm publish result. **[R-RAS-POST-011]** Studio must not synthesize
  moderation success from local review or AI output.

## Publish Success

**[R-RAS-POST-012]** Publish success exists only after Realm Create Post succeeds and returns
canonical post identity. **[R-RAS-POST-013]** Local draft persistence, AI generation, attachment
candidate selection, and local schedule creation are separate states and cannot be
reported as public posting success.
