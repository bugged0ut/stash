import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

interface IScrollPositions {
  [pathAndSearch: string]: number;
}

/**
 * Custom hook for scroll restoration in React Router v5.
 *
 * Saves scroll positions keyed by pathname+search (not by history key) so that
 * positions survive history.replace() calls that keep the same URL.
 *
 * Detects back/forward navigation by tracking which history keys have been
 * visited before. This is done in the render phase (before effects) to avoid
 * the timing issue where history.listen callbacks fire AFTER effects for POP
 * navigation: React Router's listener calls setState -> synchronous re-render
 * and effects complete -> only THEN does our history.listen callback fire.
 */
export const useScrollRestoration = () => {
  const { pathname, search, key } = useLocation();
  const scrollPositions = useRef<IScrollPositions>({});
  // Set of all history keys we have visited
  const visitedKeys = useRef<Set<string>>(new Set());
  const prevStorageKeyRef = useRef<string | undefined>(undefined);

  // The canonical storage key for this page (path + query string)
  const storageKey = `${pathname}${search}`;

  // --- Render-phase work (runs before effects) ---
  // Check whether this key was already visited BEFORE we mark it visited,
  // so we can reliably detect back/forward navigation in the effect below.
  const isRevisitingKey = key ? visitedKeys.current.has(key) : false;
  // Now mark the key as visited for future checks.
  if (key) {
    visitedKeys.current.add(key);
  }

  // Save scroll position continuously while on this page.
  // "key" is intentionally NOT in deps: we only want to re-run when the URL
  // (pathname+search) actually changes. If history.replace() changes only the
  // key while keeping the same URL, we must NOT run cleanup, which would
  // overwrite the correctly-saved scroll position with window.scrollY=0.
  useEffect(() => {
    const currentStorageKey = storageKey;
    let lastLogged = -1;
    const saveScrollPosition = () => {
      const y = window.scrollY;
      scrollPositions.current[currentStorageKey] = y;
      // Log only when position changes significantly (>10px) to avoid spam
      if (Math.abs(y - lastLogged) > 10) {
        lastLogged = y;
        console.debug(
          `[ScrollRestoration] Saved scroll for "${currentStorageKey}": ${y}`
        );
      }
    };

    const existingValue = scrollPositions.current[currentStorageKey];
    console.debug(
      `[ScrollRestoration] Tracking storageKey="${currentStorageKey}" (history key=${key}) existingStoredValue=${existingValue}`
    );

    window.addEventListener("scroll", saveScrollPosition, { passive: true });
    const intervalId = setInterval(saveScrollPosition, 500);

    return () => {
      window.removeEventListener("scroll", saveScrollPosition);
      clearInterval(intervalId);
      // Save one final time when navigating away from this URL
      saveScrollPosition();
      console.debug(
        `[ScrollRestoration] Saved on cleanup storageKey="${currentStorageKey}" scrollY=${window.scrollY} stored=${scrollPositions.current[currentStorageKey]}`
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Handle scroll restoration on location changes.
  useEffect(() => {
    const prevStorageKey = prevStorageKeyRef.current;
    prevStorageKeyRef.current = storageKey;

    console.debug(
      `[ScrollRestoration] Location effect fired: storageKey="${storageKey}" prevStorageKey="${prevStorageKey}" key=${key} isRevisit=${isRevisitingKey}`
    );
    console.debug(
      `[ScrollRestoration] Saved positions:`,
      JSON.stringify(scrollPositions.current)
    );

    // Safety guard: if the URL somehow didn't change, do nothing.
    // (In practice this shouldn't fire since the effect only runs when
    // storageKey changes, but kept as a safeguard.)
    if (storageKey === prevStorageKey) {
      console.debug(
        `[ScrollRestoration] Same URL, key-only change - skipping scroll reset`
      );
      return;
    }

    if (!isRevisitingKey) {
      // Fresh navigation (key never seen before = PUSH or first load): scroll to top.
      console.debug(
        `[ScrollRestoration] Fresh navigation (new key) - scrolling to top`
      );
      window.scrollTo(0, 0);
      return;
    }

    // Revisiting a key we have seen before (back or forward navigation):
    // attempt to restore the saved scroll position.
    const targetScrollY = scrollPositions.current[storageKey];
    console.debug(
      `[ScrollRestoration] Revisit detected. targetScrollY=${targetScrollY} for storageKey="${storageKey}"`
    );
    if (targetScrollY === undefined || targetScrollY <= 0) {
      console.debug(
        `[ScrollRestoration] No saved scroll position or position is 0 - skipping restore`
      );
      return;
    }

    let attempts = 0;
    const maxAttempts = 50; // Try for up to 5 seconds (50 x 100ms)
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
        console.debug(`[ScrollRestoration] User interacted - stopping restore`);
        clearInterval(intervalId);
        cleanup();
        return;
      }

      const maxScrollY =
        document.documentElement.scrollHeight - window.innerHeight;

      if (attempts === 1 || attempts % 5 === 0) {
        console.debug(
          `[ScrollRestoration] Restore attempt ${attempts}/${maxAttempts}: maxScrollY=${maxScrollY} targetScrollY=${targetScrollY} scrollHeight=${document.documentElement.scrollHeight}`
        );
      }

      if (maxScrollY >= targetScrollY || attempts >= maxAttempts) {
        console.debug(
          `[ScrollRestoration] Restoring scroll to ${targetScrollY} (attempt ${attempts}, maxScrollY=${maxScrollY})`
        );
        window.scrollTo(0, targetScrollY);
        clearInterval(intervalId);
        cleanup();
      }
    }, 100);

    return () => {
      console.debug(
        `[ScrollRestoration] Interval cleanup after ${attempts} attempts`
      );
      clearInterval(intervalId);
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);
};
