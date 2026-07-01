"use client";

import { useEffect, useState } from "react";
import { Upload, X } from "lucide-react";
import { saveScreenshot, getScreenshotURL, remove } from "@/lib/db";

export function ScreenshotUpload({
  ids,
  onChange,
}: {
  ids: string[];
  onChange: (next: string[]) => void;
}) {
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = {};
      for (const id of ids) {
        if (urls[id]) { next[id] = urls[id]; continue; }
        const u = await getScreenshotURL(id);
        if (u) next[id] = u;
      }
      if (!cancelled) setUrls(next);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join("|")]);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const newIds: string[] = [];
    for (const file of Array.from(files)) {
      const id = await saveScreenshot(file, file.name);
      newIds.push(id);
    }
    onChange([...ids, ...newIds]);
  }

  async function removeOne(id: string) {
    await remove("screenshots", id);
    onChange(ids.filter((x) => x !== id));
  }

  return (
    <div>
      <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-[var(--color-border)] rounded-lg cursor-pointer hover:border-[var(--color-accent-dim)] transition-colors">
        <Upload size={16} className="text-[var(--color-text-muted)]" />
        <span className="text-sm text-[var(--color-text-muted)]">
          Drop or paste chart screenshots
        </span>
        <input
          type="file"
          className="hidden"
          multiple
          accept="image/*"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>
      {ids.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {ids.map((id) => (
            <div key={id} className="relative group">
              {urls[id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={urls[id]}
                  alt="screenshot"
                  className="w-full h-24 object-cover rounded-lg border border-[var(--color-border-soft)]"
                />
              ) : (
                <div className="w-full h-24 rounded-lg bg-[var(--color-surface-2)]" />
              )}
              <button
                type="button"
                onClick={() => removeOne(id)}
                className="absolute top-1 right-1 p-1 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
