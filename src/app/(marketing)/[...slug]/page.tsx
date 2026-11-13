import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RenderPageBlocks } from "@/builder/render-blocks";
import { findPageBySlug, getPublishedSiteDocument } from "@/lib/cms-public-site";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getPublishedSiteDocument();
  const page = doc ? findPageBySlug(doc, slug) : undefined;
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

/**
 * Pages marketing du CMS (features, pricing, about, contact, legal/*…).
 * Les routes explicites de l'app (login, register, onboarding, invite,
 * r, share, offline, privacy…) sont toujours prioritaires sur ce
 * catch-all — Next.js ne tombe ici que si aucune route plus précise
 * n'a matché.
 */
const RESERVED_PREFIXES = new Set([
  "app",
  "api",
  "auth",
  "onboarding",
  "invite",
  "r",
  "share",
  "offline",
  "login",
  "register",
  "forgot-password",
  "privacy",
  "uploads",
]);

export default async function CmsPage({ params }: Props) {
  const { slug } = await params;
  // Préfixes de l'app (déjà routés par des pages plus spécifiques
  // normalement) : un chemin non trouvé dessous reste un vrai 404,
  // pas une page CMS inexistante qui n'a rien à voir.
  if (RESERVED_PREFIXES.has(slug[0])) notFound();
  // /blog/[article] géré par app/blog/[slug]
  if (slug[0] === "blog" && slug.length > 1) notFound();

  const doc = await getPublishedSiteDocument();
  const page = doc ? findPageBySlug(doc, slug) : undefined;
  if (!doc || !page || page.status === "draft") notFound();

  return <RenderPageBlocks blocks={page.blocks} doc={doc} />;
}
