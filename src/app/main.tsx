import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import '@presentation/styles/fonts';
import '@presentation/styles/globals.css';
import '@presentation/i18n';
import { AppProvider } from '@presentation/hooks/AppContext';
import { AppRoutes } from '@presentation/routes';
import { useEditionStore } from '@presentation/state/editionStore';
import { createContainer } from './container';

const container = createContainer();
useEditionStore.getState().setEditionId(container.today());

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: Infinity, refetchOnWindowFocus: false } },
});

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
  <StrictMode>
    <AppProvider value={container}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
        <Toaster position="bottom-right" richColors />
      </QueryClientProvider>
    </AppProvider>
  </StrictMode>,
);
