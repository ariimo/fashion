import { useRef, useCallback } from 'react';

interface UseIntersectionObserverProps {
  loading: boolean;
  hasMore: boolean;
  onIntersect: () => void;
}

export function useIntersectionObserver({ loading, hasMore, onIntersect }: UseIntersectionObserverProps) {
  const observer = useRef<IntersectionObserver | null>(null);

  const lastElementRef = useCallback((node: HTMLElement | null) => {
    // 💡 Prevent observing new nodes while loading, but ALWAYS allow unmounting/disconnecting
    if (loading && node !== null) return;

    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        onIntersect();
      }
    });

    if (node) observer.current.observe(node);
  }, [loading, hasMore, onIntersect]);

  return lastElementRef;
}
