import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "./store/authStore";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import { LoadingScreen } from "./components/LoadingScreen";
import AdminLayout from "./layouts/AdminLayout";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import Workout from "./pages/Workout";
import Nutrition from "./pages/Nutrition";
import Progress from "./pages/Progress";
import Profile from "./pages/Profile";
import RecipeDetail from "./pages/RecipeDetail";
import Shopping from "./pages/Shopping";
import Coach from "./pages/Coach";
import Planner from "./pages/Planner";
import PlannerSettings from "./pages/PlannerSettings";
import BodyAnalysis from "./pages/BodyAnalysis";
import WodScanner from "./pages/WodScanner";
import Onboarding from "./pages/Onboarding";
import { InstallPWA } from "./components/InstallPWA";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminWorkouts from "./pages/admin/AdminWorkouts";
import AdminMeals from "./pages/admin/AdminMeals";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminBadges from "./pages/admin/AdminBadges";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function AppRoutes() {
  const hydrateFromStorage = useAuthStore((s) => s.hydrateFromStorage);
  const [hydrated, setHydrated] = useState(false);
  const [minDelayDone, setMinDelayDone] = useState(false);

  useEffect(() => {
    hydrateFromStorage();
    setHydrated(true);
  }, [hydrateFromStorage]);

  useEffect(() => {
    const t = setTimeout(() => setMinDelayDone(true), 500);
    return () => clearTimeout(t);
  }, []);

  const showLoading = !hydrated || !minDelayDone;

  if (showLoading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<Auth />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route
        path="/workout"
        element={
          <ProtectedRoute>
            <Workout />
          </ProtectedRoute>
        }
      />
      <Route
        path="/wod-scanner"
        element={
          <ProtectedRoute>
            <WodScanner />
          </ProtectedRoute>
        }
      />
      <Route
        path="/nutrition"
        element={
          <ProtectedRoute>
            <Nutrition />
          </ProtectedRoute>
        }
      />
      <Route
        path="/shopping"
        element={
          <ProtectedRoute>
            <Shopping />
          </ProtectedRoute>
        }
      />
      <Route
        path="/planner"
        element={
          <ProtectedRoute>
            <Planner />
          </ProtectedRoute>
        }
      />
      <Route
        path="/planner/settings"
        element={
          <ProtectedRoute>
            <PlannerSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coach"
        element={
          <ProtectedRoute>
            <Coach />
          </ProtectedRoute>
        }
      />
      <Route
        path="/progress"
        element={
          <ProtectedRoute>
            <Progress />
          </ProtectedRoute>
        }
      />
      <Route
        path="/body-analysis"
        element={
          <ProtectedRoute>
            <BodyAnalysis />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="workouts" element={<AdminWorkouts />} />
        <Route path="meals" element={<AdminMeals />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="badges" element={<AdminBadges />} />
      </Route>
      <Route
        path="/recipe/:id"
        element={
          <ProtectedRoute>
            <RecipeDetail />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <InstallPWA />
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
