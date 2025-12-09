// Centralized API configuration
// Auto-detect API base from current origin
const getApiBase = () => {
  // If environment variable is set, use it
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE;
  }
  
  // Otherwise, use same hostname as frontend but port 4000
  // This ensures frontend and backend use the same IP
  const hostname = window.location.hostname;
  return `http://${hostname}:4000/api`;
};

const getSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  
  const hostname = window.location.hostname;
  return `http://${hostname}:4000`;
};

export const API_BASE = getApiBase();
export const SOCKET_URL = getSocketUrl();

// Log for debugging (only in dev mode)
if (import.meta.env.DEV) {
  console.log('🔧 API Configuration:');
  console.log('  Frontend Origin:', window.location.origin);
  console.log('  API Base:', API_BASE);
  console.log('  Socket URL:', SOCKET_URL);
}

