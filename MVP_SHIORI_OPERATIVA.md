# Shiori Operativa MVP

## Goal

Add a first operational reading layer on top of Shiori bookmarks without duplicating storage or creating a parallel backend.

## Smallest Safe Extension Point

Use the existing bookmark list plus existing bookmark tags as the workflow state.

- Shiori remains the source of truth for links.
- Operational intent lives in tags already supported by the product.
- The current webapp Inbox is the narrowest place to surface "what should I read today?" without introducing new persistence.

## MVP Slice

Implement a lightweight workflow on top of existing bookmarks:

- Use tags such as `leer-hoy`, `rapido`, `foco`, and `inspiracion`.
- Add a small Inbox reading panel that highlights `leer-hoy`.
- Add a URL-driven filter in the Inbox so the user can switch between all bookmarks and each workflow tag.
- Add a lightweight search field in Inbox so the shortlist remains usable when the list grows.
- Allow toggling the operational tags directly from the Inbox items instead of forcing a separate admin flow.
- Keep archive behavior unchanged by excluding archived bookmarks from the operational view.

## Why This Shape

- No schema changes.
- No second store.
- No background syncing logic.
- Visible value in one session: the user can mark a few bookmarks with `leer-hoy` and immediately get a shortlist.

## Non-Goals For This MVP

- No scheduling engine.
- No scoring or ranking model.
- No duplicated "reading queue" table.
- No major navigation or information architecture changes.

## Status

- Implemented on top of the existing legacy `/api/bookmarks` endpoint and bookmark tags.
- No schema changes and no extra persistence introduced.
- Inbox now acts as the operational layer: shortlist, workflow filters, quick tag toggles, and lightweight search.

## How To Use

1. Open Inbox (`/bookmarks`).
2. Mark a few items with `leer-hoy`, `rapido`, `foco`, or `inspiracion`.
3. Use the top filter chips to switch context.
4. Use the search box to reduce the visible set without leaving Inbox.
