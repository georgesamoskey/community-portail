import Link from "next/link";
import type { CSSProperties } from "react";
import type { HeroProps, SiteBlock, SiteDocument } from "@/builder/types";
import {
  contentWidthClass,
  styleToClassName,
  styleToInline,
} from "@/builder/block-style";
import { PlatformStatusBanner } from "@/components/platform-status";
import { isExternalHref, resolveHref } from "@/lib/resolve-href";
import { cx } from "@/lib/cx";

function SmartLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const resolved = resolveHref(href);
  if (isExternalHref(href)) {
    return (
      <a href={resolved} className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={resolved} className={className}>
      {children}
    </Link>
  );
}

function BlockShell({
  block,
  children,
  bare,
}: {
  block: SiteBlock;
  children: React.ReactNode;
  bare?: boolean;
}) {
  if (block.hidden) return null;
  if (block.type === "spacer" || block.type === "hero") {
    return <>{children}</>;
  }
  const inline = styleToInline(block.style);
  const overlay = block.style?.overlay ?? 0;
  return (
    <section
      className={cx("relative", styleToClassName(block.style, { bare }))}
      style={inline}
      data-block={block.type}
      data-block-id={block.id}
    >
      {block.style?.backgroundImage && overlay > 0 && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: `rgba(0,0,0,${overlay})` }}
        />
      )}
      <div className={cx("relative z-[1] mx-auto", contentWidthClass(block.style))}>
        {children}
      </div>
      {block.style?.customCss ? (
        <style
          dangerouslySetInnerHTML={{
            __html: `[data-block-id="${block.id}"]{${block.style.customCss}}`,
          }}
        />
      ) : null}
    </section>
  );
}

const HERO_H: Record<NonNullable<HeroProps["minHeight"]>, string> = {
  sm: "min-h-[360px]",
  md: "min-h-[520px]",
  lg: "min-h-[min(100vh,880px)]",
  screen: "min-h-screen",
};

function HeroBlock({ block }: { block: Extract<SiteBlock, { type: "hero" }> }) {
  const props = block.props;
  const dark = props.tone !== "light";
  const variant = props.variant ?? "classic";
  const h = HERO_H[props.minHeight ?? "lg"];
  const shellStyle: CSSProperties = {
    ...styleToInline(block.style),
  };

  return (
    <section
      className={cx(
        "relative overflow-hidden",
        h,
        styleToClassName(block.style, { bare: true }),
        !dark &&
          props.tone !== "image" &&
          "bg-[radial-gradient(ellipse_at_top,#e8f5f1,transparent_60%)]",
      )}
      style={shellStyle}
      data-block="hero"
      data-block-id={block.id}
    >
      {(dark || props.tone === "image") && (
        <>
          {props.mediaUrl || block.style?.backgroundImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={props.mediaUrl || block.style?.backgroundImage || ""}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div
              aria-hidden
              className="cms-glow absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(61,184,160,0.35),transparent_50%),radial-gradient(ellipse_at_80%_10%,rgba(240,193,77,0.22),transparent_45%),linear-gradient(165deg,#0f2e28_0%,#167a66_48%,#1c332e_100%)]"
            />
          )}
          <div
            aria-hidden
            className="absolute inset-0 bg-ink-900/45"
            style={{
              opacity: block.style?.overlay ?? (props.tone === "image" ? 0.45 : 0.2),
            }}
          />
        </>
      )}
      <div
        className={cx(
          "relative z-10 mx-auto flex h-full max-w-6xl flex-col justify-center px-4 py-16 sm:px-6",
          variant === "centered" && "items-center text-center",
          variant === "split" && "lg:grid lg:grid-cols-2 lg:items-center lg:gap-10",
          variant === "minimal" && "max-w-3xl",
        )}
      >
        <div>
          <p
            className={cx(
              "cms-rise font-display text-5xl font-semibold tracking-tight sm:text-7xl",
              dark ? "text-white" : "text-ink-900",
            )}
          >
            {props.brand}
          </p>
          <h1
            className={cx(
              "cms-rise-delay mt-6 max-w-2xl text-2xl font-medium leading-snug sm:text-3xl",
              dark ? "text-white/95" : "text-ink-900",
              variant === "centered" && "mx-auto",
            )}
          >
            {props.headline}
          </h1>
          <p
            className={cx(
              "cms-rise-delay mt-4 max-w-xl text-base leading-relaxed sm:text-lg",
              dark ? "text-white/75" : "text-ink-700/80",
              variant === "centered" && "mx-auto",
            )}
          >
            {props.support}
          </p>
          <div
            className={cx(
              "cms-rise-delay mt-10 flex flex-wrap gap-3",
              variant === "centered" && "justify-center",
            )}
          >
            <SmartLink
              href={props.ctaPrimary.href}
              className="rounded-full bg-sun-400 px-6 py-3 text-sm font-semibold text-ink-900 shadow-lg transition hover:bg-sun-500"
            >
              {props.ctaPrimary.label}
            </SmartLink>
            <SmartLink
              href={props.ctaSecondary.href}
              className={cx(
                "rounded-full border px-6 py-3 text-sm font-semibold backdrop-blur transition",
                dark
                  ? "border-white/35 bg-white/10 text-white hover:bg-white/20"
                  : "border-ink-200 bg-white text-ink-900 hover:bg-ink-50",
              )}
            >
              {props.ctaSecondary.label}
            </SmartLink>
            {props.ctaTertiary && (
              <SmartLink
                href={props.ctaTertiary.href}
                className={cx(
                  "rounded-full border px-6 py-3 text-sm font-semibold backdrop-blur transition",
                  dark
                    ? "border-white/35 bg-white/10 text-white hover:bg-white/20"
                    : "border-ink-200 bg-white text-ink-900 hover:bg-ink-50",
                )}
              >
                {props.ctaTertiary.label}
              </SmartLink>
            )}
          </div>
        </div>
        {variant === "split" && props.mediaUrl && (
          <div className="mt-10 hidden lg:mt-0 lg:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={props.mediaUrl}
              alt=""
              className="rounded-3xl shadow-2xl"
            />
          </div>
        )}
      </div>
    </section>
  );
}

