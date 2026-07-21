import { useEffect, useRef } from "react";
import { useHistory, useLocation } from "react-router-dom";

interface IScrollPositions {
  [key: string]: number;
}

/**
 * Custom hook for scroll restoration in React Router v5
 * Saves scroll positions by location key and restores them when navigating back
 */
export const useScrollRestoration = () => {
  const { pathname, key } = useLocation();
  const history = useHistory();
  const scrollPositions = useRef<IScrollPositions>({});
  const isBackNavigation = useRef(false);

  // Save scroll position continuously
  useEffect(() => {
    const saveScrollPosition = () => {
      if (key) {
        scrollPositions.current[key] = window.scrollY;
      }
    };

    window.addEventListener("scroll", saveScrollPosition, { passive: true });

    const intervalId = setInterval(saveScrollPosition, 1000);

    return () => {
      window.removeEventListener("scroll", saveScrollPosition);
      clearInterval(intervalId);
      saveScrollPosition();
    };
  }, [key]);

  // Track navigation actions
  useEffect(() => {
    const unlisten = history.listen((_location, action) => {
      isBackNavigation.current = action === "POP";

      const currentKey = history.location.key;
      if (currentKey) {
        scrollPositions.current[currentKey] = window.scrollY;
      }
    });

    return () => {
      unlisten();
    };
  }, [history]);

  // Handle scroll restoration
  useEffect(() => {
    if (!key) return;

    if (!isBackNavigation.current) {
      window.scrollTo(0, 0);
      return;
    }

    const targetScrollY = scrollPositions.current[key];
    if (targetScrollY === undefined || targetScrollY <= 0) return;

    let attempts = 0;
    const maxAttempts = 30; // Try for up to 3 seconds
    let userInteracted = false;

    const onUserInteraction = () => {
      userInteracted = true;
    };

    window.addEventListener("wheel", onUserInteraction, { passive: true });
    window.addEventListener("touchmove", onUserInteraction, { passive: true });
    window.addEventListener("mousedown", onUserInteraction, { passive: true });
    window.addEventListener("keydown", onUserInteraction, { passive: true });

    const cleanup = () => {
      window.removeEventListener("wheel", onUserInteraction);
      window.removeEventListener("touchmove", onUserInteraction);
      window.removeEventListener("mousedown", onUserInteraction);
      window.removeEventListener("keydown", onUserInteraction);
    };

    const intervalId = setInterval(() => {
      attempts++;

      if (userInteracted) {
        clearInterval(intervalId);
        cleanup();
        return;
      }

      const maxScrollY =
        document.documentElement.scrollHeight - window.innerHeight;

      if (maxScrollY >= targetScrollY || attempts >= maxAttempts) {
        window.scrollTo(0, targetScrollY);
        clearInterval(intervalId);
        cleanup();
      }
    }, 100);

    return () => {
      clearInterval(intervalId);
      cleanup();
    };
  }, [pathname, key]);

  // Save current position on unmount
  useEffect(() => {
    return () => {
      if (key) {
        scrollPositions.current[key] = window.scrollY;
      }
    };
  }, []);
};
