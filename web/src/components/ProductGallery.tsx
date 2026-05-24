"use client";

import Image from "next/image";
import { useState } from "react";

export function ProductGallery({
  title,
  images,
}: {
  title: string;
  images: { url: string; id?: string }[];
}) {
  const list = images.length > 0 ? images : [];
  const [active, setActive] = useState(0);
  const current = list[active] ?? null;

  if (!current) {
    return (
      <div className="card flex aspect-square items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-50 text-zinc-400 shadow-soft">
        無圖片
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="card relative aspect-square overflow-hidden shadow-soft">
        <Image
          src={current.url}
          alt={title}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      </div>
      {list.length > 1 && (
        <ul className="flex flex-wrap gap-2">
          {list.map((img, i) => (
            <li key={img.id ?? img.url}>
              <button
                type="button"
                onClick={() => setActive(i)}
                className={`relative h-16 w-16 overflow-hidden rounded-xl ring-2 transition ${
                  i === active ? "ring-orange-500" : "ring-transparent hover:ring-zinc-300"
                }`}
              >
                <Image src={img.url} alt="" fill className="object-cover" sizes="64px" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
