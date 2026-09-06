/**
 * Seed / refresh the MongoDB cards collection from JSON decks.
 *
 * Usage (from repo root, with .env.local loaded):
 *   npx tsx --env-file=.env.local scripts/seed-cards.ts
 *   npx tsx --env-file=.env.local scripts/seed-cards.ts --force
 *   npx tsx --env-file=.env.local scripts/seed-cards.ts --summaries-only
  *
 * Without --force, only inserts when the collection is empty.
 * With --force, upserts every JSON card field (keeps stable _id values).
  * With --summaries-only, updates only summary + updatedAt (preserves user Q/A edits).
 * Prefer: npm run sync:summaries
 */
import { forceSeedCards, seedCardsIfEmpty, syncSummariesFromJson } from '../src/lib/cards-db'

async function main() {
  const force = process.argv.includes('--force')
  const summariesOnly = process.argv.includes('--summaries-only')

  if (summariesOnly) {
    const result = await syncSummariesFromJson()
    console.log(
      'Synced summaries: matched=' +
        result.matched +
        ' modified=' +
        result.modified +
        ' upserted=' +
        result.upserted,
    )
    process.exit(0)
  }

  const count = force ? await forceSeedCards() : await seedCardsIfEmpty()
  console.log(force ? `Upserted ${count} cards` : count ? `Seeded ${count} cards` : 'Cards already present; nothing to seed')
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
