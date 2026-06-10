import { useWindowDimensions } from 'react-native';

// Phone breakpoint: anything <= 480px is considered a phone
const PHONE_BREAKPOINT = 480;
const MAX_APP_WIDTH = 430; // iPhone 14 Pro Max width

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isPhone = width <= PHONE_BREAKPOINT;
  // The effective content width (capped at MAX_APP_WIDTH on wide screens)
  const contentWidth = Math.min(width, MAX_APP_WIDTH);
  return { width, height, isPhone, contentWidth };
}
