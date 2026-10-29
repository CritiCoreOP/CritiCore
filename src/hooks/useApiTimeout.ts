import { useState, useEffect } from "react";

/**
 * Returns true if loading has been going on for more than `ms` milliseconds
 * without data arriving.
 */
export function useApiTimeout(isLoading: boolean, hasData: boolean, ms = 18000) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!isLoading || hasData) {
      setTimedOut(false);
      return;
    }
    const timer = setTimeout(() => {
      if (isLoading && !hasData) setTimedOut(true);
    }, ms);
    return () => clearTimeout(timer);
  }, [isLoading, hasData, ms]);

  return timedOut;
}
