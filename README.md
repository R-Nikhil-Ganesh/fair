# FairLend AI

FairLend AI is a Next.js dashboard for auditing fairness in lending decisions.
Users can sign in with Google, upload CSV data, run a fairness audit workflow, and review disparity findings with AI-generated summaries and mitigation recommendations.

## Tech Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Firebase (Auth, Firestore, Storage)
- Papa Parse (CSV parsing)
- Recharts (visualization)
- Lucide React (icons)
- ESLint

## Current Status

### Implemented

- Landing page and dashboard UI shell
- Google login via Firebase Auth
- Route protection and redirect logic
- New audit flow:
	- CSV upload
	- auto-detect CSV headers
	- protected attribute and target column selection
	- audit record persisted to Firestore
- Audit history list with search
- Audit details page with:
	- approval-rate chart by group
	- flagged/pass indicators
	- summary and recommendations sections

### Mocked/Placeholder

- Vertex AI fairness evaluation logic is mocked
- Gemini summary/recommendation generation is mocked
- Settings save action is currently UI-only
- Export PDF action is currently UI-only
- Employment/Insurance modes are marked "Coming Soon"

## Project Structure

- `src/app/` - App Router pages and layouts
- `src/lib/firebase.ts` - Firebase client setup
- `src/lib/AuthContext.tsx` - auth state + route guard/redirect logic
- `src/lib/ai.ts` - placeholder AI/fairness functions
- `src/lib/types.ts` - shared audit/disparity types

## Prerequisites

- Node.js 20+
- npm
- A Firebase project with:
	- Google Auth provider enabled
	- Firestore database created

## Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Run Locally

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

Open http://localhost:3000

## Production Build

```bash
npm run build
npm run start
```

## Scripts

- `npm run dev` - start local dev server
- `npm run build` - create production build
- `npm run start` - run production server
- `npm run lint` - run ESLint

## Notes

- This repository currently demonstrates product flow and dashboard UX with mocked AI internals.
- Replacing `src/lib/ai.ts` with real Vertex/Gemini calls is the main step to move from prototype to production.
