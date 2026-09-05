# Memori

## Overview

A Next.js study app for private flip-card review across more than one subject. The first deck is personal AWS Solutions Architect notes (from the Notion export `random notes 35199f70bc56802a8800fbb944e0c856.html`). A small Proxmox VE seed deck sits beside it so the same UI can review other topics.

Short questions on the front, a condensed summary on the back, then an optional full note. Progress is stored as one MongoDB document and read/written through `GET`/`PUT /api/progress`. Card ids stay unique across topics (`c001` for AWS, `pve001` for PVE), so existing AWS progress keeps working.

## Goals

- Review more than one subject without mixing decks.
- Drill weak cards faster than rereading a long notes page.
- Group related facts so a session can focus on one category inside a topic.
- Keep AWS question wording close to exam English.
- Add later topics by editing JSON, not by shipping an editor.

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
- `/study` and `/browse` redirect to `/aws/study` and `/aws/browse`

## AWS content pipeline

1. Parse Notion `<details>/<summary>` toggles from the HTML export.
2. Skip empty "错题" markers that are not real questions.
3. Deduplicate near-identical prompts and keep the richer answer.
4. Paraphrase many questions into clearer exam-style English. Original wording is stored as `sourceQuestion`.
5. Assign each card to one study category using service keywords.
6. Write `src/data/cards.json`. The loader stamps `topic: "aws"` at runtime so that file does not need a full rewrite.
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

## PVE seed categories

| Category | What it covers |
| --- | --- |
| Containers (LXC) | Unprivileged vs privileged, UID mapping, nesting, bind mounts |
| Virtual Machines | When QEMU/KVM is the better fit |
| Networking | Linux bridge / vmbr |

## How to add another topic

There is no in-app editor. To add a subject:

1. Add an id and accent in `src/data/topics.ts` and `src/app/globals.css` (`[data-topic='...']`).
2. Add categories in `src/data/categories.ts`.
3. Add a JSON file of cards (`topic`, unique `id`, `category`, `question`, `summary`, `answer`, `sourceQuestion`).
4. Import and concat that file in `src/lib/cards.ts`.

## Product features

- Topic library with per-deck known / learning / unseen counts.
- Topic dashboard with category tiles and a topic-scoped reset.
- Study mode: flip cards, shuffle, filter by category, or study only due cards. Category and due sessions skip known cards until every card in that set is known.
- Keyboard: Space to flip, arrows to move, `1` still learning, `2` I know this.
- Card back shows a short summary first, with a toggle for the rest of the note.
- Browse + search inside the current topic.
- Topic switcher in the header.
- Progress is written to MongoDB (`progress` collection).

## Tech stack

- Next.js App Router (TypeScript)
- React client components for study/browse interactions
- Tailwind CSS
- Static JSON decks (`src/data/cards.json`, `src/data/pve-cards.json`)
- MongoDB progress document through `GET`/`PUT /api/progress`

## Data model

Each card:

- `id`: stable local id such as `c001` or `pve001`
- `topic`: `aws` or `pve` (AWS cards get this at load time)
- `category`: one of the categories for that topic
- `question`: paraphrased or cleaned prompt
- `summary`: short back-of-card text
- `answer`: full explanation
- `sourceQuestion`: original prompt from notes
- `images`: optional list of `/notes/...` screenshot paths

Progress document in MongoDB collection `progress` (`_id: "default"`):

- `cards`: map of card id → `{ status, seen }`
- `status`: `unseen` | `learning` | `known`
- `seen`: how many times the card was rated
- `updatedAt`: ISO timestamp of the last write

If MongoDB has no cards yet and `data/progress.json` still has local data, the API copies that file into MongoDB once. An older browser `localStorage` copy is also migrated once if the database document is empty.

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
memori/
  project_description.md
  .env.example             # MONGODB_URI template
  data/progress.json       # legacy local file, migrated once into MongoDB
  public/notes/            # screenshots from the original AWS notes
  src/app/                 # /, /[topic], /[topic]/study, /[topic]/browse, /api/progress
  src/components/          # library, dashboard, study, browse, flip card
  src/data/cards.json      # AWS deck (topic stamped at load)
  src/data/pve-cards.json  # Proxmox seed deck
  src/data/topics.ts       # topic metadata
  src/data/categories.ts   # categories per topic
  src/lib/mongo.ts         # MongoDB client
  src/lib/progress.ts      # client progress hook
  src/lib/progress-db.ts   # reads/writes the progress document
  src/lib/progress-file.ts # one-time file migration helper
```

## Out of scope (unless requested later)

- In-app card or topic editor
- User accounts or sharing decks (progress is one MongoDB document)
- Spaced-repetition algorithm (SM-2 / Anki)
- Importing new Notion exports from the UI
- Official AWS practice-exam scoring
- Multiplayer or sharing decks

## Suggested next steps

- Grow the PVE deck as notes accumulate.
- Add a "wrong questions" tag for items marked 错题 in the original AWS notes.
- Re-import when the Notion page grows.
- Optional Anki-style intervals if daily review becomes a habit.
