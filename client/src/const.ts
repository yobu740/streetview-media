export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate Microsoft login URL
export const getLoginUrl = () => {
  const origin = window.location.origin;
  const state = btoa(JSON.stringify({ 
    returnPath: window.location.pathname,
    origin: origin 
  }));
  
  // Pass the frontend origin to backend so it can use the correct redirect URI
  return `/api/auth/login?state=${encodeURIComponent(state)}&origin=${encodeURIComponent(origin)}`;
};
