import type { Metadata } from "next";
import Link from "next/link";
import { RenderPageBlocks } from "@/builder/render-blocks";
import { findPageBySlug, getPublishedSiteDocument } from "@/lib/cms-public-site";

export const dynamic = "force-dynamic";

/**
 * Page d'accueil — rendue depuis le studio CMS (community-backoffice →
 * eagaseke `/api/cms/published`), plus de contenu codé en dur ici.
 * Migration depuis community-cms, qui ne sert plus que de studio
 * d'édition (déplacé vers community-backoffice).
 */
export async function generateMetadata(): Promise<Metadata> {
  const doc = await getPublishedSiteDocument();
  if (!doc) return {};
  const page = findPageBySlug(doc, []);
  if (!page) return {};
  return {
    title: page.seo.title || page.title,
    description: page.seo.description,
    robots: page.seo.noIndex ? { index: false, follow: false } : undefined,
    openGraph: page.seo.ogImage
      ? { images: [{ url: page.seo.ogImage }] }
      : undefined,
  };
}

export default async function HomePage() {
  const doc = await getPublishedSiteDocument();
  const page = doc ? findPageBySlug(doc, []) : undefined;

  // Pas de 404 sur l'accueil si le CMS est momentanément injoignable ou
  // sans contenu publié (ex. tout juste déployé) — repli minimal plutôt
  // que de casser la porte d'entrée du site.
  if (!doc || !page || page.status === "draft") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="font-display text-2xl font-semibold text-ink">
          Akiba One
        </h1>
        <p className="max-w-sm text-ink-soft">
          Épargne collective, tontines ASCA, chat et paiements Mobile Money.
        </p>
        <Link
          href="/login"
          className="rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white"
        >
          Connexion
        </Link>
      </div>
    );
  }

  return <RenderPageBlocks blocks={page.blocks} doc={doc} />;
}
