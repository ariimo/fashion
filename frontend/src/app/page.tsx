'use client';

import { useEffect, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3000/api/v1/homepage?n=50')
      .then((res) => res.json())
      .then((data) => {
        setImages(data.images);
        setLoading(false);
      })
      .catch((err) => console.error('에러 발생:', err));
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white p-8">
      <header className="mb-12">
        <h1 className="text-3xl font-extrabold text-gray-900">Fashionpedia Explorer</h1>
        <p className="text-gray-500 mt-2">당신을 위한 AI 기반 패션 피드</p>
      </header>

      {/* 이미지 그리드 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {images.map((img) => (
          <Link
            href={`/search?i=${img.image_id}`}
            key={img.image_id} 
            className="group relative aspect-[3/4] overflow-hidden rounded-lg bg-gray-100 cursor-pointer"
          >
            <img
              src={img.url}
              alt={`Fashion ${img.image_id}`}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
              <Search className="text-white h-8 w-8" />
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}