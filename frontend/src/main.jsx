import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { TTSProvider } from './context/TTSContext.jsx';
import { initAuthFromEasyAuth } from './lib/api.js';
import './index.css';

// On Azure, populate userId from EasyAuth before rendering
initAuthFromEasyAuth().then(() => {
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