'use client';

import { useEffect, useState, Suspense, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const imageId = searchParams.get('i');
  const annId = searchParams.get('a');
  
  const [data, setData] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [hoveredAnnId, setHoveredAnnId] = useState<string | null>(null);

  // 💡 무한 스크롤 관찰자
  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && nextOffset !== null) {
        fetchData(nextOffset);
      }
    });

    if (node) observer.current.observe(node);
  }, [loading, hasMore, nextOffset]);

  // 💡 데이터 페칭 함수
  const fetchData = useCallback(async (offset: number | null) => {
    if (!imageId || loading) return;
    setLoading(true);

    const annParam = annId ? `&a=${annId}` : '';
    const offsetParam = offset !== null ? `&offset=${offset}` : '';
    const url = `http://localhost:3000/api/v1/search?i=${imageId}${annParam}${offsetParam}&n=30`;

    try {
      const res = await fetch(url);
      const json = await res.json();

      if (offset === null) {
        setData(json);
        setResults(json.results);
      } else {
        setResults(prev => [...prev, ...json.results]);
      }

      setNextOffset(json.next_offset);
      setHasMore(json.next_offset !== null);
    } catch (err) {
      console.error('검색 에러:', err);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [imageId, annId]);

  useEffect(() => {
    fetchData(null);
  }, [imageId, annId, fetchData]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setNaturalSize({ width: naturalWidth, height: naturalHeight });
  };

  if (!data && loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <Link href="/" className="inline-flex items-center text-blue-600 hover:underline mb-8">
        <ArrowLeft className="mr-2 h-4 w-4" /> 메인 피드로 돌아가기
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <div className="relative inline-block w-full overflow-hidden rounded-3xl bg-white shadow-xl group leading-[0] flex flex-col">
              <img
                src={data?.target.url}
                alt="Target"
                className="w-full h-auto block m-0 p-0 relative z-0"
                onLoad={handleImageLoad}
              />

              {naturalSize.width > 0 && (
                <svg 
                  className="absolute inset-0 w-full h-full pointer-events-none z-10"
                  viewBox={`0 0 ${naturalSize.width} ${naturalSize.height}`}
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="naturalRainbowGradient" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="300" spreadMethod="repeat">
                      <stop offset="0%" stopColor="#ff5e6c" stopOpacity="0.3" />
                      <stop offset="20%" stopColor="#ffaa5e" stopOpacity="0.3" />
                      <stop offset="40%" stopColor="#fff15e" stopOpacity="0.3" />
                      <stop offset="60%" stopColor="#5eff8b" stopOpacity="0.3" />
                      <stop offset="80%" stopColor="#5ec0ff" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#ff5e6c" stopOpacity="0.3" /> 
                      
                      <animateTransform 
                        attributeName="gradientTransform" 
                        type="translate" 
                        from="0,0" to="0,300" 
                        dur="3s" repeatCount="indefinite" 
                      />
                    </linearGradient>
                  </defs>

                  {data?.target.annotations?.map((ann: any, idx: number) => {
                    // 💡 에러 방지 핵심: segmentation이 배열인지 반드시 확인합니다.
                    if (!Array.isArray(ann.segmentation)) return null;

                    const currentAnnId = ann.id?.toString();
                    const isSelected = annId === currentAnnId;
                    const isHovered = hoveredAnnId === currentAnnId;

                    return (
                      <g 
                        key={idx}
                        onMouseEnter={() => setHoveredAnnId(currentAnnId)}
                        onMouseLeave={() => setHoveredAnnId(null)}
                        onClick={() => router.push(`/search?i=${imageId}&a=${ann.id}`)}
                        className="cursor-pointer pointer-events-auto"
                      >
                        {ann.segmentation.map((seg: number[], sIdx: number) => (
                          <polygon
                            key={sIdx}
                            points={seg.reduce((acc, val, i) => acc + (i % 2 === 0 ? val : ',' + val + ' '), '')}
                            fill={isSelected || isHovered ? "url(#naturalRainbowGradient)" : "transparent"}
                            stroke={isSelected || isHovered ? "white" : "transparent"}
                            strokeWidth="3"
                          />
                        ))}
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold mb-6">추천 스타일</h2>
          {/* 💡 유동적 Masonry 레이아웃 적용 */}
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
          {loading && (
            <div className="flex py-12 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-blue-500" /></div>}>
      <SearchContent />
    </Suspense>
  );
}