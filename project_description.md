# AWS Cert Flashcards

## Overview

A Next.js study app that turns personal AWS certification notes into flip-style memory cards. The source material is the Notion export `random notes 35199f70bc56802a8800fbb944e0c856.html`, collected while preparing for the AWS Solutions Architect Associate exam.

The app is for private revision: short exam-style questions on the front, condensed notes on the back, with optional full original explanations. Progress is stored as one MongoDB document and read/written through `GET`/`PUT /api/progress`.

## Goals

- Review weak AWS topics faster than rereading a long notes page.
- Group related facts so a session can focus on one domain (IAM, VPC, S3, etc.).
- Keep question wording closer to exam English, including paraphrases of typos and informal notes.
- Fill a small set of originally empty answers with accurate exam-oriented explanations.

## Content pipeline

1. Parse Notion `<details>/<summary>` toggles from the HTML export.
2. Skip empty "错题" markers that are not real questions.
3. Deduplicate near-identical prompts (for example Macie, LDAP, IAM Identity Center, SAM) and keep the richer answer.
4. Paraphrase many questions into clearer exam-style English. Original wording is stored as `sourceQuestion`.
5. Assign each card to one study category using service keywords.
6. Write `src/data/cards.json` for the app to load.
7. Copy referenced Notion images into `public/notes/` and attach them as `images` on matching cards.

Empty notes that were completed during import include S3 storage-class waterfall, SQS polling/timeouts/retention, SWF, S3 event-notification delivery semantics, EC2 billing by instance state, Athena performance, RDS Multi-AZ vs Multi-Region vs replicas, IGW vs VGW, and Standard vs FIFO SQS.

## Categories

Cards are grouped by topic rather than only by the four SAA exam domains (secure, resilient, high-performing, cost-optimized). Those four domains still appear as an exam-fundamentals card.

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

Expect roughly 360+ cards after cleanup. The deck now includes notes added after the 18/08/2026 marker on the Notion page. Counts shift if notes are re-imported.

## Product features

- Home dashboard with category tiles and known / learning / unseen counts.
- Study mode: flip cards, shuffle, filter by category, or study only due cards. Category and due sessions skip known cards until every card in that set is known.
- Keyboard: Space to flip, arrows to move, `1` still learning, `2` I know this.
- Card back shows a short summary first, with a toggle for the full note.
- Browse + search across paraphrased questions and original notes.
- Progress is written to MongoDB (`progress` collection) and can be reset from the home page.

## Tech stack

- Next.js App Router (TypeScript)
- React client components for study/browse interactions
- Tailwind CSS
- Static JSON card deck (`src/data/cards.json`)
- MongoDB progress document through `GET`/`PUT /api/progress`

## Data model

Each card in `src/data/cards.json`:

- `id`: stable local id such as `c001`
- `category`: one of the topics above
- `question`: paraphrased or cleaned prompt
- `summary`: short back-of-card text
- `answer`: full explanation from notes (or a filled-in answer)
- `sourceQuestion`: original toggle title from the HTML notes
- `images`: optional list of `/notes/...` screenshot paths shown on the card back

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

From `aws-flashcards/`:

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
aws-flashcards/
  project_description.md
  .env.example             # MONGODB_URI template
  data/progress.json       # legacy local file, migrated once into MongoDB
  public/notes/            # screenshots from the original notes
  src/app/                 # routes: /, /study, /browse, /api/progress
  src/components/          # home, study, browse, flip card
  src/data/cards.json      # imported deck
  src/data/categories.ts   # topic metadata
  src/lib/mongo.ts         # MongoDB client
  src/lib/progress.ts      # client progress hook
  src/lib/progress-db.ts   # reads/writes the progress document
  src/lib/progress-file.ts # one-time file migration helper
```

## Out of scope (unless requested later)

- User accounts or sharing decks (progress is one MongoDB document)
- Spaced-repetition algorithm (SM-2 / Anki)
- Importing new Notion exports from the UI
- Official AWS practice-exam scoring
- Multiplayer or sharing decks

## Suggested next steps

- Add a "wrong questions" tag for items marked 错题 in the original notes.
- Re-import when the Notion page grows.
- Optional Anki-style intervals if daily review becomes a habit.
