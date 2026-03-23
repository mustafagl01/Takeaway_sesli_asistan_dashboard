'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AutoRefreshOnVisibleProps {
  intervalMs?: number;
}

export default function AutoRefreshOnVisible({
  intervalMs = 10000,
}: AutoRefreshOnVisibleProps) {
  const router = useRouter();

  useEffect(() => {
    let isRefreshing = false;

    const refresh = async () => {
      if (document.hidden || isRefreshing) {
        return;
      }

      isRefreshing = true;
      router.refresh();

      // Give the route refresh a short window before allowing the next poll.
      window.setTimeout(() => {
        isRefreshing = false;
      }, 1000);
    };

    const intervalId = window.setInterval(() => {
      void refresh();
    }, intervalMs);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void refresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [intervalMs, router]);

  return null;
}
