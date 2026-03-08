'use client';

import { Loader2, Search } from 'lucide-react';
import Link from 'next/link';
import { useHomepageFeed } from '@/hooks/useHomepageFeed';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

export default function Home() {
  const { images, loading, hasMore, fetchNextPage } = useHomepageFeed();
  
  const lastImageElementRef = useIntersectionObserver({
    loading,
    hasMore,
    onIntersect: fetchNextPage,
  });

  return (
    <main className="min-h-screen bg-white p-4 md:p-8">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight italic">Fashionpedia</h1>
        <p className="text-gray-500 mt-2 font-medium">당신의 스타일을 찾는 가장 스마트한 방법</p>
      </header>

      {/* 💡 기존 columns 레이아웃 유지 */}
      <div className="columns-3xs sm:columns-xs gap-4 space-y-4">
        {images.map((img, idx) => {
          const isLastImage = images.length === idx + 1;
          
          return (
            <Link
              href={`/search?i=${img.image_id}`}
              key={`${img.image_id}-${idx}`}
              ref={isLastImage ? (lastImageElementRef as any) : null}
              className="relative break-inside-avoid group block overflow-hidden rounded-2xl bg-gray-100 transition-all hover:shadow-2xl"
              style={{ aspectRatio: `${img.width} / ${img.height}` }}
            >
              <img
                src={img.url}
                alt={`Fashion ${img.image_id}`}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 flex flex-col items-center justify-center text-white p-4">
                <Search className="h-8 w-8 mb-2 transform translate-y-2 transition-transform group-hover:translate-y-0" />
                <span className="text-sm font-bold uppercase tracking-wider">Search Similar</span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="flex flex-col items-center justify-center py-12">
        {loading && <Loader2 className="h-8 w-8 animate-spin text-blue-500" />}
        {!hasMore && images.length > 0 && (
          <p className="text-gray-400 py-10 italic font-medium">✨ 모든 스타일을 확인하셨습니다. ✨</p>
        )}
      </div>
    </main>
  );
}
