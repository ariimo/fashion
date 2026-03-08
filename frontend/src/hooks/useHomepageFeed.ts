import { useState, useCallback, useRef, useEffect } from 'react';

export function useHomepageFeed() {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextOffset, setNextOffset] = useState<string | number | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const isFetching = useRef(false);

  const fetchImages = useCallback(async (offset: string | number | null) => {
    if (isFetching.current) return;

    isFetching.current = true;
    setLoading(true);

    const hasOffset = offset !== null && offset !== undefined && offset !== 'null' && offset !== 'undefined';
    const queryOffset = hasOffset ? `&offset=${offset}` : '';
    const url = `http://localhost:3000/api/v1/homepage?n=50${queryOffset}`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`API Error (Status: ${res.status}) on URL: ${url}`);
      }
      const data = await res.json();

      if (data?.images && Array.isArray(data.images)) {
        setImages((prev) => [...prev, ...data.images]);
        setNextOffset(data.next_offset);
        if (!data.next_offset) setHasMore(false);
      } else {
        setHasMore(false);
      }
    } catch (err: any) {
      console.error('Fetch error:', err.message);
      setHasMore(false);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, []); // Removed `loading` from dependencies to prevent infinite loop

  useEffect(() => {
    fetchImages(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchNextPage = useCallback(() => {
    if (hasMore && !loading) {
      fetchImages(nextOffset);
    }
  }, [hasMore, loading, nextOffset, fetchImages]);

  return { images, loading, hasMore, fetchNextPage };
}
