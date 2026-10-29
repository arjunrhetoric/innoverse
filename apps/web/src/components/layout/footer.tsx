import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="flex items-center gap-2" aria-label="Innoverse home">
              <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-foreground">
                <span className="text-[12px] font-bold leading-none text-background">I</span>
              </span>
              <span className="text-[13px] font-semibold tracking-[0.02em] text-foreground">
                Innoverse
              </span>
            </Link>
            <p className="mt-3 max-w-[22ch] text-xs leading-relaxed text-muted-foreground">
              The evidence layer for early-career hiring. Real work, verified.
            </p>
          </div>

          <div>
            <h2 className="text-[10px] font-medium uppercase tracking-[0.1em] text-subtle-foreground">
              Product
            </h2>
            <ul className="mt-3 space-y-2">
              {[
                { href: "/explore", label: "Explore challenges" },
                { href: "/talent", label: "Talent directory" },
                { href: "/#workflow", label: "How it works" },
                { href: "/#report", label: "Proof-of-work report" },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-[10px] font-medium uppercase tracking-[0.1em] text-subtle-foreground">
              Trust
            </h2>
            <ul className="mt-3 space-y-2">
              {[
                { href: "/verify", label: "Verify a credential" },
                { href: "/login", label: "Sign in" },
                { href: "/register/institution", label: "For institutions" },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-[10px] font-medium uppercase tracking-[0.1em] text-subtle-foreground">
              Built by
            </h2>
            <ul className="mt-3 space-y-2">
              <li>
                <a
                  href="https://github.com/arjunrhetoric"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Arjun Singh ↗
                </a>
              </li>
              <li>
                <Link
                  href="/role-selection"
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Choose your role
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-[11px] text-subtle-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Innoverse. All reports are generated from GitHub activity.</p>
          <p className="font-mono">ISC licensed · Next.js · MongoDB</p>
        </div>
      </div>
    </footer>
  );
}
