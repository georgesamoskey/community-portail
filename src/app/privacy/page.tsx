import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
};

const legalPrivacy = {
  title: "Politique de confidentialité",
  updated: "29 octobre 2026",
  sections: [
    {
      heading: "Données collectées",
      body: "Nous collectons les informations nécessaires au fonctionnement du service : identité de compte, coordonnées, et données liées aux tontines et cotisations.",
    },
    {
      heading: "Finalités",
      body: "Ces données servent à authentifier les membres, exécuter les parcours d’épargne, et assurer le support et la conformité.",
    },
    {
      heading: "Conservation",
      body: "Les données sont conservées pendant la durée nécessaire aux finalités décrites, puis archivées ou supprimées selon les obligations légales.",
    },
    {
      heading: "Contact",
      body: "Pour toute question relative à vos données, contactez-nous via la page Contact.",
    },
  ],
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-14 sm:px-8">
      <Link
        href="/"
        className="text-sm font-semibold text-ink-mute hover:text-brand-600"
      >
        ← Accueil
      </Link>

      <h1 className="mt-6 font-display text-3xl font-bold tracking-tight text-ink">
        {legalPrivacy.title}
      </h1>
      <p className="mt-2 text-sm text-ink-mute">
        Dernière mise à jour : {legalPrivacy.updated}
      </p>

      <div className="mt-8 space-y-7">
        {legalPrivacy.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="font-display text-lg font-bold tracking-tight text-ink">
              {section.heading}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-mute">
              {section.body}
            </p>
          </section>
        ))}
      </div>
    </main>
  );
}
