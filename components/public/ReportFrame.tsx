"use client";

import { useEffect, useRef, useState } from "react";

export function ReportFrame({ html, title }: Readonly<{ html: string; title: string }>) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(1200);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const resize = () => {
      const doc = frame.contentDocument;
      if (!doc) return;
      const nextHeight = Math.max(
        doc.documentElement.scrollHeight,
        doc.body?.scrollHeight ?? 0,
        800,
      );
      setHeight(nextHeight);
    };

    frame.addEventListener("load", resize);
    const timer = window.setInterval(resize, 500);
    resize();
    return () => {
      frame.removeEventListener("load", resize);
      window.clearInterval(timer);
    };
  }, [html]);

  return (
    <iframe
      ref={frameRef}
      className="block w-full border-0 bg-transparent"
      srcDoc={html}
      title={title}
      style={{ height }}
    />
  );
}
