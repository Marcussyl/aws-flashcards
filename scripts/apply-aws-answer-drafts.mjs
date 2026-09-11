#!/usr/bin/env node
/**
 * Apply data/aws-answer-drafts.json answers to production Mongo via PATCH.
 * DO NOT run until drafts are reviewed on a Vercel preview deployment.
 *
 * Usage:
 *   node scripts/apply-aws-answer-drafts.mjs [--dry-run] [--limit N] [--ids c001,c016]
 *
 * Env:
 *   CARDS_API_BASE  default https://aws-flashcards-eosin.vercel.app
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const draftsPath = join(root, 'data', 'aws-answer-drafts.json')

const BASE = (process.env.CARDS_API_BASE || 'https://aws-flashcards-eosin.vercel.app').replace(
  /\/$/,
  '',
)

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const limitIdx = args.indexOf('--limit')
const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : Infinity
const idsIdx = args.indexOf('--ids')
const onlyIds = idsIdx >= 0 ? new Set(args[idsIdx + 1].split(',').map((s) => s.trim()).filter(Boolean)) : null

const drafts = JSON.parse(readFileSync(draftsPath, 'utf8'))
let entries = Object.entries(drafts).filter(([, v]) => v && typeof v.answer === 'string')
if (onlyIds) {
  entries = entries.filter(([id]) => onlyIds.has(id))
}
entries.sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
if (Number.isFinite(limit)) {
  entries = entries.slice(0, limit)
}

console.log(`Applying ${entries.length} draft answers to ${BASE}/api/cards/:id`)
if (dryRun) console.log('DRY RUN — no PATCH requests will be sent')

let ok = 0
let fail = 0
for (const [id, entry] of entries) {
  const url = `${BASE}/api/cards/${encodeURIComponent(id)}`
  if (dryRun) {
    console.log(`[dry-run] PATCH ${url} answer_len=${entry.answer.length} rewritten=${!!entry.rewritten}`)
    ok += 1
    continue
  }
  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ answer: entry.answer }),
    })
    if (!res.ok) {
      const body = await res.text()
      console.error(`FAIL ${id} ${res.status} ${body.slice(0, 200)}`)
      fail += 1
      continue
    }
    ok += 1
    if (ok % 25 === 0) console.log(`… ${ok}/${entries.length}`)
  } catch (err) {
    console.error(`FAIL ${id}`, err)
    fail += 1
  }
}

console.log(`Done. ok=${ok} fail=${fail}`)
if (fail > 0) process.exitCode = 1
