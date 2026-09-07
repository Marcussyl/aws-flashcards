'use client'

import { useEffect, useId, useState } from 'react'

type MermaidBlockProps = {
  chart: string
}

/**
 * Client-only Mermaid renderer for fenced ```mermaid blocks.
 * Dynamic-imports `mermaid` inside useEffect so Next.js App Router
 * never evaluates DOM APIs on the server.
 */
export function MermaidBlock({ chart }: MermaidBlockProps) {
  const reactId = useId().replace(/:/g, '')
  const source = chart.trim()
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!source) {
      return
    }

    let cancelled = false

    void (async () => {
      try {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'dark',
          themeVariables: {
            darkMode: true,
            background: '#0f172a',
            primaryColor: '#1e293b',
            primaryTextColor: '#e2e8f0',
            primaryBorderColor: '#64748b',
            secondaryColor: '#1e293b',
            tertiaryColor: '#334155',
            lineColor: '#94a3b8',
            textColor: '#e2e8f0',
            mainBkg: '#1e293b',
            nodeBorder: '#64748b',
            clusterBkg: '#1e293b',
            clusterBorder: '#475569',
            titleColor: '#f8fafc',
            edgeLabelBackground: '#0f172a',
            actorBkg: '#1e293b',
            actorBorder: '#64748b',
            actorTextColor: '#e2e8f0',
            actorLineColor: '#64748b',
            signalColor: '#94a3b8',
            signalTextColor: '#e2e8f0',
            labelBoxBkgColor: '#1e293b',
            labelBoxBorderColor: '#64748b',
            labelTextColor: '#e2e8f0',
            loopTextColor: '#e2e8f0',
            noteBkgColor: '#334155',
            noteTextColor: '#e2e8f0',
            noteBorderColor: '#64748b',
            activationBkgColor: '#334155',
            sequenceNumberColor: '#0f172a',
          },
          flowchart: {
            htmlLabels: false,
            curve: 'basis',
          },
          sequence: {
            mirrorActors: false,
            useMaxWidth: true,
          },
        })

        const id = `mermaid-${reactId}-${Math.random().toString(36).slice(2, 9)}`
        const { svg: rendered } = await mermaid.render(id, source)
        if (!cancelled) {
          setError(null)
          setSvg(rendered)
        }
      } catch (err) {
        if (!cancelled) {
          setSvg(null)
          setError(err instanceof Error ? err.message : 'Failed to render diagram')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [source, reactId])

  if (!source) {
    return null
  }

  if (error) {
    return (
      <div
        className="md-mermaid md-mermaid-error rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100"
        role="alert"
      >
        <p className="font-medium">Mermaid diagram error</p>
        <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs text-rose-100/90">
          {error}
        </pre>
        <pre className="mt-3 max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950/60 p-2 font-mono text-xs text-slate-300">
          {source}
        </pre>
      </div>
    )
  }

  if (!svg) {
    return (
      <div
        className="md-mermaid flex min-h-16 max-w-full items-center justify-center overflow-x-auto rounded-xl border border-white/10 bg-slate-950/60 px-3 py-4 text-xs text-slate-400"
        aria-busy="true"
      >
        Rendering diagram…
      </div>
    )
  }

  return (
    <div
      className="md-mermaid max-w-full overflow-x-auto rounded-xl border border-white/10 bg-slate-950/50 p-3"
      data-mermaid-block=""
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
