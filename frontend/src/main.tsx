import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { useAuthStore } from "./store/authStore";

// Sync auth from localStorage before first paint so ProtectedRoute has correct state
useAuthStore.getState().hydrateFromStorage();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
