/** Liens iOS splash / Apple touch — hors Metadata API Next (media queries). */
export function PwaHeadLinks() {
  const splashes: { href: string; media: string }[] = [
    // iPhone 16 Pro Max / 15 Pro Max
    {
      href: "/splash/iphone-14-pro-max.png",
      media:
        "(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3)",
    },
    {
      href: "/splash/iphone-14-pro-max.png",
      media:
        "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)",
    },
    // iPhone 16 Pro / 15 Pro
    {
      href: "/splash/iphone-14-pro.png",
      media:
        "(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3)",
    },
    {
      href: "/splash/iphone-14-pro.png",
      media:
        "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)",
    },
    {
      href: "/splash/iphone-12-13.png",
      media:
        "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)",
    },
    {
      href: "/splash/iphone-12-pro-max.png",
      media:
        "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)",
    },
    {
      href: "/splash/iphone-x.png",
      media:
        "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)",
    },
    {
      href: "/splash/iphone-xs-max.png",
      media:
        "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)",
    },
    {
      href: "/splash/iphone-xr.png",
      media:
        "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)",
    },
    {
      href: "/splash/iphone-8.png",
      media:
        "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)",
    },
    // iPad Pro 13" M4
    {
      href: "/splash/ipad-pro-12.png",
      media:
        "(device-width: 1032px) and (device-height: 1376px) and (-webkit-device-pixel-ratio: 2)",
    },
    {
      href: "/splash/ipad-pro-12.png",
      media:
        "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)",
    },
    {
      href: "/splash/ipad-pro-11.png",
      media:
        "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)",
    },
    {
      href: "/splash/ipad.png",
      media:
        "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)",
    },
  ];

  return (
    <>
      <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href="/icons/apple-touch-icon.png"
      />
      <link
        rel="apple-touch-icon-precomposed"
        href="/icons/apple-touch-icon.png"
      />
      <link rel="mask-icon" href="/icons/icon-512.png" color="#337AB7" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-title" content="Akiba One" />
      <meta
        name="apple-mobile-web-app-status-bar-style"
        content="black-translucent"
      />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="application-name" content="Akiba One" />
      <meta name="msapplication-TileColor" content="#337AB7" />
      <meta name="msapplication-config" content="/browserconfig.xml" />
      <meta name="format-detection" content="telephone=no" />
      <meta name="apple-touch-fullscreen" content="yes" />
      {splashes.map((s) => (
        <link
          key={`${s.href}-${s.media}`}
          rel="apple-touch-startup-image"
          href={s.href}
          media={s.media}
        />
      ))}
    </>
  );
}
