# Memori

## Overview

A Next.js study app for private flip-card review across more than one subject. The first deck is personal AWS Solutions Architect notes (from the Notion export `random notes 35199f70bc56802a8800fbb944e0c856.html`). A Proxmox VE deck sits beside it so the same UI can review other topics.

Short questions on the front, a condensed summary on the back, then an optional full note. Card decks live in MongoDB (`cards` collection, one document per card) and can be edited in the study/browse UI. Progress lives in the `progress` collection as **one document per card** (keyed by `userId` + `cardId`), exposed via `GET`/`PUT`/`PATCH /api/progress`. Card ids stay unique across topics (`c001` for AWS, `pve001` for PVE), so existing progress keeps working.

## Goals

- Review more than one subject without mixing decks.
- Drill weak cards faster than rereading a long notes page.
- Group related facts so a session can focus on one category inside a topic.
- Keep AWS question wording close to exam English.
- Edit question / summary / answer (markdown) in-app; cards live in MongoDB only (no JSON seed).

## Topics

| Topic id | What it covers |
| --- | --- |
| `aws` | AWS Solutions Architect notes, 360+ cards after cleanup |
| `pve` | Proxmox VE seed cards: unprivileged LXC, UID mapping, LXC vs QEMU, Linux bridge |

Progress reset on a dashboard clears only that topic's card ids.

## Routes

- `/` topic library
- `/[topic]` dashboard with known / learning / unseen counts and category tiles
- `/[topic]/study` flip session (`category`, `mode=due|learning|known`)
- `/[topic]/browse` search inside that topic

## AWS content pipeline (historical)

The AWS deck was originally built offline from a Notion HTML export:

1. Parse Notion `<details>/<summary>` toggles from the HTML export.
2. Skip empty "错题" markers that are not real questions.
3. Deduplicate near-identical prompts and keep the richer answer.
4. Paraphrase many questions into clearer exam-style English. Original wording is stored as `sourceQuestion`.
5. Assign each card to one study category using service keywords.
6. Load cards into MongoDB (stable ids such as `c001`). Runtime no longer reads JSON seed files.
7. Copy referenced Notion images into `public/notes/` and attach them as `images` on matching cards.

## AWS categories

Cards are grouped by service area rather than only by the four SAA exam domains.

| Category | What it covers |
| --- | --- |
| Exam & Architecture | SAA domains, Well-Architected, RPO/RTO, Trusted Advisor |
| IAM & Federation | IAM, STS, Identity Center, SAML/OIDC/OAuth, Directory Service, Cognito |
| Networking & Hybrid | VPC, endpoints, Direct Connect, VPN, TGW, SG/NACL, ENI/ENA/EFA |
| Compute & Scaling | EC2, Auto Scaling, Lambda, AMI, placement groups, SSM |
| Storage & Transfer | S3, EBS, EFS, FSx, Glacier, DataSync, Storage Gateway |
| Databases | RDS, Aurora, DynamoDB, DMS, replicas, Multi-AZ |
| CDN, DNS & Load Balancing | CloudFront, Route 53, ALB/NLB/GWLB, signed URLs |
| Security & Encryption | WAF, Shield, GuardDuty, Macie, KMS, Object Lock |
| Integration & Messaging | SQS, SNS, EventBridge, Step Functions, SWF, Kinesis |
| Containers & Kubernetes | ECS, EKS, Fargate, IRSA, HPA/VPA |
| Analytics & AI | Glue, Athena, EMR, Spark, Bedrock, SageMaker |
| Monitoring & Operations | CloudWatch, CloudTrail, Enhanced Monitoring, SAM |
| Cost, Governance & Multi-Account | Organizations, Control Tower, SCP, RAM, Cost Explorer |
| Migration & DR | MGN, DRS, Discovery, Migration Hub |

## PVE categories

| Category | What it covers |
| --- | --- |
| Containers (LXC) | Unprivileged vs privileged, UID mapping, nesting, bind mounts |
| Virtual Machines | When QEMU/KVM is the better fit |
| Networking | Linux bridge / vmbr |

## How to add another topic

Preferred (runtime, no redeploy of taxonomy): open `/admin` and create a topic (slug, name, emoji, tagline, blurb, accent hex) plus categories. Routes `/[topic]/...` use the Mongo topic id string.

Optional code seed for taxonomy only (not cards):

1. Add seed metadata in `src/data/topics.ts` (and optional `[data-topic]` fallback in `globals.css`).
2. Add seed categories in `src/data/categories.ts`.
3. Create cards in the UI or via `POST /api/cards` — they are stored in MongoDB only. Taxonomy collections still auto-seed from the TS files when empty.

## Product features

- Topic library with per-deck known / learning / unseen counts.
- Topic dashboard with category tiles and a topic-scoped reset.
- Study mode: flip cards, shuffle, filter by category, or study only due cards. Category and due sessions skip known cards until every card in that set is known.
- Keyboard: Space to flip, arrows to move, `1` still learning, `2` I know this.
- Card back shows a short summary first, with a toggle for the rest of the note.
- Browse + search inside the current topic.
- Topic switcher in the header.
- Progress is written to MongoDB (`progress` collection).
- Cards stored in MongoDB with pencil-icon editing (markdown textarea + preview)
- Delete card (browse trash + edit modal confirm)
- Admin taxonomy UI at `/admin` (topics/categories CRUD, rename, merge)
- Dynamic topic accents via CSS variables from Mongo

