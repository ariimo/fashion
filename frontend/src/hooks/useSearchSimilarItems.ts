import { useState, useCallback, useEffect, useRef } from 'react';

export function useSearchSimilarItems(imageId: string | null, annId: string | null) {
  const [data, setData] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const isFetching = useRef(false);

  const fetchData = useCallback(async (offset: number | null) => {
    if (!imageId || isFetching.current) return;

    isFetching.current = true;
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
      isFetching.current = false;
    }
  }, [imageId, annId]); // Removed `loading` from dependencies to prevent infinite loop

  useEffect(() => {
    fetchData(null);
  }, [imageId, annId, fetchData]);

  const fetchNextPage = useCallback(() => {
    if (hasMore && !loading && nextOffset !== null) {
      fetchData(nextOffset);
    }
  }, [hasMore, loading, nextOffset, fetchData]);

  return { data, results, loading, hasMore, fetchNextPage };
}
