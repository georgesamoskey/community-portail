import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import { Figtree, Sora } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
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
  viewportFit: "cover",
  themeColor: "#337AB7",
};

export const metadata: Metadata = {
  title: "Akiba One — Portail membre",
  description:
    "Épargne collective, tontines ASCA, chat et paiements Mobile Money.",
  applicationName: "Akiba One",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Akiba One",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  icons: {
    icon: [{ url: "/icon.png", sizes: "512x512", type: "image/png" }],
    apple: [{ url: "/icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Akiba One",
    description: "Épargne et paiements pour chaque cercle.",
    images: [{ url: "/og.png" }],
  },
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
