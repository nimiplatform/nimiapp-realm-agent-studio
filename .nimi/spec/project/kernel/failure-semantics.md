---
id: SPEC-REALM-AGENT-STUDIO-FAILURE-SEMANTICS-001
title: Failure Semantics
status: active
owner: "@team"
updated: 2026-05-21
---

# Failure Semantics

Failures are first-class product states. Studio must name the failed surface or
capability and preserve valid draft/candidate state without projecting success.

## Required Failure States

- **[R-RAS-FAIL-001]** Realm unavailable.
- **[R-RAS-FAIL-002]** Permission missing.
- **[R-RAS-FAIL-003]** Owner-created authority missing.
- **[R-RAS-FAIL-004]** World-list read surface unavailable.
- **[R-RAS-FAIL-005]** Selected world basic-setting read unavailable.
- **[R-RAS-FAIL-006]** Agent creation rejected.
- **[R-RAS-FAIL-007]** Setting read unavailable.
- **[R-RAS-FAIL-008]** Setting update rejected.
- **[R-RAS-FAIL-009]** Rule-shaped AI output invalid or malformed.
- **[R-RAS-FAIL-010]** Runtime capability unavailable.
- **[R-RAS-FAIL-011]** Image/video/audio generation failed.
- **[R-RAS-FAIL-012]** Local asset history unavailable.
- **[R-RAS-FAIL-013]** Resource upload/finalize failed.
- **[R-RAS-FAIL-014]** Public asset write failed.
- **[R-RAS-FAIL-015]** Binding validation failed.
- **[R-RAS-FAIL-016]** Attachment validation failed.
- **[R-RAS-FAIL-017]** Moderation pending.
- **[R-RAS-FAIL-018]** Moderation rejected.
- **[R-RAS-FAIL-019]** Publish failed.
- **[R-RAS-FAIL-020]** App-local schedule unavailable or failed.
- **[R-RAS-FAIL-021]** `friendCount` / 好友数 source unavailable.
- **[R-RAS-FAIL-022]** Metric source unavailable.

## Success Rules

- **[R-RAS-FAIL-023]** Local draft saved is not Realm creation success.
- **[R-RAS-FAIL-024]** AI generation complete is not public asset success.
- **[R-RAS-FAIL-025]** Candidate selected is not active public asset success.
- **[R-RAS-FAIL-026]** Local schedule created is not public post success.
- **[R-RAS-FAIL-027]** Attachment preview resolved is not attachment persistence success.
- **[R-RAS-FAIL-028]** Runtime output accepted is not Realm truth until the admitted Realm write
  succeeds.
- **[R-RAS-FAIL-029]** Unavailable count is not zero.

## Fail-Closed Requirements

**[R-RAS-FAIL-030]** Studio must fail closed when:

- **[R-RAS-FAIL-031]** owner authority cannot be proven;
- **[R-RAS-FAIL-032]** a field does not have an admitted write owner;
- **[R-RAS-FAIL-033]** an attachment target is missing, not READY, unreadable, or unauthorized;
- **[R-RAS-FAIL-034]** a binding combination is undeclared;
- **[R-RAS-FAIL-035]** AI output cannot be mapped to visible owner-reviewed fields;
- **[R-RAS-FAIL-036]** Runtime asks for private LocalAgent state;
- **[R-RAS-FAIL-037]** Realm rejects a create, update, publish, asset, or binding write.

**[R-RAS-FAIL-038]** No placeholder success, fake return, synthesized moderation success, or
renderer-local truth can satisfy these states.
