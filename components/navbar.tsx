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
    <nav className="h-dvh shrink-0 border-r-2 border-border bg-card/95">
      <div className="flex h-full w-20 md:w-56 flex-col gap-2 p-2">
        <Link
          href="/"
          className="mb-1 border-2 border-border px-2 py-2 text-center text-sm font-black uppercase tracking-wider text-primary transition-colors hover:text-primary/80 md:text-xl"
        >
          KD
        </Link>
        <div className="flex flex-col gap-1">
          <Link
            href="/"
            className={`flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wide border-2 transition-all md:justify-start ${
              isActive('/')
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-foreground hover:border-primary hover:bg-primary/5'
            }`}
          >
            <Home size={16} />
            <span className="hidden md:inline">Dashboard</span>
          </Link>
          <Link
            href="/settings?tab=macros"
            className={`flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wide border-2 transition-all md:justify-start ${
              macrosActive
                ? 'bg-secondary text-secondary-foreground border-secondary'
                : 'border-border text-foreground hover:border-secondary hover:bg-secondary/5'
            }`}
          >
            <Code2 size={16} />
            <span className="hidden md:inline">Macros</span>
          </Link>
          <Link
            href="/settings"
            className={`flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wide border-2 transition-all md:justify-start ${
              configActive
                ? 'bg-accent text-accent-foreground border-accent'
                : 'border-border text-foreground hover:border-accent hover:bg-accent/5'
            }`}
          >
            <Settings size={16} />
            <span className="hidden md:inline">Config</span>
          </Link>
        </div>
      </div>
    </nav>
  )
}

export function Navbar() {
  return (
    <Suspense fallback={<nav className="h-dvh w-20 md:w-56 border-r-2 border-border bg-card" aria-hidden />}>
      <NavbarInner />
    </Suspense>
  )
}
