'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Loader2, Search } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const observer = useRef<IntersectionObserver | null>(null);

  // 💡 데이터 로딩 함수 
  const fetchImages = useCallback((pageNum: number) => {
    setLoading(true);
    // 현재는 n=50으로 고정이지만, 나중에 page 파라미터를 추가해 서버에서 처리 가능
    fetch(`http://localhost:3000/api/v1/homepage?n=50&page=${pageNum}`)
      .then((res) => res.json())
      .then((data) => {
        setImages((prev) => [...prev, ...data.images]);
        setLoading(false);
      })
      .catch((err) => console.error('에러 발생:', err));
  }, []);

  useEffect(() => {
    fetchImages(1);
  }, [fetchImages]);

  return (
    <main className="min-h-screen bg-white p-4 md:p-8">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Fashionpedia</h1>
        <p className="text-gray-500 mt-2 font-medium">당신의 스타일을 찾는 가장 스마트한 방법</p>
      </header>

      {/* 💡 Masonry Grid: columns 속성 사용 */}
      <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
        {images.map((img, idx) => (
          <Link
            href={`/search?i=${img.image_id}`}
            key={`${img.image_id}-${idx}`} 
            className="relative break-inside-avoid group block overflow-hidden rounded-2xl bg-gray-50 transition-all hover:shadow-2xl"
            // 💡 Aspect Ratio를 인라인 스타일로 지정하여 레이아웃 시프트 방지
            style={{ aspectRatio: `${img.width} / ${img.height}` }}
          >
            <img
              src={img.url}
              alt={`Fashion ${img.image_id}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 flex flex-col items-center justify-center text-white p-4">
              <Search className="h-8 w-8 mb-2 transform translate-y-2 transition-transform group-hover:translate-y-0" />
              <span className="text-sm font-bold uppercase tracking-wider">Search Similar</span>
            </div>
          </Link>
        ))}
      </div>

      {loading && (
        <div className="flex py-12 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      )}
    </main>
  );
}