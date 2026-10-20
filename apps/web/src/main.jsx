import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { router, prefetchAllPages } from './app/router.jsx';
import { refreshSession } from './lib/api.js';
// Self-hosted variable fonts (no third-party request, cached with the app)
import '@fontsource-variable/inter';
import '@fontsource-variable/fraunces/opsz.css';
import '@fontsource-variable/fraunces/opsz-italic.css';
import './styles/tailwind-base.css';
import './styles/tokens.css';
import './styles/components.css';
import './styles/overrides.css';
import './styles/tailwind-utilities.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: (count, err) => count < 2 && !(err?.status >= 400 && err?.status < 500),
      refetchOnWindowFocus: false,
    },
  },
});

/** Restore the session from the refresh cookie once on load (architecture doc §3). */
function SessionBootstrap({ children }) {
  useEffect(() => {
    refreshSession().catch(() => {});
    prefetchAllPages();
  }, []);
  return children;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <SessionBootstrap>
          <RouterProvider router={router} />
        </SessionBootstrap>
      </MotionConfig>
    </QueryClientProvider>
  </React.StrictMode>,
);
