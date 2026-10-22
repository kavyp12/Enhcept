"use client";

import { useEffect, useRef } from "react";

// Muted loop that only downloads and plays while on screen. Reduced motion: poster only.
// The poster is set on approach too: as an HTML attribute it would download with the page.
export default function LazyVideo({ src, poster, label, className }: { src: string; poster: string; label: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return video.pause();
      video.poster = poster;
      if (!still) video.play().catch(() => {});
    }, { rootMargin: "600px 0px" });
    io.observe(video);
    return () => io.disconnect();
  }, [poster]);
  return <video ref={ref} className={className} src={src} aria-label={label} muted loop playsInline preload="none" />;
}
