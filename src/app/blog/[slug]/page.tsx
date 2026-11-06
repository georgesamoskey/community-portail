import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedSiteDocument } from "@/lib/cms-public-site";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getPublishedSiteDocument();
  const post = doc?.blog.find((p) => p.slug === slug && p.status === "published");
  if (!post) return {};
  return {
    title: post.seo?.title || post.title,
    description: post.seo?.description || post.excerpt,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const doc = await getPublishedSiteDocument();
  const post = doc?.blog.find((p) => p.slug === slug && p.status === "published");
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <p className="text-sm text-ink-faint">{post.date}</p>
      <h1 className="mt-2 font-display text-4xl font-semibold text-ink">
        {post.title}
      </h1>
      <div className="mt-8 space-y-4 text-base leading-relaxed text-ink-soft">
        {post.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </article>
  );
}
