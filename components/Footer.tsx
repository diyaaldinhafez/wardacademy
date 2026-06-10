import { footer, site } from "@/lib/content";
import Icon from "./Icon";

export default function Footer() {
  return (
    <footer className="border-t border-ink/10 bg-cream">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-2">
            <a href="#top" className="flex items-center gap-2.5" aria-label={site.name}>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white">
                <Icon name="graduation" className="h-5 w-5" />
              </span>
              <span className="font-display text-lg font-extrabold tracking-tight text-ink">
                {site.name}
              </span>
            </a>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-soft">
              {footer.tagline}
            </p>
          </div>

          {/* Link columns */}
          {footer.columns.map((col) => (
            <div key={col.title}>
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-ink-muted">
                {col.title}
              </h3>
              <ul className="mt-2 space-y-1">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="inline-flex min-h-11 items-center text-sm font-medium text-ink-soft transition-colors hover:text-brand"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-ink/10 pt-6 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.name}. {footer.note}
          </p>
          <p className="font-medium">{footer.legal}</p>
        </div>
      </div>
    </footer>
  );
}
