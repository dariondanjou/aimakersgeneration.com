import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import StudentsApp from './StudentsApp.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StudentsApp />
  </StrictMode>,
);
