/**
 * Seed / refresh the MongoDB `cards` collection from JSON decks.
 *
 * Usage (from repo root, with .env.local loaded):
 *   npx tsx --env-file=.env.local scripts/seed-cards.ts
 *   npx tsx --env-file=.env.local scripts/seed-cards.ts --force
 *
 * Without --force, only inserts when the collection is empty.
 * With --force, upserts every JSON card (keeps stable _id values).
 */
import { forceSeedCards, seedCardsIfEmpty } from '../src/lib/cards-db'

async function main() {
  const force = process.argv.includes('--force')
  const count = force ? await forceSeedCards() : await seedCardsIfEmpty()
  console.log(force ? `Upserted ${count} cards` : count ? `Seeded ${count} cards` : 'Cards already present; nothing to seed')
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
