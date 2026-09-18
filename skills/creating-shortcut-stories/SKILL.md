---
name: creating-shortcut-stories
description: Draft a Shortcut story in the user's preferred lightweight format. Use when asked to write, draft, or generate a Shortcut story/ticket, or to turn a change/task into something copyable into Shortcut.
---

# Creating Shortcut Stories

When drafting a Shortcut story for the user, keep it short. This is a ticket, not a spec — the code (or the
architecture/design doc it came from) is the source of truth for detail.

## Format

Exactly these sections, in this order. Skip `Implementation Details` if there's nothing worth pointing at.

### `## Overview`
The context needed to understand *why* this exists — background, what prompted it, what's broken or missing
today. Prose, a few sentences. Not a restatement of the acceptance criteria.

### `## Acceptance Criteria`
A bullet list, **declarative** — each bullet describes a fact that will be true of the finished state ("X does
Y", "A entry exists when B happens"). Never imperative ("do X", "implement Y", "add a check for Z") and never a
step-by-step TODO checklist — that belongs in code-design docs or the implementation plan, not the ticket.

### `## Implementation Details` (optional)
At most a few sentences. Points at a general approach or the area of the codebase involved — enough to orient
whoever picks it up. Not a design doc: no interfaces, no step sequence, no code.

## Rules
- Don't invent Shortcut fields (story type, points, labels) unless asked — just give title + the three sections
  as plain text the user can paste into the description field.
- If there's a parent epic, name it (e.g. `Epic: sc-674799 — <title>`) once, near the top — don't thread epic
  context through every section.

## Example

**Title:** Write InventoryLedger entries from the inventory mutation helper

```
## Overview
The inventory mutation helper is the single path
for writing on-hand-affecting inventory changes. It doesn't write InventoryLedger audit entries
today — only user-triggered inventory writes (CSV/on-hand imports, manual edits, order-edit
restock) do, and each hand-rolls its own ledger entry after calling the helper. Every automatic
order transition (out-for-delivery, delivery return, completion, cancel, unroute, reset) currently
has zero audit trail.

## Acceptance Criteria
- Every inventory-changing transition routed through the mutation helper has a corresponding
  InventoryLedger entry.
- A transition that touches a bucket but doesn't change on-hand (e.g. delivery completion from
  out-for-delivery) does not produce a ledger entry.
- Ledger entries are attributed to the acting user when one is known, and to the system user
  otherwise.
- Reason codes used by these new entries are excluded from the NetSuite inventory-adjustment sync,
  consistent with existing order-adjustment reason codes.
- Existing order-edit restock-adjustment ledger behavior is unchanged.

## Implementation Details
Centralize ledger-writing inside the mutation helper itself, keyed on whether the net inventory
change is non-zero, reusing the existing actor-resolution fallback.
```
