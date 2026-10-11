import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import './terminology.css';
import TerminologyApp from './TerminologyApp.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TerminologyApp />
  </StrictMode>,
);
