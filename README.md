# Branchbook

Branchbook is a no-account collaborative family tree app built with Next.js, TypeScript, Tailwind CSS, Prisma, and PostgreSQL.

The product model is link-based instead of account-based:

- `owner` link: full control, moderation, rollback, reactivation
- `contributor` link: create and edit people, claim profiles, suggest structure
- `viewer` link: read-only access
- `personal` link: edit only the claimed profile

## Features

- Private-by-default family trees with stable URLs and secure share tokens
- Anonymous browser-local editor identities using `localStorage`
- Profile claim flow with personal recovery codes and personal edit links
- Rich person profiles with photos, life events, notes, occupations, quotes, and more
- Parent, child, spouse, sibling, adopted, step, and foster relationships
- Clear, readable family diagram with guided starter spaces for brand-new trees
- Owner recovery link surfaced in the product so the tree creator can regain full control later
- Moderation queue for structural edits
- Edit history with rollback for supported changes
- Archive-after-24-months behavior with owner/admin reactivation
- Seeded demo data for a ready-to-explore sample tree

## Stack

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Prisma 7
- PostgreSQL
- Vercel-ready frontend with Supabase/Postgres-friendly backend setup

## Environment

Copy `.env.example` to `.env` and adjust values:

```bash
cp .env.example .env
```

Required values:

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_APP_URL`

## Scripts

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Other useful scripts:

- `npm run lint`
- `npm run build`
- `npm run vercel-build`
- `npm run db:migrate:deploy`
- `npx tsc --noEmit`

## Folder Structure

```text
.
├── prisma
│   ├── schema.prisma
│   └── seed.ts
├── src
│   ├── app
│   │   ├── api
│   │   │   └── trees
│   │   │       └── [slug]
│   │   ├── tree
│   │   │   └── [slug]
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components
│   │   ├── tree
│   │   └── ui
│   ├── lib
│   │   ├── client
│   │   ├── server
│   │   └── shared
│   └── types
├── prisma.config.ts
└── package.json
```

## Prisma Models

- `FamilyTree`
- `EditorIdentity`
- `Person`
- `Relationship`
- `Media`
- `EditHistory`
- `ClaimRecovery`

## API Routes

- `POST /api/trees`
- `GET /api/trees/[slug]`
- `POST /api/trees/[slug]/identity`
- `POST /api/trees/[slug]/people`
- `PATCH /api/trees/[slug]/people/[personId]`
- `DELETE /api/trees/[slug]/people/[personId]`
- `POST /api/trees/[slug]/relationships`
- `PATCH /api/trees/[slug]/relationships/[relationshipId]`
- `DELETE /api/trees/[slug]/relationships/[relationshipId]`
- `POST /api/trees/[slug]/claim`
- `POST /api/trees/[slug]/claim/recover`
- `POST /api/trees/[slug]/media`
- `POST /api/trees/[slug]/moderation/[relationshipId]`
- `POST /api/trees/[slug]/rollback`
- `POST /api/trees/[slug]/reactivate`

## Seeded Demo

The seed creates a sample `hawthorne-family` tree with:

- multiple generations
- active and pending relationships
- claimed profile state
- media entries
- history data
- console output for owner, contributor, viewer, and personal links

Run it with:

```bash
npm run db:seed
```

## Vercel Deployment

This repo is configured for Vercel with a checked-in [vercel.json](/Users/jakealessi/Documents/FamilyTree/vercel.json) and a dedicated production build command:

```bash
npm run vercel-build
```

That command runs:

1. `prisma migrate deploy`
2. `prisma generate`
3. `next build --webpack`

### Recommended database setup

Supabase Postgres is the easiest path.

- `DATABASE_URL`: use your runtime/serverless connection string
- `DIRECT_URL`: use your direct Postgres connection string for Prisma admin tasks

If you are using Supabase, their current guidance is:

- transaction mode pooler for serverless runtime traffic
- direct connection for admin and migration tasks

### Vercel project settings

- Framework preset: `Next.js`
- Build command: `npm run vercel-build`
- Install command: `npm install`

### Required environment variables in Vercel

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_APP_URL`

### Important production note

Do not run `npm run db:seed` against production. The demo seed clears seeded records before inserting sample family data.

## Deployment Notes

- Vercel works well for the Next.js frontend and API routes.
- Supabase Postgres is a natural fit for the database.
- For production file uploads, set `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_STORAGE_BUCKET` so media files go to Supabase Storage instead of inline demo storage.
- If you do not configure production storage yet, pasted external image URLs will still work, but direct file uploads should be treated as incomplete setup.
- The current build script uses webpack because Turbopack hit a sandbox-specific CSS worker limitation during local verification here.
