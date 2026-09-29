import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import { Figtree, Sora } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { PwaHeadLinks } from "@/components/pwa-head";
import {
  COUNTRY_COOKIE,
  LOCALE_COOKIE,
  LOCALE_META,
  localeFromAcceptLanguage,
  normalizeCountry,
  normalizeLocale,
  type CountryCode,
  type Locale,
} from "@/lib/i18n/config";

const display = Sora({
  variable: "--font-portal-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

const sans = Figtree({
  variable: "--font-portal-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  // iOS / Android : le clavier virtuel redimensionne le layout (composer visible)
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#337AB7" },
    { media: "(prefers-color-scheme: dark)", color: "#1e5a8a" },
  ],
  colorScheme: "light",
};

export const metadata: Metadata = {
  title: {
    default: "Akiba One — Portail membre",
    template: "%s · Akiba One",
  },
  description:
    "Épargne collective, tontines ASCA, chat et paiements Mobile Money — installable hors ligne.",
  applicationName: "Akiba One",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Akiba One",
    startupImage: [
      {
        url: "/splash/iphone-14-pro-max.png",
        media:
          "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash/iphone-14-pro.png",
        media:
          "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash/iphone-12-13.png",
        media:
          "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash/ipad-pro-12.png",
        media:
          "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)",
      },
    ],
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#337AB7",
    "msapplication-config": "/browserconfig.xml",
  },
  icons: {
    icon: [
      { url: "/icons/icon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/icon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: [{ url: "/icons/icon-192.png", type: "image/png" }],
  },
  openGraph: {
    title: "Akiba One",
    description: "Épargne et paiements pour chaque cercle.",
    images: [{ url: "/og.png" }],
    type: "website",
    siteName: "Akiba One",
  },
  twitter: {
    card: "summary",
    title: "Akiba One",
    description: "Épargne collective, tontines, chat et Mobile Money.",
    images: ["/icons/icon-512.png"],
  },
  robots: { index: true, follow: true },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jar = await cookies();
  const hdrs = await headers();
  const country = normalizeCountry(jar.get(COUNTRY_COOKIE)?.value ?? "BI");
  const cookieLocale = jar.get(LOCALE_COOKIE)?.value;
  const locale: Locale = cookieLocale
    ? normalizeLocale(cookieLocale, country)
    : localeFromAcceptLanguage(hdrs.get("accept-language"), country);

  return (
    <html lang={LOCALE_META[locale].bcp47}>
      <head>
        <PwaHeadLinks />
      </head>
      <body
        className={`${display.variable} ${sans.variable} font-sans antialiased`}
      >
        <Providers locale={locale} country={country as CountryCode}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
