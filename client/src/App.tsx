import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "./components/ui/theme-provider"
import { Toaster } from "./components/ui/toaster"
import { AuthProvider } from "./contexts/AuthContext"
import { FactoryProvider } from "./contexts/FactoryContext"
import { Login } from "./pages/Login"
import { Register } from "./pages/Register"
import { ProtectedRoute } from "./components/ProtectedRoute"
import { MainLayout } from "./components/MainLayout"
import { Dashboard } from "./pages/Dashboard"
import { Assets } from "./pages/Assets"
import { Interventions } from "./pages/Interventions"
import { Inventory } from "./pages/Inventory"
import AssetDetailWrapper from "./pages/AssetDetail"
import { Procurement } from "./pages/Procurement"
import { Projects } from "./pages/Projects"
import { ProjectDetailsPage } from "./pages/ProjectDetails"
import { Reports } from "./pages/Reports"
import { Settings } from "./pages/Settings"
import { BlankPage } from "./pages/BlankPage"
import InterventionDetailWrapper from "./pages/InterventionDetail"
import PartDetailWrapper from "./pages/PartDetail"
import Categories from "./pages/Categories"
import SubCategories from "./pages/SubCategories"
import BrandsPageWrapper from "./pages/Brands"
import ProcessAreasPageWrapper from "./pages/ProcessAreas"
import { ProcessAreaDetail } from "./pages/ProcessAreaDetail"
import Machinists from "./pages/Machinists"
import Mechanics from "./pages/Mechanics"
import Electricians from "./pages/Electricians"
import MaintenanceWorkers from "./pages/MaintenanceWorkers"
import { AssetParts } from "./pages/AssetParts"
import { AssetInterventions } from "./pages/AssetInterventions"
import { AssetConsumables } from "./pages/AssetConsumables"
import ReorderAlerts from "./pages/ReorderAlerts"

function App() {
  return (
    <AuthProvider>
      <FactoryProvider>
        <ThemeProvider defaultTheme="light" storageKey="ui-theme">
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="assets" element={<Assets />} />
                <Route path="assets/:id" element={<AssetDetailWrapper />} />
                <Route path="assets/:id/interventions" element={<AssetInterventions />} />
                <Route path="assets/:id/parts" element={<AssetParts />} />
                <Route path="assets/:id/consumable" element={<AssetConsumables />} />
                <Route path="categories" element={<Categories />} />
                <Route path="sub-categories" element={<SubCategories />} />
                <Route path="brands" element={<BrandsPageWrapper />} />
                <Route path="process-areas" element={<ProcessAreasPageWrapper />} />
                <Route path="process-areas/:id" element={<ProcessAreaDetail />} />
                <Route path="machinists" element={<Machinists />} />
                <Route path="mechanics" element={<Mechanics />} />
                <Route path="electricians" element={<Electricians />} />
                <Route path="maintenance-workers" element={<MaintenanceWorkers />} />
                <Route path="interventions" element={<Interventions />} />
                <Route path="interventions/:id" element={<InterventionDetailWrapper />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="inventory/:id" element={<PartDetailWrapper />} />
                <Route path="reorder-alerts" element={<ReorderAlerts />} />
                <Route path="procurement" element={<Procurement />} />
                <Route path="projects" element={<Projects />} />
                <Route path="projects/:id" element={<ProjectDetailsPage />} />
                <Route path="reports" element={<Reports />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<BlankPage />} />
            </Routes>
          </Router>
          <Toaster />
        </ThemeProvider>
      </FactoryProvider>
    </AuthProvider>
  )
}

export default App