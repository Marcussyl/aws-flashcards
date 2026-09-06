/**
 * Update ONLY summary ( + updatedAt) for existing card docs from JSON.
 * Leaves question/answer and other fields unchanged.
 *
 * Usage:
 *   npm run sync:summaries
  *   npx tsx --env-file=.env.local scripts/sync-summaries.ts
 *
 * API (preview/Vercel):
  *   POST /api/cards  {"summariesOnly": true}
 */
import { syncSummariesFromJson } from '../src/lib/cards-db'

async function main() {
  const result = await syncSummariesFromJson()
  console.log("Synced summaries: matched=" + result.matched + " modified=" + result.modified + " upserted=" + result.upserted)
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
