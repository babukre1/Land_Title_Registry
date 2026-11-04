import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import DashboardLayout from "./layouts/DashboardLayout.jsx";
import HomePage from "./pages/HomePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import UnauthorizedPage from "./pages/UnauthorizedPage.jsx";
import OwnersPage from "./pages/OwnersPage.jsx";
import NewOwnerPage from "./pages/NewOwnerPage.jsx";
import OwnerDetailPage from "./pages/OwnerDetailPage.jsx";
import ParcelsPage from "./pages/ParcelsPage.jsx";
import NewParcelPage from "./pages/NewParcelPage.jsx";
import ParcelDetailPage from "./pages/ParcelDetailPage.jsx";
import DisputesPage from "./pages/DisputesPage.jsx";
import DisputeDetailPage from "./pages/DisputeDetailPage.jsx";
import ComingSoonPage from "./pages/ComingSoonPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/parcels" element={<ParcelsPage />} />
          <Route path="/parcels/:id" element={<ParcelDetailPage />} />
          <Route element={<ProtectedRoute allowedRoles={["CLERK"]} />}>
            <Route path="/parcels/new" element={<NewParcelPage />} />
            <Route path="/owners/new" element={<NewOwnerPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={["CLERK", "REGISTRAR", "ADMIN"]} />}>
            <Route path="/owners" element={<OwnersPage />} />
            <Route path="/owners/:id" element={<OwnerDetailPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={["CLERK", "REGISTRAR"]} />}>
            <Route path="/disputes" element={<DisputesPage />} />
            <Route path="/disputes/:id" element={<DisputeDetailPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={["SURVEYOR", "CLERK", "REGISTRAR"]} />}>
            <Route path="/surveys" element={<ComingSoonPage title="Surveys" />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
