// Legacy storage - now using server API
// This file kept for reference

export const getToken = (): string | null => localStorage.getItem('token');
export const setToken = (token: string | null) => {
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
};
