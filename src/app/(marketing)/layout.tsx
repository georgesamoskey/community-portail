import { SiteFooter, SiteHeader } from "@/components/cms-site-chrome";
import { getPublishedSiteDocument } from "@/lib/cms-public-site";

/**
 * Layout des pages CMS (accueil, blog, marketing, légal) : un seul
 * fetch serveur du document publié, partagé entre le header, le
 * footer et la page elle-même (chaque page refait aussi son propre
 * fetch pour son contenu — `getPublishedSiteDocument` est un simple
 * GET côté eagaseke, pas un calcul coûteux, donc pas besoin de plus
 * d'optimisation ici pour l'instant).
 */
export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const doc = await getPublishedSiteDocument();

  return (
    <div className="flex min-h-screen flex-col">
      {doc && <SiteHeader nav={doc.nav} settings={doc.settings} />}
      <div className="flex-1">{children}</div>
      {doc && <SiteFooter footer={doc.footer} settings={doc.settings} />}
    </div>
  );
}
