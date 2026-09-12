/**
 * Markdown helpers for study/browse rendering.
 */

const ORDERED_ITEM = /^(\d+)\.\s+\S/
const ROOT_BULLET = /^([-*])\s+/
const ATX_HEADING = /^#{1,6}\s/
const FENCE = /^```/
/** Pipe table row: | cells | */
const TABLE_ROW = /^\|(.+)\|\s*$/
/** GFM separator row under a header: | --- | --- | */
const TABLE_SEPARATOR = /^\|?\s*:?-{3,}\s*(\|\s*:?-{3,}\s*)+\|?\s*$/

/**
 * Notes sometimes use a unicode bullet instead of markdown list syntax.
 */
export function normalizeUnicodeBullets(content: string) {
  return content.replace(/^[ \t]*•[ \t]+/gm, '- ')
}

function isGfmTableStart(lines: string[], index: number) {
  const line = lines[index]
  const next = lines[index + 1]
  if (!next) {
    return false
  }
  if (!TABLE_ROW.test(line) || TABLE_SEPARATOR.test(line.trim())) {
    return false
  }
  return TABLE_SEPARATOR.test(next.trim())
}

/**
 * GFM tables need a blank line before the header when they follow a list or
 * paragraph; otherwise remark-gfm treats the pipes as lazy list/paragraph text
 * (study shows a smashed "| --- |" blob; TipTap still shows an HTML table).
 */
export function ensureBlankLineBeforeGfmTables(content: string) {
  const lines = content.split('\n')
  const out: string[] = []
  let inFence = false

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]

    if (FENCE.test(line.trimStart())) {
      inFence = !inFence
      out.push(line)
      continue
    }

    if (!inFence && isGfmTableStart(lines, i)) {
      const prev = out.length > 0 ? out[out.length - 1] : ''
      if (prev.trim() !== '') {
        out.push('')
      }
    }

    out.push(line)
  }

  return out.join('\n')
}

/**
 * TipTap / hand-authored answers often write:
 *
 *   1. Title
 *   paragraph…
 *   - bullet
 *   2. Next
 *
 * In CommonMark that breaks the ordered list and leaves bullets at root
 * (flush with "1."). Indent continuation paragraphs and root bullets so they
 * nest under the numbered item.
 */
export function nestLooseOrderedListContent(content: string) {
  const lines = content.split('\n')
  const out: string[] = []
  let i = 0
  let inFence = false

  while (i < lines.length) {
    const line = lines[i]

    if (FENCE.test(line.trimStart())) {
      inFence = !inFence
      out.push(line)
      i += 1
      continue
    }

    if (inFence || !ORDERED_ITEM.test(line)) {
      out.push(line)
      i += 1
      continue
    }

    // Emit the ordered-list item line, then indent following loose content
    // until the next ordered item, heading, blockquote, or thematic break.
    out.push(line)
    i += 1

    while (i < lines.length) {
      const next = lines[i]
      const trimmed = next.trim()

      if (FENCE.test(next.trimStart())) {
        break
      }
      if (ORDERED_ITEM.test(next)) {
        break
      }
      if (ATX_HEADING.test(next)) {
        break
      }
      if (isGfmTableStart(lines, i)) {
        break
      }
      if (next.startsWith('>')) {
        break
      }
      if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed) || /^___+$/.test(trimmed)) {
        break
      }
      // Leave already-indented lines alone (nested content / code).
      if (/^[ \t]/.test(next) && trimmed !== '') {
        out.push(next)
        i += 1
        continue
      }
      // Blank line: keep, still inside the item.
      if (trimmed === '') {
        out.push(next)
        i += 1
        continue
      }
      // Root bullet or paragraph → nest under the list item.
      // Use 3 spaces so "- " / "* " stay list markers after indent (CommonMark).
      if (ROOT_BULLET.test(next)) {
        out.push(`   ${next}`)
        i += 1
        continue
      }
      out.push(`   ${next}`)
      i += 1
    }
  }

  return out.join('\n')
}

export function normalizeMarkdown(content: string) {
  return nestLooseOrderedListContent(
    ensureBlankLineBeforeGfmTables(normalizeUnicodeBullets(content)),
  )
}
