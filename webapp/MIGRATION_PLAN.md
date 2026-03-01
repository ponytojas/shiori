# Webapp Frontend Migration Plan (Vue ➜ React)

## Goal
Establish a new frontend foundation for Shiori using **React + Vite + TypeScript + Tailwind CSS + shadcn/ui** with an **orange accent theme**, while preserving a clean path to reusing the existing generated API client (`src/client`).

## Scope for this foundation phase
1. Replace Vue app shell with React app shell.
2. Keep Vite-based build and static output behavior compatible with existing backend embedding flow.
3. Add Tailwind CSS and initialize shadcn/ui base primitives.
4. Define orange-centric design tokens in CSS variables.
5. Create initial page shells for:
   - Bookmarks list
   - Add bookmark form
   - Archive view
   - Settings
6. Ensure `npm run build` succeeds.

## Architecture decisions
- **Router**: `react-router-dom` with a shared `AppLayout`.
- **State/API strategy** (future):
  - Keep generated API client in `src/client`.
  - Add thin service hooks later (e.g., `src/services/*`) to avoid coupling UI directly to generated models.
- **UI system**:
  - Tailwind utility classes for layout/spacing.
  - shadcn/ui components for reusable controls and consistent styling.
  - Tokenized colors via `:root` + `.dark` CSS variables.

## Migration sequencing
1. Update dependencies and Vite config for React.
2. Replace Vue entrypoint and app files with React equivalents.
3. Add Tailwind config + PostCSS + base styles.
4. Add shadcn/ui config files and shared utility (`cn`).
5. Build first-page shells and navigation.
6. Validate production build.

## Out of scope (later iterations)
- Full feature parity with Vue screens.
- API data fetching and mutation wiring.
- Auth/session migration behavior.
- i18n migration.
- Unit/e2e tests.

## Next implementation steps
- Wire bookmarks list to `/bookmarks` API endpoint.
- Wire add-bookmark form submit to create endpoint.
- Add archive filter/search interactions.
- Implement settings persistence.
- Introduce query/cache layer (TanStack Query) if desired.
