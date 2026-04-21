'use client'

import Link from 'next/link'
import { Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Settings, Code2, Home } from 'lucide-react'

function NavbarInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab')

  const isActive = (path: string) => pathname === path
  const macrosActive = pathname === '/settings' && tab === 'macros'
  const configActive = pathname === '/settings' && tab !== 'macros'

  return (
    <nav className="border-b-2 border-border bg-card sticky top-0 z-50">
      <div className="w-full px-3 sm:px-4">
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
              href="/settings?tab=macros"
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-wide border-2 transition-all ${
                macrosActive
                  ? 'bg-secondary text-secondary-foreground border-secondary'
                  : 'border-border text-foreground hover:border-secondary hover:bg-secondary/5'
              }`}
            >
              <Code2 size={16} />
              Macros
            </Link>
            <Link
              href="/settings"
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-wide border-2 transition-all ${
                configActive
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

export function Navbar() {
  return (
    <Suspense fallback={<nav className="h-16 border-b-2 border-border bg-card" aria-hidden />}>
      <NavbarInner />
    </Suspense>
  )
}
