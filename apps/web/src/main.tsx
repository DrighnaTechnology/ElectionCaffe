import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import App from './App';
import { ThemeProvider } from './components/ThemeProvider';
import { useThemeStore } from './store/theme';
import { queryClient } from './lib/queryClient';
import './index.css';

// ── Google Translate + React DOM compatibility patch ──────────────────────────
// Google Translate wraps text nodes in <font> tags, moving them from where React
// expects them. When React then calls removeChild/insertBefore, the node's
// parentNode no longer matches, causing "The node to be removed is not a child
// of this node". This patch gracefully handles the mismatch instead of crashing.
{
  const origRemoveChild = Node.prototype.removeChild;
  // @ts-expect-error — patching native prototype
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      return child; // node already moved by Google Translate — skip silently
    }
    return origRemoveChild.call(this, child) as T;
  };

  const origInsertBefore = Node.prototype.insertBefore;
  // @ts-expect-error — patching native prototype
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, refNode: Node | null): T {
    if (refNode && refNode.parentNode !== this) {
      return newNode; // reference node moved by Google Translate — skip silently
    }
    return origInsertBefore.call(this, newNode, refNode) as T;
  };
}


function ThemedToaster() {
  const { resolvedTheme } = useThemeStore();
  return <Toaster position="top-right" richColors theme={resolvedTheme} offset="58px" />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <App />
          <ThemedToaster />
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
