import Link from "next/link";

export const metadata = {
  title: "Hors ligne — Akiba One",
  robots: { index: false },
};

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.png" alt="" width={72} height={72} className="mb-6 rounded-2xl shadow-lift" />
      <h1 className="font-display text-2xl font-bold text-ink">Vous êtes hors ligne</h1>
      <p className="mt-3 text-sm text-ink-mute">
        Vos actions en file (cotisations, messages) seront synchronisées dès le retour
        du réseau — comme sur Android et iOS.
      </p>
      <Link
        href="/app"
        className="mt-8 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-lift"
      >
        Réessayer
      </Link>
    </main>
  );
}
