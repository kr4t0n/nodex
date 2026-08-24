import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { ComponentPage } from './pages/ComponentPage.tsx';
import { IndexPage } from './pages/IndexPage.tsx';
import { LanguagePage } from './pages/LanguagePage.tsx';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root is missing from index.html');

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<IndexPage />} />
        <Route path="/l/:slug" element={<LanguagePage />} />
        <Route path="/l/:slug/:name" element={<ComponentPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
