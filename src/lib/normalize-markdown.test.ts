import { describe, expect, it } from 'vitest'
import {
  ensureBlankLineBeforeGfmTables,
  nestLooseOrderedListContent,
  normalizeMarkdown,
  normalizeUnicodeBullets,
} from './normalize-markdown'

describe('normalizeUnicodeBullets', () => {
  it('converts unicode bullets to markdown dashes', () => {
    expect(normalizeUnicodeBullets('• one\n• two')).toBe('- one\n- two')
  })
})

describe('nestLooseOrderedListContent', () => {
  it('nests paragraph and bullets under numbered items', () => {
    const input = [
      '1. 特徵比對 (Signature Matching)',
      'WAF 會檢查關鍵字，例如：',
      '- UNION SELECT',
      '- OR 1=1',
      '2. 異常編碼檢測',
      '攻擊者常會用編碼繞過檢查。',
      '3. 限制輸入長度與格式',
      '你可以設定自定義規則。',
      '',
      '## 實戰範例',
      '',
      '- 即時攔截 (Prevention)：說明',
      '- 主動檢查 (Inline inspection)：說明',
    ].join('\n')

    const out = nestLooseOrderedListContent(input)
    expect(out).toContain('1. 特徵比對 (Signature Matching)')
    expect(out).toContain('   WAF 會檢查關鍵字，例如：')
    expect(out).toContain('   - UNION SELECT')
    expect(out).toContain('   - OR 1=1')
    expect(out).toContain('2. 異常編碼檢測')
    expect(out).toContain('   攻擊者常會用編碼繞過檢查。')
    expect(out).toContain('## 實戰範例')
    // Section bullets after a heading stay at root
    expect(out).toContain('\n- 即時攔截 (Prevention)：說明')
    expect(out).not.toContain('   - 即時攔截')
  })

  it('leaves fenced code untouched', () => {
    const input = [
      '1. Example',
      '```',
      '- not a list',
      '```',
      '2. Next',
    ].join('\n')
    const out = nestLooseOrderedListContent(input)
    expect(out).toContain('```\n- not a list\n```')
  })

  it('does not double-indent already nested bullets', () => {
    const input = ['1. Title', '   - already nested', '2. Next'].join('\n')
    expect(nestLooseOrderedListContent(input)).toBe(input)
  })
})

describe('normalizeMarkdown', () => {
  it('applies unicode + nesting', () => {
    const out = normalizeMarkdown('1. A\n• b')
    expect(out).toBe('1. A\n   - b')
  })
})


describe('ensureBlankLineBeforeGfmTables', () => {
  it('inserts a blank line before a table that follows a list', () => {
    const input = [
      '- Unlimited Mode: can continue to burst for a fee.',
      'When to Use (and When to Avoid) Burstable Instances',
      '| Workload Type | Recommended? | Why? |',
      '| --- | --- | --- |',
      '| Development/Test Environments | Yes | Often idle. |',
    ].join('\n')

    const out = ensureBlankLineBeforeGfmTables(input)
    expect(out).toContain(
      'When to Use (and When to Avoid) Burstable Instances\n\n| Workload Type | Recommended? | Why? |',
    )
  })

  it('does not double-insert when a blank line already exists', () => {
    const input = [
      '- item',
      '',
      '| A | B |',
      '| --- | --- |',
      '| 1 | 2 |',
    ].join('\n')
    expect(ensureBlankLineBeforeGfmTables(input)).toBe(input)
  })

  it('leaves fenced code tables alone', () => {
    const input = ['```', '| A | B |', '| --- | --- |', '```'].join('\n')
    expect(ensureBlankLineBeforeGfmTables(input)).toBe(input)
  })
})

describe('normalizeMarkdown table + list', () => {
  it('makes list-adjacent tables parseable without nesting pipe rows', () => {
    const input = [
      '- Unlimited Mode: fee.',
      'When to Use',
      '| A | B |',
      '| --- | --- |',
      '| 1 | 2 |',
    ].join('\n')
    const out = normalizeMarkdown(input)
    expect(out).toContain('When to Use\n\n| A | B |')
    expect(out).not.toContain('   | A | B |')
  })
})

describe('normalizeMarkdown unlocks GFM tables after lists', () => {
  it('parses as a table node after normalize', async () => {
    const { fromMarkdown } = await import('mdast-util-from-markdown')
    const { gfmTable } = await import('micromark-extension-gfm-table')
    const { gfmTableFromMarkdown } = await import('mdast-util-gfm-table')

    const broken = [
      '- Unlimited Mode: can continue to burst for a fee.',
      'When to Use (and When to Avoid) Burstable Instances',
      '| Workload Type | Recommended? | Why? |',
      '| --- | --- | --- |',
      '| Development/Test Environments | Yes | Often idle. |',
    ].join('\n')

    const hasTable = (md: string) => {
      const tree = fromMarkdown(md, {
        extensions: [gfmTable()],
        mdastExtensions: [gfmTableFromMarkdown()],
      })
      let found = false
      const walk = (n: { type?: string; children?: unknown[] }) => {
        if (n.type === 'table') found = true
        for (const c of n.children || []) walk(c as { type?: string; children?: unknown[] })
      }
      walk(tree)
      return found
    }

    expect(hasTable(broken)).toBe(false)
    expect(hasTable(normalizeMarkdown(broken))).toBe(true)
  })
})
