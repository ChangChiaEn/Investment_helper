'use client'

import { ExternalLink, Search } from 'lucide-react'

interface Source {
  title: string
  uri?: string
  url?: string
}

interface SourcesSectionProps {
  sources: Source[]
  className?: string
}

export function SourcesSection({ sources, className = '' }: SourcesSectionProps) {
  if (!sources || sources.length === 0) return null

  return (
    <div className={`bg-card/95 backdrop-blur-sm rounded-xl border border-border/50 p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-4 text-muted-fg">
        <Search className="w-4 h-4" />
        <h3 className="text-sm font-semibold uppercase tracking-wider">參考資料來源</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {sources.map((source, idx) => {
          const href = source.uri || source.url
          if (!href) return null
          return (
            <a
              key={idx}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-muted-fg hover:text-primary transition-colors p-2 hover:bg-muted rounded-lg"
            >
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{source.title || new URL(href).hostname}</span>
            </a>
          )
        })}
      </div>
    </div>
  )
}
