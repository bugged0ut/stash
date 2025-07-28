import { useEffect, useRef } from "react";
import { useLocation, useHistory } from "react-router-dom";

interface IScrollPositions {
  [key: string]: number;
}

/**
 * Custom hook to save and restore scroll position when navigating between routes
 *
 * This hook will:
 * 1. Save the scroll position when navigating away from a route
 * 2. Restore the scroll position when navigating back to a route
 * 3. Reset scroll to top when navigating to a new route
 */
export const useScrollRestoration = () => {
  const { pathname, key } = useLocation();
  const history = useHistory();

  // Store scroll positions for each location key
  const scrollPositions = useRef<IScrollPositions>({});

  // Save scroll position before location changes
  useEffect(() => {
    // This will run when the component mounts
    const unlisten = history.listen(() => {
      if (key) {
        scrollPositions.current[key] = window.scrollY;
      }
    });

    // Clean up listener when component unmounts
    return () => {
      unlisten();
    };
  }, [history, key]);

  // Restore scroll position when location changes
  useEffect(() => {
    // Check if we're navigating back (POP action)
    const handleScrollRestoration = () => {
      // Small delay to ensure DOM is updated before scrolling
      requestAnimationFrame(() => {
        // If we have a saved position for this location key, restore it
        if (key && scrollPositions.current[key] !== undefined) {
          window.scrollTo(0, scrollPositions.current[key]);
        } else {
          // Otherwise, scroll to top for new pages
          window.scrollTo(0, 0);
        }
      });
    };

    handleScrollRestoration();

    // Listen for popstate events (browser back/forward buttons)
    window.addEventListener("popstate", handleScrollRestoration);

    return () => {
      window.removeEventListener("popstate", handleScrollRestoration);
    };
  }, [pathname, key]);
};