## Tech stack

- Next.js App Router (TypeScript)
- React client components for study/browse interactions
- Tailwind CSS
- MongoDB cards collection (source of truth; no JSON card seed) + per-card progress APIs

## Data model

### Topics & categories (Mongo)

- `topics` collection: `_id` (slug), `name`, `emoji`, `tagline`, `blurb`, `accent`, `accentFg`, timestamps. Seeded from `src/data/topics.ts`.
- `categories` collection: `_id` (`{topic}__{slug}`), `topic`, `name`, `emoji`, `blurb`, timestamps. Seeded from `src/data/categories.ts`. Unique on `{topic, name}`.
- Rename category updates the category doc and all cards in that topic with the old name.
- Merge moves cards source→target then deletes the source category.
- Safe deletes refuse topics/categories that still have cards (or leftover categories on a topic).
- APIs: `/api/topics`, `/api/topics/[id]`, `/api/categories`, `/api/categories/[id]`, `/api/categories/[id]/merge`.
- Cards: `DELETE /api/cards/[id]`.


Each card:

- `id`: stable local id such as `c001` or `pve001` (Mongo _id uses the same string)
- `topic`: topic id string such as `aws` or `pve`
- `category`: one of the categories for that topic
- `question`: paraphrased or cleaned prompt
- `summary`: short back-of-card text
- `answer`: full explanation
- `sourceQuestion`: original prompt from notes
- `images`: optional list of `/notes/...` paths (no image binaries in Mongo)

MongoDB cards docs also store createdAt/updatedAt. Indexes: unique _id; {topic:1, category:1}; text on question+sourceQuestion+answer. Cards live in Mongo only — there is no JSON seed/fallback. An empty collection returns an empty deck (`[]` / `null`), not an auto-seed.

Progress in MongoDB collection `progress` — **one document per card** (collection name unchanged):

```json
{ "userId": "local", "cardId": "c001", "status": "known", "seen": 3, "updatedAt": "..." }
```

- `userId`: `"local"` until real auth lands
- `cardId`: stable card id
- `status`: `unseen` | `learning` | `known`
- `seen`: how many times the card was rated
- `updatedAt`: ISO timestamp of the last write
- Unique index: `{ userId: 1, cardId: 1 }`

`GET /api/progress` still returns a `ProgressMap` (`cardId → { status, seen }`) for the client. `PATCH` upserts one card; `PUT` bulk-syncs the whole map (used for reset).

On first load, `migrateLegacyDefaultDocIfNeeded` expands any legacy mega-doc (`_id: "default"` with a nested `cards` map) into per-card upserts for `userId: "local"`, then deletes the legacy doc. If neither legacy nor per-card docs exist and `data/progress.json` still has data, that file is copied in once. An older browser `localStorage` copy is also migrated once if the API map is empty.

## How to run

1. Create a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) M0 cluster.
2. Add a database user, then allow your IP (and `0.0.0.0/0` if you will deploy to Vercel).
3. Copy `.env.example` to `.env.local` and paste the connection string into `MONGODB_URI`.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The first progress load will seed MongoDB from `data/progress.json` if that file still has data.

```bash
npm run build
npm start
```

On Vercel, set the same `MONGODB_URI` (and optional `MONGODB_DB`) environment variables.

## Project layout

```text
recall/
  project_description.md
  .env.example             # MONGODB_URI template
  data/progress.json       # legacy local file, migrated once into MongoDB
  public/notes/            # screenshots from the original AWS notes
  src/app/                 # pages + /api/cards + /api/progress
  src/components/          # library, dashboard, study, browse, flip card
  src/data/topics.ts       # topic metadata (taxonomy seed)
  src/data/categories.ts   # categories per topic (taxonomy seed)
  src/lib/mongo.ts         # MongoDB client
  src/lib/cards-db.ts      # cards collection CRUD; listCardMeta for dashboards
  src/lib/cards.ts         # shuffle / count helpers
  src/lib/progress.ts      # ProgressProvider + useProgress (one shared client load)
  src/lib/progress-db.ts   # per-card progress CRUD + legacy mega-doc migration
  src/lib/progress-file.ts # one-time file migration helper
```

## Out of scope (unless requested later)

- Full WYSIWYG editor (markdown textarea + preview is supported)
- Topic metadata editor
- User accounts or sharing decks (progress uses `userId: "local"` until auth)
- Spaced-repetition algorithm (SM-2 / Anki)
- Importing new Notion exports from the UI
- Official AWS practice-exam scoring
- Multiplayer or sharing decks

## Suggested next steps

- Grow the PVE deck as notes accumulate.
- Add a "wrong questions" tag for items marked 错题 in the original AWS notes.
- Re-import when the Notion page grows.
- Optional Anki-style intervals if daily review becomes a habit.
