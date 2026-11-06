/** Document site éditable (site builder). */

import type { BlockStyle } from "./block-style";

export type { BlockStyle };

export type BlockType =
  | "hero"
  | "richText"
  | "featureGrid"
  | "ctaBand"
  | "pricing"
  | "faq"
  | "image"
  | "stats"
  | "contact"
  | "blogList"
  | "legalSections"
  | "values"
  | "statusBanner"
  | "spacer"
  | "html"
  | "columns"
  | "buttons"
  | "divider"
  | "quote"
  | "logoCloud"
  | "video"
  | "testimonials"
  | "gallery"
  | "formLead";

export type HeroProps = {
  brand: string;
  headline: string;
  support: string;
  ctaPrimary: { label: string; href: string };
  ctaSecondary: { label: string; href: string };
  ctaTertiary?: { label: string; href: string };
  tone?: "dark" | "light" | "image";
  /** Variante layout */
  variant?: "classic" | "split" | "minimal" | "centered";
  mediaUrl?: string;
  minHeight?: "sm" | "md" | "lg" | "screen";
};

export type RichTextProps = {
  eyebrow?: string;
  title?: string;
  paragraphs: string[];
  align?: "left" | "center";
  variant?: "article" | "lead" | "compact";
};

export type FeatureGridProps = {
  title: string;
  intro?: string;
  items: {
    title: string;
    summary: string;
    details?: string;
    icon?: string;
    href?: string;
  }[];
  columns?: 2 | 3 | 4;
  variant?: "cards" | "minimal" | "bordered";
};

export type CtaBandProps = {
  title: string;
  body?: string;
  buttonLabel: string;
  buttonHref: string;
  variant?: "gradient" | "solid" | "outline" | "soft";
  secondaryLabel?: string;
  secondaryHref?: string;
};

export type PricingProps = {
  title: string;
  intro?: string;
  plans: {
    name: string;
    price: string;
    period?: string;
    description: string;
    highlights: string[];
    highlighted?: boolean;
    ctaLabel?: string;
    ctaHref?: string;
  }[];
  footnote?: string;
};

export type FaqProps = {
  title: string;
  items: { question: string; answer: string }[];
  variant?: "accordion" | "split";
};

export type ImageProps = {
  src: string;
  alt: string;
  caption?: string;
  fullBleed?: boolean;
  aspect?: "auto" | "16/9" | "4/3" | "1/1" | "21/9";
  objectFit?: "cover" | "contain";
};

export type StatsProps = {
  title?: string;
  items: { label: string; value: string; hint?: string }[];
  variant?: "plain" | "cards" | "inline";
};

export type ContactProps = {
  title: string;
  intro?: string;
  email: string;
  note?: string;
  phone?: string;
};

export type BlogListProps = {
  title: string;
  intro?: string;
  limit?: number;
  variant?: "grid" | "list";
};

export type LegalSectionsProps = {
  title: string;
  updated?: string;
  sections: { heading: string; body: string }[];
};

export type ValuesProps = {
  title?: string;
  items: { title: string; text: string; icon?: string }[];
};

export type StatusBannerProps = {
  show: boolean;
};

export type SpacerProps = {
  size: "sm" | "md" | "lg" | "xl";
};

export type HtmlProps = {
  html: string;
};

export type ColumnsProps = {
  gap?: "sm" | "md" | "lg";
  stackOnMobile?: boolean;
  columns: {
    id: string;
    /** Parts sur 12 */
    span: 3 | 4 | 6 | 8 | 9 | 12;
    blocks: SiteBlock[];
  }[];
};

export type ButtonsProps = {
  align?: "left" | "center" | "right";
  buttons: {
    id: string;
    label: string;
    href: string;
    style?: "primary" | "secondary" | "ghost" | "sun";
  }[];
};

export type DividerProps = {
  label?: string;
  style?: "line" | "dots" | "gradient";
};

export type QuoteProps = {
  quote: string;
  author?: string;
  role?: string;
  variant?: "large" | "card";
};

export type LogoCloudProps = {
  title?: string;
  logos: { id: string; name: string; src: string; href?: string }[];
};

export type VideoProps = {
  url: string;
  title?: string;
  poster?: string;
  aspect?: "16/9" | "4/3";
};

