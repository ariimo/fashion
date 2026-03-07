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

  useEffect(() => {
    if (!imageId) return;
    setLoading(true);
    const annParam = annId ? `&a=${annId}` : '';

    fetch(`http://localhost:3000/api/v1/search?i=${imageId}${annParam}`)
      .then((res) => res.json())
      .then((result) => {
        console.log("새로운 검색 결과:", result.results.map(r => ({ id: r.image_id, score: r.score })));
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
            <div className="relative inline-block w-full overflow-hidden rounded-3xl bg-white shadow-xl group">
              <img
                src={data.target.url}
                alt="Target"
                className="w-full h-auto block"
                onLoad={handleImageLoad}
              />

              {/* 💡 SVG 오버레이 */}
              <svg 
                className="absolute inset-0 w-full h-full pointer-events-none z-10"
                viewBox={`0 0 ${naturalSize.width} ${naturalSize.height}`}
              >
                <defs>
                  {/* 💡 은은한 파스텔톤 무지개 그라데이션 (스캔용) */}
                  <linearGradient id="naturalRainbowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    {/* 조금 더 선명해진 파스텔 무지개 스펙트럼 */}
                    <stop offset="0%" stopColor="#ff5e6c" stopOpacity="0.8"> {/* 로즈 핑크 */}
                      <animate attributeName="offset" values="-1; 1.5" dur="2s" repeatCount="indefinite" />
                    </stop>
                    <stop offset="20%" stopColor="#ffaa5e" stopOpacity="0.8"> {/* 샐먼 오렌지 */}
                      <animate attributeName="offset" values="-0.8; 1.7" dur="2s" repeatCount="indefinite" />
                    </stop>
                    <stop offset="40%" stopColor="#fff15e" stopOpacity="0.8"> {/* 선샤인 옐로우 */}
                      <animate attributeName="offset" values="-0.6; 1.9" dur="2s" repeatCount="indefinite" />
                    </stop>
                    <stop offset="60%" stopColor="#5eff8b" stopOpacity="0.8"> {/* 에메랄드 민트 */}
                      <animate attributeName="offset" values="-0.4; 2.1" dur="2s" repeatCount="indefinite" />
                    </stop>
                    <stop offset="80%" stopColor="#5ec0ff" stopOpacity="0.8"> {/* 스카이 블루 */}
                      <animate attributeName="offset" values="-0.2; 2.3" dur="2s" repeatCount="indefinite" />
                    </stop>
                    <stop offset="100%" stopColor="#b19eff" stopOpacity="0.8"> {/* 소프트 퍼플 */}
                      <animate attributeName="offset" values="0; 2.5" dur="2s" repeatCount="indefinite" />
                    </stop>
                  </linearGradient>
                </defs>

                {naturalSize.width > 0 && data.target.annotations?.map((ann: any, idx: number) => {
                  if (!ann.segmentation || ann.segmentation.length === 0) return null;
                  
                  const points = ann.segmentation[0]
                    .reduce((acc: any, val: any, i: number) => 
                      acc + (i % 2 === 0 ? val : ',' + val + ' '), '');

                  const isSelected = annId === ann.id?.toString();

                  return (
                    <polygon
                      key={idx}
                      points={points}
                      // 💡 파스텔 무지개 적용
                      fill="url(#naturalRainbowGradient)"
                      className={`fashion-polygon ${isSelected ? 'selected-polygon' : ''}`}
                      onClick={() => router.push(`/search?i=${imageId}&a=${ann.id}`)}
                    >
                      <title>{ann.category}</title>
                    </polygon>
                  );
                })}
              </svg>
            </div>
            <p className="mt-4 text-center text-sm text-gray-400 font-medium italic">
              "사진 속 아이템을 클릭해 보세요! ✨"
            </p>
          </div>
        </div>

        {/* 오른쪽 추천 결과 (기존 유지) */}
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold mb-6">
            {annId ? `"${data.target.annotations.find((a:any) => a.id.toString() === annId)?.category}" 추천 스타일` : '유사한 스타일 추천'}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {data.results.map((res: any, idx: number) => (
              <div 
                key={idx} 
                className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer"
                onClick={() => router.push(`/search?i=${res.image_id}`)}
              >
                <img 
                  src={res.url} 
                  alt="Result" 
                  className="w-full aspect-[3/4] object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-3 right-3 px-2 py-1 bg-black/50 backdrop-blur-md rounded-full text-white text-[10px] font-bold">
                  {(res.score * 100).toFixed(1)}% Match
                </div>
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