function btnClass(style?: string) {
  switch (style) {
    case "sun":
      return "rounded-full bg-sun-400 px-5 py-2.5 text-sm font-semibold text-ink-900 hover:bg-sun-500";
    case "secondary":
      return "rounded-full border border-ink-200 bg-white px-5 py-2.5 text-sm font-semibold text-ink-900 hover:bg-ink-50";
    case "ghost":
      return "rounded-full px-5 py-2.5 text-sm font-semibold text-lagoon-700 hover:bg-lagoon-50";
    default:
      return "rounded-full bg-lagoon-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-lagoon-700";
  }
}

function youtubeEmbed(url: string): string {
  if (url.includes("embed")) return url;
  const m = url.match(/(?:youtu\.be\/|v=)([\w-]{6,})/);
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  return url;
}

export function RenderBlock({
  block,
  doc,
  nested,
}: {
  block: SiteBlock;
  doc: SiteDocument;
  nested?: boolean;
}) {
  if (block.hidden) return null;

  if (block.type === "hero") {
    return <HeroBlock block={block} />;
  }

  if (block.type === "spacer") {
    const h =
      block.props.size === "sm"
        ? "h-8"
        : block.props.size === "lg"
          ? "h-24"
          : block.props.size === "xl"
            ? "h-36"
            : "h-14";
    return <div className={h} aria-hidden data-block="spacer" />;
  }

  const inner = (() => {
    switch (block.type) {
      case "statusBanner":
        return block.props.show ? <PlatformStatusBanner /> : null;
      case "richText": {
        const compact = block.props.variant === "compact";
        return (
          <div>
            {block.props.eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-wider text-lagoon-700">
                {block.props.eyebrow}
              </p>
            )}
            {block.props.title && (
              <h2
                className={cx(
                  "font-display font-semibold text-ink-900",
                  compact ? "text-2xl" : "text-4xl",
                  block.props.variant === "lead" && "text-lagoon-800",
                )}
              >
                {block.props.title}
              </h2>
            )}
            <div
              className={cx(
                "mt-6 space-y-4 leading-relaxed text-ink-700/85",
                compact ? "text-sm" : "text-base",
              )}
            >
              {block.props.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        );
      }
      case "featureGrid": {
        const cols =
          block.props.columns === 2
            ? "sm:grid-cols-2"
            : block.props.columns === 4
              ? "sm:grid-cols-2 lg:grid-cols-4"
              : "sm:grid-cols-2 lg:grid-cols-3";
        const card =
          block.props.variant === "minimal"
            ? ""
            : block.props.variant === "bordered"
              ? "rounded-2xl border border-ink-200 p-5"
              : "rounded-2xl border border-ink-100/80 bg-white/70 p-5 transition hover:-translate-y-0.5 hover:shadow-md";
        return (
          <>
            <h2 className="font-display text-3xl font-semibold text-ink-900">
              {block.props.title}
            </h2>
            {block.props.intro && (
              <p className="mt-3 max-w-2xl text-ink-700/80">{block.props.intro}</p>
            )}
            <div className={cx("mt-10 grid gap-8", cols)}>
              {block.props.items.map((item, i) => {
                const body = (
                  <>
                    {item.icon && (
                      <span className="text-lg text-lagoon-600">{item.icon}</span>
                    )}
                    <h3 className="font-display text-xl font-semibold text-lagoon-700">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-ink-700/80">
                      {item.summary}
                    </p>
                    {item.details && (
                      <p className="mt-2 text-xs leading-relaxed text-ink-700/60">
                        {item.details}
                      </p>
                    )}
                  </>
                );
                return item.href ? (
                  <SmartLink key={i} href={item.href} className={card}>
                    {body}
                  </SmartLink>
                ) : (
                  <div key={i} className={card}>
                    {body}
                  </div>
                );
              })}
            </div>
          </>
        );
      }
      case "ctaBand": {
        const v = block.props.variant ?? "gradient";
        const box =
          v === "solid"
            ? "bg-lagoon-700 text-white"
            : v === "outline"
              ? "border-2 border-lagoon-600 text-ink-900"
              : v === "soft"
                ? "bg-lagoon-50 text-ink-900"
                : "bg-gradient-to-br from-lagoon-700 to-ink-900 text-white";
        return (
          <div className={cx("rounded-3xl px-8 py-12 sm:px-12", box)}>
            <h2 className="font-display text-3xl font-semibold">{block.props.title}</h2>
            {block.props.body && (
              <p className="mt-3 max-w-xl opacity-80">{block.props.body}</p>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              <SmartLink
                href={block.props.buttonHref}
                className="inline-flex rounded-full bg-sun-400 px-6 py-3 text-sm font-semibold text-ink-900 hover:bg-sun-500"
              >
                {block.props.buttonLabel}
              </SmartLink>
              {block.props.secondaryLabel && block.props.secondaryHref && (
                <SmartLink
                  href={block.props.secondaryHref}
                  className="inline-flex rounded-full border border-current/30 px-6 py-3 text-sm font-semibold opacity-90 hover:opacity-100"
                >
                  {block.props.secondaryLabel}
                </SmartLink>
              )}
            </div>
          </div>
        );
      }
      case "pricing":
        return (
          <>
            <h2 className="font-display text-4xl font-semibold text-ink-900">
              {block.props.title}
            </h2>
            {block.props.intro && (
              <p className="mt-3 max-w-2xl text-ink-700/80">{block.props.intro}</p>
            )}
            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {block.props.plans.map((plan, i) => (
                <div
                  key={i}
                  className={cx(
                    "rounded-2xl border p-6",
                    plan.highlighted
                      ? "border-lagoon-500 bg-lagoon-50/50 shadow-lg"
                      : "border-ink-100 bg-white",
                  )}
                >
                  <h3 className="font-display text-2xl font-semibold">{plan.name}</h3>
                  <p className="mt-2 text-3xl font-semibold text-lagoon-700">
                    {plan.price}
                    {plan.period ? (
                      <span className="text-sm font-normal text-ink-700/60">
                        {" "}
                        / {plan.period}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-3 text-sm text-ink-700/80">{plan.description}</p>
                  <ul className="mt-5 space-y-2 text-sm text-ink-700/80">
                    {plan.highlights.map((h) => (
                      <li key={h}>• {h}</li>
                    ))}
                  </ul>
                  {plan.ctaLabel && plan.ctaHref && (
                    <SmartLink
                      href={plan.ctaHref}
                      className="mt-6 inline-flex rounded-full bg-lagoon-600 px-4 py-2 text-sm font-semibold text-white hover:bg-lagoon-700"
                    >
                      {plan.ctaLabel}
                    </SmartLink>
                  )}
                </div>
              ))}
            </div>
            {block.props.footnote && (
              <p className="mt-8 text-sm text-ink-700/60">{block.props.footnote}</p>
            )}
          </>
        );
      case "faq":
        return (
          <>
            <h2 className="font-display text-3xl font-semibold text-ink-900">
              {block.props.title}
            </h2>
            <div
              className={cx(
                "mt-8 gap-4",
                block.props.variant === "split"
                  ? "grid md:grid-cols-2"
                  : "space-y-4",
              )}
            >
              {block.props.items.map((item, i) => (
                <details
                  key={i}
                  className="rounded-xl border border-ink-100 bg-white px-4 py-3"
                >
                  <summary className="cursor-pointer font-medium text-ink-900">
                    {item.question}
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-ink-700/80">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </>
        );
      case "image": {
        const aspect =
          block.props.aspect && block.props.aspect !== "auto"
            ? block.props.aspect === "16/9"
              ? "aspect-video"
              : block.props.aspect === "4/3"
                ? "aspect-[4/3]"
                : block.props.aspect === "1/1"
                  ? "aspect-square"
                  : "aspect-[21/9]"
            : "";
        if (!block.props.src) {
          return (
            <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-ink-200 text-sm text-ink-700/50">
              Image non définie
            </div>
          );
        }
        return (
          <figure className={block.props.fullBleed ? "-mx-4 sm:-mx-6" : ""}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={block.props.src}
              alt={block.props.alt}
              className={cx(
                "w-full",
                aspect,
                block.props.objectFit === "contain" ? "object-contain" : "object-cover",
                !block.props.fullBleed && "rounded-2xl",
              )}
            />
            {block.props.caption && (
              <figcaption className="mt-3 text-center text-sm text-ink-700/60">
                {block.props.caption}
              </figcaption>
            )}
          </figure>
        );
      }
      case "stats": {
        const cards = block.props.variant === "cards";
        return (
          <>
            {block.props.title && (
              <h2 className="mb-8 font-display text-3xl font-semibold">
                {block.props.title}
              </h2>
            )}
            <div
              className={cx(
                "grid gap-6",
                block.props.variant === "inline"
                  ? "grid-cols-2 lg:grid-cols-4"
                  : "sm:grid-cols-2 lg:grid-cols-4",
              )}
            >
              {block.props.items.map((item, i) => (
                <div
                  key={i}
                  className={cx(
                    "text-center",
                    cards && "rounded-2xl border border-ink-100/20 bg-white/10 p-5",
                  )}
                >
                  <p className="font-display text-4xl font-semibold text-lagoon-500">
                    {item.value}
                  </p>
                  <p className="mt-1 text-sm opacity-80">{item.label}</p>
                  {item.hint && (
                    <p className="mt-1 text-xs opacity-50">{item.hint}</p>
                  )}
                </div>
              ))}
            </div>
          </>
        );
      }
      case "contact":
        return (
          <>
            <h2 className="font-display text-4xl font-semibold text-ink-900">
              {block.props.title}
            </h2>
            {block.props.intro && (
              <p className="mt-4 text-ink-700/80">{block.props.intro}</p>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={`mailto:${block.props.email}`}
                className="inline-flex rounded-full bg-lagoon-600 px-6 py-3 text-sm font-semibold text-white hover:bg-lagoon-700"
              >
                {block.props.email}
              </a>
              {block.props.phone && (
                <a
                  href={`tel:${block.props.phone}`}
                  className="inline-flex rounded-full border border-ink-200 px-6 py-3 text-sm font-semibold"
                >
                  {block.props.phone}
                </a>
              )}
            </div>
            {block.props.note && (
              <p className="mt-6 text-sm text-ink-700/60">{block.props.note}</p>
            )}
          </>
        );
      case "blogList": {
        const posts = doc.blog
          .filter((p) => p.status === "published")
          .slice(0, block.props.limit ?? 50);
        return (
          <>
            <h2 className="font-display text-4xl font-semibold text-ink-900">
              {block.props.title}
            </h2>
            {block.props.intro && (
              <p className="mt-3 max-w-2xl text-ink-700/80">{block.props.intro}</p>
            )}
            <div
              className={cx(
                "mt-10 gap-6",
                block.props.variant === "list"
                  ? "flex flex-col"
                  : "grid md:grid-cols-2 lg:grid-cols-3",
              )}
            >
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="rounded-2xl border border-ink-100 bg-white p-5 transition hover:shadow-md"
                >
                  <p className="text-xs text-ink-700/50">{post.date}</p>
                  <h3 className="mt-2 font-display text-xl font-semibold text-ink-900">
                    {post.title}
                  </h3>
                  <p className="mt-2 text-sm text-ink-700/75">{post.excerpt}</p>
                </Link>
              ))}
            </div>
          </>
        );
      }
      case "legalSections":
        return (
          <>
            <h2 className="font-display text-4xl font-semibold text-ink-900">
              {block.props.title}
            </h2>
            {block.props.updated && (
              <p className="mt-2 text-sm text-ink-700/50">
                Mis à jour : {block.props.updated}
              </p>
            )}
            <div className="mt-10 space-y-8">
              {block.props.sections.map((s, i) => (
                <div key={i}>
                  <h3 className="font-display text-xl font-semibold text-lagoon-700">
                    {s.heading}
                  </h3>
                  <p className="mt-2 leading-relaxed text-ink-700/80">{s.body}</p>
                </div>
              ))}
            </div>
          </>
        );
      case "values":
        return (
          <>
            {block.props.title && (
              <h2 className="mb-8 font-display text-3xl font-semibold text-ink-900">
                {block.props.title}
              </h2>
            )}
            <div className="grid gap-6 sm:grid-cols-3">
              {block.props.items.map((item, i) => (
                <div key={i}>
                  {item.icon && (
                    <span className="text-xl text-lagoon-600">{item.icon}</span>
                  )}
                  <h3 className="font-display text-xl font-semibold text-lagoon-700">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-ink-700/80">{item.text}</p>
                </div>
              ))}
            </div>
          </>
        );
      case "html":
        return (
          <div dangerouslySetInnerHTML={{ __html: block.props.html }} />
        );
      case "columns": {
        const gap =
          block.props.gap === "sm"
            ? "gap-4"
            : block.props.gap === "lg"
              ? "gap-10"
              : "gap-6";
        return (
          <div
            className={cx(
              "grid grid-cols-12",
              gap,
              block.props.stackOnMobile !== false && "max-md:grid-cols-1",
            )}
          >
            {block.props.columns.map((col) => (
              <div
                key={col.id}
                className="min-w-0 space-y-4"
                style={{ gridColumn: `span ${col.span} / span ${col.span}` }}
              >
                {col.blocks.map((b) => (
                  <RenderBlock key={b.id} block={b} doc={doc} nested />
                ))}
              </div>
            ))}
          </div>
        );
      }
      case "buttons":
        return (
          <div
            className={cx(
              "flex flex-wrap gap-3",
              block.props.align === "center" && "justify-center",
              block.props.align === "right" && "justify-end",
            )}
          >
            {block.props.buttons.map((b) => (
              <SmartLink key={b.id} href={b.href} className={btnClass(b.style)}>
                {b.label}
              </SmartLink>
            ))}
          </div>
        );
      case "divider":
        if (block.props.style === "dots") {
          return (
            <p className="text-center text-ink-700/40 tracking-[0.5em]">···</p>
          );
        }
        if (block.props.style === "gradient") {
          return (
            <div className="h-px w-full bg-gradient-to-r from-transparent via-lagoon-500 to-transparent" />
          );
        }
        return (
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-ink-100" />
            {block.props.label && (
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-700/50">
                {block.props.label}
              </span>
            )}
            <div className="h-px flex-1 bg-ink-100" />
          </div>
        );
      case "quote":
        return (
          <blockquote
            className={cx(
              block.props.variant === "card"
                ? "rounded-2xl border border-ink-100 bg-white p-6 shadow-sm"
                : "border-l-4 border-lagoon-500 pl-6",
            )}
          >
            <p className="font-display text-2xl font-medium leading-snug text-ink-900">
              “{block.props.quote}”
            </p>
            {(block.props.author || block.props.role) && (
              <footer className="mt-4 text-sm text-ink-700/70">
                {block.props.author}
                {block.props.role ? ` — ${block.props.role}` : ""}
              </footer>
            )}
          </blockquote>
        );
      case "logoCloud":
        return (
          <>
            {block.props.title && (
              <h2 className="mb-8 text-center font-display text-2xl font-semibold text-ink-900">
                {block.props.title}
              </h2>
            )}
            <div className="flex flex-wrap items-center justify-center gap-8 opacity-70">
              {block.props.logos.map((logo) => {
                const img = logo.src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo.src} alt={logo.name} className="h-10 object-contain" />
                ) : (
                  <span className="text-sm font-semibold">{logo.name}</span>
                );
                return logo.href ? (
                  <SmartLink key={logo.id} href={logo.href}>
                    {img}
                  </SmartLink>
                ) : (
                  <div key={logo.id}>{img}</div>
                );
              })}
            </div>
          </>
        );
      case "video":
        return (
          <div>
            {block.props.title && (
              <h2 className="mb-4 font-display text-2xl font-semibold">
                {block.props.title}
              </h2>
            )}
            <div
              className={cx(
                "overflow-hidden rounded-2xl bg-ink-900",
                block.props.aspect === "4/3" ? "aspect-[4/3]" : "aspect-video",
              )}
            >
              <iframe
                src={youtubeEmbed(block.props.url)}
                title={block.props.title || "Vidéo"}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        );
      case "testimonials":
        return (
          <>
            {block.props.title && (
              <h2 className="mb-8 font-display text-3xl font-semibold text-ink-900">
                {block.props.title}
              </h2>
            )}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {block.props.items.map((item) => (
                <figure
                  key={item.id}
                  className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm"
                >
                  <blockquote className="text-sm leading-relaxed text-ink-700/85">
                    “{item.quote}”
                  </blockquote>
                  <figcaption className="mt-4 flex items-center gap-3">
                    {item.avatar && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.avatar}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <p className="text-sm font-semibold">{item.name}</p>
                      {item.role && (
                        <p className="text-xs text-ink-700/50">{item.role}</p>
                      )}
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </>
        );
      case "gallery": {
        const cols =
          block.props.columns === 2
            ? "sm:grid-cols-2"
            : block.props.columns === 4
              ? "sm:grid-cols-2 lg:grid-cols-4"
              : "sm:grid-cols-2 lg:grid-cols-3";
        return (
          <>
            {block.props.title && (
              <h2 className="mb-8 font-display text-3xl font-semibold">
                {block.props.title}
              </h2>
            )}
            <div className={cx("grid gap-4", cols)}>
              {block.props.images.map((img) => (
                <figure key={img.id} className="overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.src}
                    alt={img.alt}
                    className="aspect-[4/3] w-full object-cover"
                  />
                  {img.caption && (
                    <figcaption className="mt-2 text-xs text-ink-700/60">
                      {img.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </>
        );
      }
      case "formLead":
        return (
          <div>
            <h2 className="font-display text-3xl font-semibold text-ink-900">
              {block.props.title}
            </h2>
            {block.props.intro && (
              <p className="mt-2 text-ink-700/80">{block.props.intro}</p>
            )}
            <form
              className="mt-6 grid max-w-xl gap-3"
              action={
                block.props.mailto
                  ? `mailto:${block.props.mailto}`
                  : undefined
              }
              method="get"
              encType="text/plain"
            >
              {block.props.fields.map((f) => (
                <label key={f.id} className="block text-sm font-medium">
                  {f.label}
                  {f.type === "textarea" ? (
                    <textarea
                      name={f.name}
                      required={f.required}
                      rows={4}
                      className="mt-1 w-full rounded-xl border border-ink-100 px-3 py-2"
                    />
                  ) : (
                    <input
                      type={f.type}
                      name={f.name}
                      required={f.required}
                      className="mt-1 w-full rounded-xl border border-ink-100 px-3 py-2"
                    />
                  )}
                </label>
              ))}
              <button
                type="submit"
                className="mt-2 rounded-full bg-lagoon-600 px-6 py-3 text-sm font-semibold text-white hover:bg-lagoon-700"
              >
                {block.props.submitLabel || "Envoyer"}
              </button>
            </form>
          </div>
        );
      default:
        return null;
    }
  })();

  if (nested) {
    return <div data-block={block.type}>{inner}</div>;
  }
  return <BlockShell block={block}>{inner}</BlockShell>;
}

export function RenderPageBlocks({
  blocks,
  doc,
}: {
  blocks: SiteBlock[];
  doc: SiteDocument;
}) {
  return (
    <>
      {blocks.map((block) => (
        <RenderBlock key={block.id} block={block} doc={doc} />
      ))}
    </>
  );
}
