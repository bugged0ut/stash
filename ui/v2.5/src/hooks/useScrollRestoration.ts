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
  
  // Save scroll position before route changes
  useEffect(() => {
    const unlisten = history.listen((_location, action) => {
      // Save the current scroll position with the current location key
      const currentKey = history.location.key;
      if (currentKey) {
        scrollPositions.current[currentKey] = window.scrollY;
      }
      
      // Set isBackNavigation flag when using browser back/forward buttons
      isBackNavigation.current = action === 'POP';
    });
    
    return () => {
      unlisten();
    };
  }, [history]);
  
  // Handle scroll restoration
  useEffect(() => {
    if (!key) return;
    
    // Use a small delay to ensure DOM has updated
    const timeoutId = setTimeout(() => {
      if (isBackNavigation.current && scrollPositions.current[key] !== undefined) {
        // Restore position when navigating back
        window.scrollTo(0, scrollPositions.current[key]);
      } else if (!isBackNavigation.current) {
        // Scroll to top for new navigation (not back/forward)
        window.scrollTo(0, 0);
      }
    }, 10);
    
    return () => clearTimeout(timeoutId);
  }, [pathname, key]);
  
  // Save current position on unmount
  useEffect(() => {
    return () => {
      if (key) {
        scrollPositions.current[key] = window.scrollY;
      }
    };
  }, [key]);
};
