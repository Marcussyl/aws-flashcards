/** Minimal GFM table parser for Comparison blocks. */

export type GfmTable = {
  headers: string[]
  rows: string[][]
}

function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return trimmed.split('|').map((cell) => cell.trim())
}

function isSeparatorRow(line: string): boolean {
  const cells = splitRow(line)
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell))
}

export function parseGfmTable(markdown: string): GfmTable | null {
  const lines = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length < 2) {
    return null
  }

  const headerLine = lines.find((line) => line.includes('|'))
  if (!headerLine) {
    return null
  }
  const headerIndex = lines.indexOf(headerLine)
  const sepLine = lines[headerIndex + 1]
  if (!sepLine || !isSeparatorRow(sepLine)) {
    return null
  }

  const headers = splitRow(headerLine)
  if (headers.length < 2) {
    return null
  }

  const rows: string[][] = []
  for (let i = headerIndex + 2; i < lines.length; i += 1) {
    const line = lines[i]
    if (!line.includes('|')) {
      continue
    }
    const cells = splitRow(line)
    while (cells.length < headers.length) {
      cells.push('')
    }
    rows.push(cells.slice(0, headers.length))
  }

  return { headers, rows }
}

export function serializeGfmTable(table: GfmTable): string {
  const { headers, rows } = table
  const header = `| ${headers.join(' | ')} |`
  const sep = `| ${headers.map(() => '---').join(' | ')} |`
  const body = rows.map((row) => {
    const padded = headers.map((_, i) => row[i] ?? '')
    return `| ${padded.join(' | ')} |`
  })
  return [header, sep, ...body].join('\n')
}

export function parsePreferredColumn(value: unknown, columnCount: number): number {
  const n = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(n) || n < 1) {
    return Math.min(2, Math.max(1, columnCount - 1)) || 1
  }
  return Math.min(Math.max(1, Math.floor(n)), Math.max(1, columnCount - 1))
}
