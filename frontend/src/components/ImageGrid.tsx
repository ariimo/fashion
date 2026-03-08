import React from 'react';
import { useRouter } from 'next/navigation';

interface ImageGridProps {
  results: any[];
  lastElementRef: (node: HTMLElement | null) => void;
}

export function ImageGrid({ results, lastElementRef }: ImageGridProps) {
  const router = useRouter();

  return (
    <div className="columns-2 sm:columns-xs gap-4 space-y-4">
      {results.map((res: any, idx: number) => {
        const isLast = results.length === idx + 1;
        return (
          <div
            key={`${res.point_id}-${idx}`}
            ref={isLast ? lastElementRef : null}
            className="relative break-inside-avoid rounded-2xl overflow-hidden group cursor-pointer shadow-sm hover:shadow-xl transition-all"
            onClick={() => router.push(`/search?i=${res.image_id}`)}
            style={{ aspectRatio: `${res.width} / ${res.height}` }}
          >
            <img src={res.url} alt="Result" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
            <div className="absolute top-3 right-3 px-2 py-1 bg-black/50 backdrop-blur-md rounded-full text-white text-[10px] font-bold">
              {(res.score * 100).toFixed(1)}% Match
            </div>
          </div>
        );
      })}
    </div>
  );
}
