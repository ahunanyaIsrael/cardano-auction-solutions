import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { LucidProvider } from "./context/LucidContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LucidProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </LucidProvider>
  </StrictMode>
);
