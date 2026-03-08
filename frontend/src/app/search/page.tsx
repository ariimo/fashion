'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const imageId = searchParams.get('i');
  const annId = searchParams.get('a');
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  
  // 💡 호버 중인 아이템의 ID를 추적하기 위한 새로운 상태
  const [hoveredAnnId, setHoveredAnnId] = useState<string | null>(null);

  useEffect(() => {
    if (!imageId) return;
    setLoading(true);
    const annParam = annId ? `&a=${annId}` : '';

    fetch(`http://localhost:3000/api/v1/search?i=${imageId}${annParam}`)
      .then((res) => res.json())
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch((err) => console.error('검색 에러:', err));
  }, [imageId, annId]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setNaturalSize({ width: naturalWidth, height: naturalHeight });
  };

  if (loading) {
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
                src={data.target.url}
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
                    <linearGradient 
                      id="naturalRainbowGradient" 
                      gradientUnits="userSpaceOnUse" 
                      x1="0" y1="0" x2="0" y2="300" // 300px 주기의 반복 패턴
                      spreadMethod="repeat"
                    >
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

                  {data.target.annotations?.map((ann: any, idx: number) => {
                    if (!ann.segmentation || !Array.isArray(ann.segmentation)) return null;

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
                        {ann.segmentation.map((singleSeg: number[], segIdx: number) => {
                          const points = singleSeg.reduce((acc: any, val: any, i: number) => 
                            acc + (i % 2 === 0 ? val : ',' + val + ' '), '');

                          return (
                            <polygon
                              key={`${idx}-${segIdx}`}
                              points={points}
                              fill={isSelected || isHovered ? "url(#naturalRainbowGradient)" : "transparent"}
                              stroke={isSelected || isHovered ? "white" : "transparent"}
                              strokeWidth="3"
                              className="transition-all duration-300"
                            />
                          );
                        })}
                        <title>{ann.category_name || ann.category}</title>
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
            <p className="mt-4 text-center text-sm text-gray-400 font-medium italic">
              "사진 속 아이템을 클릭해 보세요! ✨"
            </p>
          </div>
        </div>

        {/* 오른쪽 추천 결과 (기존 Masonry 스타일 유지) */}
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold mb-6">
            {annId ? `"${data.target.annotations.find((a:any) => a.id.toString() === annId)?.category}" 추천 스타일` : '유사한 스타일 추천'}
          </h2>

          <div className="flex gap-4 items-start">
            {[0, 1, 2].map((colIdx) => (
              <div key={colIdx} className="flex-1 flex flex-col gap-4">
                {data.results

                  .filter((_: any, index: number) => index % 3 === colIdx)
                  .map((res: any, idx: number) => (
                    <div 
                      key={`${res.image_id}-${idx}`} 
                      className="relative rounded-2xl overflow-hidden group cursor-pointer shadow-sm hover:shadow-xl transition-all"
                      onClick={() => router.push(`/search?i=${res.image_id}`)}
                      style={{ aspectRatio: `${res.width} / ${res.height}` }}
                    >
                      <img 
                        src={res.url} 
                        alt="Result" 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                      />
                      <div className="absolute top-3 right-3 px-2 py-1 bg-black/50 backdrop-blur-md rounded-full text-white text-[10px] font-bold">
                        {(res.score * 100).toFixed(1)}% Match
                      </div>
                      
                      {/* 호버 시 간단한 정보창 (선택 사항) */}
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                        <p className="text-white text-[10px] font-medium truncate">{res.description}</p>
                      </div>
                    </div>
                  ))}
              </div>
            ))}
          </div>
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