import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, MemoryRouter } from 'react-router';
import App from './App';
import { ToastProvider } from './components/ui';
import './index.css';
import { StoreProvider } from './state/store';

// Hash routing works on any static host. Embedded (artifact) builds keep routes in memory.
const Router = import.meta.env.VITE_ARTIFACT === '1' ? MemoryRouter : HashRouter;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <StoreProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </StoreProvider>
    </Router>
  </StrictMode>,
);
