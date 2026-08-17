import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { ProgressMap } from '@/data/types'

export const progressFilePath = path.join(process.cwd(), 'data', 'progress.json')

export async function readProgressFile(): Promise<ProgressMap> {
  try {
    const raw = await fs.readFile(progressFilePath, 'utf8')
    const parsed = JSON.parse(raw) as ProgressMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export async function writeProgressFile(map: ProgressMap) {
  await fs.mkdir(path.dirname(progressFilePath), { recursive: true })
  await fs.writeFile(
    progressFilePath,
    `${JSON.stringify(map, null, 2)}\n`,
    'utf8',
  )
}
