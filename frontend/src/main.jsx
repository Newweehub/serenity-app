import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { TTSProvider } from './context/TTSContext.jsx';
import { initAuthFromEasyAuth } from './lib/api.js';
import './index.css';

// Wait for EasyAuth to populate localStorage BEFORE rendering
// This prevents getUserId() from running before the userId is available
initAuthFromEasyAuth().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter>
        <TTSProvider>
          <App />
        </TTSProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
});