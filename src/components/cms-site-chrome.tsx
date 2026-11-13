"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem, SiteDocument } from "@/builder/types";
import { cx } from "@/lib/cx";
import { backofficeUrl, portalUrl } from "@/lib/cms-site-urls";
import { isExternalHref, resolveHref } from "@/lib/resolve-href";

/**
 * Header/footer des pages CMS (accueil, blog, marketing, légal) —
 * porté depuis community-cms/components/site-chrome.tsx. Contrairement
 * à l'original (qui fetchait son propre `/api/cms/public-chrome` côté
 * client), ici `nav`/`footer`/`settings` arrivent en props depuis le
 * layout serveur du groupe (marketing) — un seul fetch du document CMS
 * pour toute la page, pas de flash "sans menu" au chargement.
 *
 * Simplifié : pas de sélecteur de langue (le CMS n'a qu'une locale pour
 * l'instant) — à réintroduire si besoin via le système i18n du portal.
 */

function NavLink({
  item,
  onHome,
  pathname,
}: {
  item: NavItem;
  onHome: boolean;
  pathname: string;
}) {
  const href = resolveHref(item.href);
  const active =
    !item.external &&
    !isExternalHref(item.href) &&
    (pathname === item.href || pathname.startsWith(`${item.href}/`));
  const className = cx(
    "text-sm font-medium transition",
    onHome
      ? "text-white/80 hover:text-white"
      : active
        ? "text-lagoon-700"
        : "text-ink-700/80 hover:text-lagoon-700",
  );
  if (item.external || isExternalHref(item.href)) {
    return (
      <a href={href} className={className}>
        {item.label}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {item.label}
    </Link>
  );
}

export function SiteHeader({
  nav,
  settings,
}: {
  nav: NavItem[];
  settings: SiteDocument["settings"];
}) {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const cta = settings.primaryCta;

  return (
    <header
      className={cx(
        "z-20 w-full",
        onHome
          ? "absolute inset-x-0 top-0 bg-transparent"
          : "relative border-b border-ink-100 bg-white/90 backdrop-blur",
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <Link
          href="/"
          className={cx(
            "font-display text-2xl font-semibold tracking-tight",
            onHome ? "text-white" : "text-ink-900",
          )}
        >
          {settings.brand}
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {nav.map((n) => (
            <NavLink key={n.id} item={n} onHome={onHome} pathname={pathname} />
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/register"
            className={cx(
              "rounded-full px-3 py-2 text-sm font-semibold transition sm:px-4",
              onHome
                ? "border border-white/30 text-white hover:bg-white/10"
                : "border border-ink-200 text-ink-800 hover:border-lagoon-400 hover:text-lagoon-700",
            )}
          >
            <span className="sm:hidden">Inscription</span>
            <span className="hidden sm:inline">Créer un compte</span>
          </Link>
          <a
            href={resolveHref(cta.href)}
            className={cx(
              "rounded-full px-4 py-2 text-sm font-semibold shadow-md transition",
              onHome
                ? "bg-sun-400 text-ink-900 hover:bg-sun-500"
                : "bg-lagoon-600 text-white shadow-lagoon-700/20 hover:bg-lagoon-700",
            )}
          >
            {cta.label}
          </a>
        </div>
      </div>
      <nav
        className={cx(
          "flex gap-4 overflow-x-auto px-4 pb-3 md:hidden",
          onHome ? "text-white/80" : "text-ink-700/80",
        )}
      >
        {nav.map((n) => (
          <NavLink key={n.id} item={n} onHome={onHome} pathname={pathname} />
        ))}
      </nav>
    </header>
  );
}

export function SiteFooter({
  footer,
  settings,
}: {
  footer: SiteDocument["footer"];
  settings: SiteDocument["settings"];
}) {
  const portal = portalUrl();
  const bo = backofficeUrl();

  return (
    <footer className="mt-auto border-t border-ink-100 bg-ink-900 text-ink-50">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3 sm:px-6">
        <div>
          <p className="font-display text-xl font-semibold">{settings.brand}</p>
          <p className="mt-2 text-sm text-ink-200/80">{footer.blurb}</p>
        </div>
        <div className="text-sm">
          <p className="font-medium text-white">Liens</p>
          <ul className="mt-3 space-y-2 text-ink-200/80">
            {footer.links.map((l) => (
              <li key={l.id}>
                {l.external || isExternalHref(l.href) ? (
                  <a href={resolveHref(l.href)} className="hover:text-white">
                    {l.label}
                  </a>
                ) : (
                  <Link href={resolveHref(l.href)} className="hover:text-white">
                    {l.label}
                  </Link>
                )}
              </li>
            ))}
            {bo && (
              <li>
                <a href={`${bo}/admin`} className="hover:text-white">
                  Backoffice (ops)
                </a>
              </li>
            )}
            {footer.showStudioLink && bo && (
              <li>
                <a href={`${bo}/admin/cms`} className="hover:text-white">
                  Studio site builder
                </a>
              </li>
            )}
          </ul>
        </div>
        <div className="text-sm text-ink-200/70">
          <p className="mt-4 text-xs opacity-60">
            Portail : {portal.replace(/^https?:\/\//, "")}
          </p>
        </div>
      </div>
    </footer>
  );
}
