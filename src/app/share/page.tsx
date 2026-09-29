import { redirect } from "next/navigation";

type Search = {
  title?: string;
  text?: string;
  url?: string;
};

/** Cible Web Share Target (Android / Chrome PWA). */
export default async function ShareTargetPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const title = (sp.title ?? "").trim();
  const text = (sp.text ?? "").trim();
  const url = (sp.url ?? "").trim();
  const payload = [title, text, url].filter(Boolean).join("\n").trim();

  const dest = new URLSearchParams();
  dest.set("shared", "1");
  if (payload) dest.set("q", payload.slice(0, 2000));
  redirect(`/app/chat?${dest.toString()}`);
}
