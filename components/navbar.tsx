'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings, Code2, Home } from 'lucide-react'

export function Navbar() {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  return (
    <nav className="border-b-2 border-border bg-card sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-xl font-black text-primary uppercase tracking-wider hover:text-primary/80 transition-colors">
            KlipDeck
          </Link>
          <div className="flex gap-1">
            <Link
              href="/"
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-wide border-2 transition-all ${
                isActive('/')
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-foreground hover:border-primary hover:bg-primary/5'
              }`}
            >
              <Home size={16} />
              Dashboard
            </Link>
            <Link
              href="/gcode"
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-wide border-2 transition-all ${
                isActive('/gcode')
                  ? 'bg-secondary text-secondary-foreground border-secondary'
                  : 'border-border text-foreground hover:border-secondary hover:bg-secondary/5'
              }`}
            >
              <Code2 size={16} />
              Configs
            </Link>
            <Link
              href="/settings"
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-wide border-2 transition-all ${
                isActive('/settings')
                  ? 'bg-accent text-accent-foreground border-accent'
                  : 'border-border text-foreground hover:border-accent hover:bg-accent/5'
              }`}
            >
              <Settings size={16} />
              Config
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
