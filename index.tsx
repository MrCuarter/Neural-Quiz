
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// --- GLOBAL DEBUG INITIALIZATION ---
if (typeof window !== 'undefined') {
  (window as any).NQ_DEBUG = (window as any).NQ_DEBUG || {};
  (window as any).NQ_DEBUG.wayground = (window as any).NQ_DEBUG.wayground || { runs: [], lastRun: null };
  // Placeholder for others to prevent undefined errors if accessed
  (window as any).NQ_DEBUG.blooket = (window as any).NQ_DEBUG.blooket || { runs: [] };
  (window as any).NQ_DEBUG.gimkit = (window as any).NQ_DEBUG.gimkit || { runs: [] };
  
  console.log("🚀 NQ_DEBUG System Initialized");
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
