import { useState, useEffect } from 'react';

/**
 * Hook to detect responsive breakpoints
 * Returns an object with boolean flags for different screen sizes
 *
 * @returns {Object} Object with properties: isMobile, isTablet, isDesktop, screenWidth
 */
interface ScreenSize {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isSmallMobile: boolean;
  screenWidth: number;
}

export const useResponsive = (): ScreenSize => {
  const [screenSize, setScreenSize] = useState<ScreenSize>({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isSmallMobile: false,
    screenWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setScreenSize({
        isSmallMobile: width < 480,
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        screenWidth: width,
      });
    };

    // Initial check
    handleResize();

    // Add event listener with debounce
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedResize = () => {
      if (resizeTimer !== null) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(handleResize, 150);
    };

    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      if (resizeTimer !== null) clearTimeout(resizeTimer);
    };
  }, []);

  return screenSize;
};

/**
 * Hook to detect touch device capability
 * @returns {boolean} True if device supports touch
 */
export const useTouchDevice = () => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouchDevice = () => {
      const hasTouch = () => {
        return (
          (typeof window !== 'undefined' &&
            ('ontouchstart' in window ||
              navigator.maxTouchPoints > 0 ||
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (navigator as any).msMaxTouchPoints > 0)) ||
          false
        );
      };

      setIsTouchDevice(hasTouch());
    };

    checkTouchDevice();
  }, []);

  return isTouchDevice;
};

/**
 * Hook to detect orientation
 * @returns {Object} Object with properties: orientation, isPortrait, isLandscape
 */
export const useOrientation = () => {
  const [orientation, setOrientation] = useState({
    orientation:
      typeof window !== 'undefined'
        ? window.innerHeight > window.innerWidth
          ? 'portrait'
          : 'landscape'
        : 'portrait',
    isPortrait: typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : true,
    isLandscape: typeof window !== 'undefined' ? window.innerHeight <= window.innerWidth : false,
  });

  useEffect(() => {
    const handleOrientationChange = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      setOrientation({
        orientation: isPortrait ? 'portrait' : 'landscape',
        isPortrait,
        isLandscape: !isPortrait,
      });
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, []);

  return orientation;
};

/**
 * Hook to detect if device prefers reduced motion
 * @returns {boolean} True if user prefers reduced motion
 */
export const usePrefersReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addListener(handleChange);

    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return prefersReducedMotion;
};

/**
 * Hook to detect if device prefers dark mode
 * @returns {boolean} True if user prefers dark mode
 */
export const usePrefersDarkMode = () => {
  const [prefersDarkMode, setPrefersDarkMode] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setPrefersDarkMode(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => setPrefersDarkMode(e.matches);
    mediaQuery.addListener(handleChange);

    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return prefersDarkMode;
};

/**
 * Hook to get viewport dimensions
 * @returns {Object} Object with properties: width, height
 */
export const useViewport = () => {
  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return viewport;
};
