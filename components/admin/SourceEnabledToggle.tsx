"use client";

import { useState, useTransition } from "react";

export function SourceEnabledToggle({
  id,
  name,
  enabled,
}: {
  id: string;
  name: string;
  enabled: boolean;
}) {
  const [checked, setChecked] = useState(enabled);
  const [pending, startTransition] = useTransition();

  function updateEnabled(nextChecked: boolean) {
    const previous = checked;
    setChecked(nextChecked);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", id);
      formData.set("enabled", nextChecked ? "on" : "off");

      try {
        const response = await fetch("/admin/sources/toggle", {
          method: "POST",
          body: formData,
          headers: {
            "x-dailybrief-async": "1",
          },
        });
        if (!response.ok) {
          setChecked(previous);
        }
      } catch {
        setChecked(previous);
      }
    });
  }

  return (
    <form
      action="/admin/sources/toggle"
      method="post"
      className="flex items-center gap-2"
      onClick={(event) => event.stopPropagation()}
    >
      <input type="hidden" name="id" value={id} />
      <label className="relative inline-flex h-7 w-12 cursor-pointer items-center">
        <input
          aria-label={`${name} ${enabled ? "停用" : "启用"}`}
          className="peer sr-only"
          name="enabled"
          type="checkbox"
          checked={checked}
          disabled={pending}
          onChange={(event) => updateEnabled(event.currentTarget.checked)}
        />
        <span className="absolute inset-0 rounded-full bg-neutral-300 shadow-inner transition peer-checked:bg-emerald-500 peer-disabled:opacity-60" />
        <span className="absolute left-1 size-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
      </label>
      <span className={checked ? "text-xs font-medium text-emerald-700" : "text-xs font-medium text-neutral-400"}>
        {pending ? "更新中" : checked ? "启用" : "停用"}
      </span>
    </form>
  );
}
