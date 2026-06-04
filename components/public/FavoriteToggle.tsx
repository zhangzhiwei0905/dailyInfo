"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FavoriteToggle({ url }: Readonly<{ url: string }>) {
  const router = useRouter();
  const [saved, setSaved] = useState(true);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const nextSaved = !saved;
    setSaved(nextSaved);
    setBusy(true);
    try {
      const response = await fetch("/api/favorites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, saved: nextSaved, article: { title: url } }),
      });
      if (!response.ok) throw new Error("favorite failed");
      const data = (await response.json()) as { saved?: boolean };
      const confirmedSaved = Boolean(data.saved);
      setSaved(confirmedSaved);
      if (!confirmedSaved) router.refresh();
    } catch {
      setSaved(saved);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      aria-label={saved ? "取消收藏" : "重新收藏"}
      className={[
        "grid size-10 place-items-center rounded-full text-lg leading-none transition active:scale-95",
        saved
          ? "bg-neutral-950 text-white hover:bg-neutral-800"
          : "bg-white text-neutral-400 ring-1 ring-black/10 hover:text-neutral-950",
        busy ? "opacity-60" : "",
      ].join(" ")}
      disabled={busy}
      onClick={toggle}
      type="button"
    >
      {saved ? "★" : "☆"}
    </button>
  );
}
