import { create } from 'zustand';

/** Session lives in memory only: the access token is never written to storage. */
export const useSession = create((set) => ({
  status: 'loading', // 'loading' | 'authenticated' | 'anonymous'
  user: null,
  accessToken: null,
  setSession: ({ user, accessToken }) => set({ status: 'authenticated', user, accessToken }),
  clear: () => set({ status: 'anonymous', user: null, accessToken: null }),
}));
