# Branchbook

Branchbook is a no-account collaborative family tree app built with Next.js, TypeScript, Tailwind CSS, Prisma, PostgreSQL, and React Flow.

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
- Artistic tree view plus classic readable diagram mode
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
- React Flow via `@xyflow/react`
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
- `ADMIN_RECOVERY_TOKEN`
- `MAX_UPLOAD_SIZE_BYTES`

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

## Deployment Notes

- Vercel works well for the Next.js frontend and API routes.
- Supabase Postgres is a natural fit for the database.
- For production media storage, swap the demo data-URL uploader for Supabase Storage, Vercel Blob, or S3.
- The current build script uses webpack because Turbopack hit a sandbox-specific CSS worker limitation during local verification here.
