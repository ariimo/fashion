'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { useSearchSimilarItems } from '@/hooks/useSearchSimilarItems';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { TargetImage } from '@/components/TargetImage';
import { ImageGrid } from '@/components/ImageGrid';

function SearchContent() {
  const searchParams = useSearchParams();
  const imageId = searchParams.get('i');
  const annId = searchParams.get('a');
  
  const { data, results, loading, hasMore, fetchNextPage } = useSearchSimilarItems(imageId, annId);

  const lastElementRef = useIntersectionObserver({
    loading,
    hasMore,
    onIntersect: fetchNextPage,
  });

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
          <TargetImage data={data} imageId={imageId} annId={annId} />
        </div>

        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold mb-6">추천 스타일</h2>
          <ImageGrid results={results} lastElementRef={lastElementRef} />
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
