# Copilot instructions (code-challenge-app)

## Project snapshot
- Front-end only React app built with **Vite**.
- Routing is handled with **react-router-dom**; routes are declared in `src/App.jsx` and the app is bootstrapped in `src/main.jsx`.
- UI is currently **static** (no API layer/state management yet). Most pages render markup + classNames and share the same navbar structure.

## Layout & routing conventions
- Pages live in `src/pages/` and are imported in `src/App.jsx`.
  - Example routes: `/challenges` → `src/pages/Challenges.jsx`, `/challenges/:id` → `src/pages/ChallengeDetail.jsx`, `/login` → `src/pages/Login.jsx`.
- Keep new screens as page components in `src/pages/*` and wire them up in `src/App.jsx` using `<Route path=... element={<Page/>} />`.
- Prefer `Link` from `react-router-dom` for navigation (see `src/pages/Login.jsx`).

## Styling conventions
- Global/shared styles are applied by importing `src/styles/global.css` inside pages (e.g. `Login.jsx`, `Challenges.jsx`).
- Page-specific styles live next to the page as `src/pages/<Page>.css` and are imported by that page (e.g. `Challenges.jsx` → `Challenges.css`).
- Keep class names consistent with existing structure:
  - Top-level wrapper: `page-container`
  - Navbar: `navbar`, `logo`, `nav-links`, `btn`

## Code style & linting
- ESLint is configured via `eslint.config.js` (flat config). JS/JSX only.
- `no-unused-vars` ignores variables matching `^[A-Z_]` (useful for intentionally-unused React component args/constants).

## Developer workflows (verified in `package.json`)
- Dev server: `npm run dev`
- Production build: `npm run build`
- Lint: `npm run lint`
- Preview build: `npm run preview`

## When adding behavior (common patterns to follow)
- Keep components as simple function components (no classes). Current pages don’t use hooks yet; introduce hooks minimally and locally.
- If you need to make the `:id` route dynamic in `ChallengeDetail`, use `useParams()` from `react-router-dom` and keep the route path as `/challenges/:id` (already defined in `src/App.jsx`).

## Files to read first
- `src/main.jsx` (app entry)
- `src/App.jsx` (route map)
- `src/pages/*` (page implementations)
- `src/styles/global.css` + page CSS files for UI conventions