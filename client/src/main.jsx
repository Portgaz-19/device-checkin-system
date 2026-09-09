import { StrictMode } from "react";
import { BrowserRouter } from 'react-router-dom';
import { createRoot } from "react-dom/client";
import ErrorBoundary from './components/ErrorBoundary.jsx';
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);