export type TestimonialsProps = {
  title?: string;
  items: {
    id: string;
    quote: string;
    name: string;
    role?: string;
    avatar?: string;
  }[];
  variant?: "cards" | "carousel";
};

export type GalleryProps = {
  title?: string;
  images: { id: string; src: string; alt: string; caption?: string }[];
  columns?: 2 | 3 | 4;
};

export type FormLeadProps = {
  title: string;
  intro?: string;
  submitLabel?: string;
  mailto?: string;
  fields: {
    id: string;
    name: string;
    label: string;
    type: "text" | "email" | "tel" | "textarea";
    required?: boolean;
  }[];
};

type BlockMeta = {
  id: string;
  /** Nom affiché dans le studio */
  label?: string;
  hidden?: boolean;
  style?: BlockStyle;
};

export type SiteBlock = BlockMeta &
  (
    | { type: "hero"; props: HeroProps }
    | { type: "richText"; props: RichTextProps }
    | { type: "featureGrid"; props: FeatureGridProps }
    | { type: "ctaBand"; props: CtaBandProps }
    | { type: "pricing"; props: PricingProps }
    | { type: "faq"; props: FaqProps }
    | { type: "image"; props: ImageProps }
    | { type: "stats"; props: StatsProps }
    | { type: "contact"; props: ContactProps }
    | { type: "blogList"; props: BlogListProps }
    | { type: "legalSections"; props: LegalSectionsProps }
    | { type: "values"; props: ValuesProps }
    | { type: "statusBanner"; props: StatusBannerProps }
    | { type: "spacer"; props: SpacerProps }
    | { type: "html"; props: HtmlProps }
    | { type: "columns"; props: ColumnsProps }
    | { type: "buttons"; props: ButtonsProps }
    | { type: "divider"; props: DividerProps }
    | { type: "quote"; props: QuoteProps }
    | { type: "logoCloud"; props: LogoCloudProps }
    | { type: "video"; props: VideoProps }
    | { type: "testimonials"; props: TestimonialsProps }
    | { type: "gallery"; props: GalleryProps }
    | { type: "formLead"; props: FormLeadProps }
  );

export type PageSeo = {
  title?: string;
  description?: string;
  ogImage?: string;
  noIndex?: boolean;
};

export type SitePage = {
  id: string;
  slug: string;
  title: string;
  status: "published" | "draft";
  seo: PageSeo;
  blocks: SiteBlock[];
};

export type NavItem = {
  id: string;
  label: string;
  href: string;
  external?: boolean;
};

export type BlogPostDoc = {
  id: string;
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  body: string[];
  seo?: PageSeo;
  status: "published" | "draft";
};

export type MediaAsset = {
  id: string;
  name: string;
  url: string;
  mime: string;
  size: number;
  createdAt: string;
};

export type SiteSettings = {
  brand: string;
  tagline: string;
  logoUrl?: string;
  primaryCta: { label: string; href: string };
  theme: {
    accent: string;
    sun: string;
    background: string;
    foreground: string;
  };
  /** CSS global libre injecté sur le site */
  customCss?: string;
  /** i18n léger */
  i18n?: {
    defaultLocale: string;
    locales: string[];
  };
};

/** Surcharges par locale (marque, nav, footer). */
export type SiteLocaleOverlay = {
  settings?: Partial<Pick<SiteSettings, "brand" | "tagline" | "primaryCta">>;
  nav?: NavItem[];
  footer?: {
    blurb?: string;
    links?: NavItem[];
  };
};

export type SiteDocument = {
  version: 1;
  updatedAt: string;
  settings: SiteSettings;
  nav: NavItem[];
  footer: {
    blurb: string;
    links: NavItem[];
    showStudioLink: boolean;
  };
  pages: SitePage[];
  blog: BlogPostDoc[];
  media: MediaAsset[];
  /** Traductions UI chrome (pas les blocs page — v1). */
  localeOverlays?: Record<string, SiteLocaleOverlay>;
};

export type SiteMode = "published" | "draft";

export type SectionTemplate = {
  id: string;
  name: string;
  description: string;
  category: "hero" | "content" | "social" | "conversion" | "layout";
  blocks: Omit<SiteBlock, "id">[];
};
