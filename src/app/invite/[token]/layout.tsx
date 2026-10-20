import type { Metadata } from "next";

type Props = {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
};

function apiOrigin(): string {
  return (
    process.env.EAGASEKE_API_ORIGIN ??
    process.env.NEXT_PUBLIC_EAGASEKE_ORIGIN ??
    "http://127.0.0.1:3000"
  ).replace(/\/$/, "");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const fallback: Metadata = {
    title: "Invitation · Akiba One",
    description: "Rejoins un cercle d’épargne sur Akiba One.",
    openGraph: {
      title: "Invitation · Akiba One",
      description: "Rejoins un cercle d’épargne sur Akiba One.",
      images: [{ url: "/og.png" }],
      type: "website",
      siteName: "Akiba One",
    },
    twitter: {
      card: "summary_large_image",
      title: "Invitation · Akiba One",
      description: "Rejoins un cercle d’épargne sur Akiba One.",
      images: ["/og.png"],
    },
  };
  if (!token) return fallback;
  try {
    const res = await fetch(
      `${apiOrigin()}/api/invitations/token/${encodeURIComponent(token)}`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return fallback;
    const data = (await res.json()) as {
      contributionTitle?: string;
      inviterName?: string;
      kind?: string;
    };
    const title = data.contributionTitle?.trim() || "Invitation";
    const by = data.inviterName?.trim();
    const description = by
      ? `${by} t’invite à rejoindre « ${title} » sur Akiba One.`
      : `Rejoins « ${title} » sur Akiba One.`;
    return {
      title: `${title} · Akiba One`,
      description,
      openGraph: {
        title,
        description,
        images: [{ url: "/og.png" }],
        type: "website",
        siteName: "Akiba One",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: ["/og.png"],
      },
    };
  } catch {
    return fallback;
  }
}

export default function InviteLayout({ children }: Props) {
  return children;
}
