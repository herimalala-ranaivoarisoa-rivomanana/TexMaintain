import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "./components/ui/theme-provider"
import { Toaster } from "./components/ui/toaster"
import { AuthProvider } from "./contexts/AuthContext"
import { Login } from "./pages/Login"
import { Register } from "./pages/Register"
import { ProtectedRoute } from "./components/ProtectedRoute"
import { MainLayout } from "./components/MainLayout"
import { Dashboard } from "./pages/Dashboard"
import { Equipment } from "./pages/Equipment"
import { Interventions } from "./pages/Interventions"
import { Inventory } from "./pages/Inventory"
import EquipmentDetailWrapper from "./pages/EquipmentDetail"
import { Procurement } from "./pages/Procurement"
import { Projects } from "./pages/Projects"
import { Reports } from "./pages/Reports"
import { Settings } from "./pages/Settings"
import { BlankPage } from "./pages/BlankPage"
import InterventionDetailWrapper from "./pages/InterventionDetail"
import PartDetailWrapper from "./pages/PartDetail"
import EquipmentCategoriesPageWrapper from "./pages/EquipmentCategories"
import EquipmentTypesPageWrapper from "./pages/EquipmentTypes"
import BrandsPageWrapper from "./pages/Brands"
import ProductionLinesPageWrapper from "./pages/ProductionLines"
import Machinists from "./pages/Machinists"
import Mechanics from "./pages/Mechanics"
import Electricians from "./pages/Electricians"
import MaintenanceWorkers from "./pages/MaintenanceWorkers"
import { EquipmentParts } from "./pages/EquipmentParts"
import { EquipmentInterventions } from "./pages/EquipmentInterventions"
import { EquipmentConsumables } from "./pages/EquipmentConsumables"

function App() {
  return (
    <AuthProvider>
      <ThemeProvider defaultTheme="light" storageKey="ui-theme">
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="equipment" element={<Equipment />} />
              <Route path="equipment/:id" element={<EquipmentDetailWrapper />} />
              <Route path="equipment/:id/interventions" element={<EquipmentInterventions />} />
              <Route path="equipment/:id/parts" element={<EquipmentParts />} />
              <Route path="equipment/:id/consumable" element={<EquipmentConsumables />} />
              <Route path="equipment-categories" element={<EquipmentCategoriesPageWrapper />} />
              <Route path="equipment-types" element={<EquipmentTypesPageWrapper />} />
              <Route path="brands" element={<BrandsPageWrapper />} />
              <Route path="production-lines" element={<ProductionLinesPageWrapper />} />
              <Route path="machinists" element={<Machinists />} />
              <Route path="mechanics" element={<Mechanics />} />
              <Route path="electricians" element={<Electricians />} />
              <Route path="maintenance-workers" element={<MaintenanceWorkers />} />
              <Route path="interventions" element={<Interventions />} />
              <Route path="interventions/:id" element={<InterventionDetailWrapper />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="inventory/:id" element={<PartDetailWrapper />} />
              <Route path="procurement" element={<Procurement />} />
              <Route path="projects" element={<Projects />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<BlankPage />} />
          </Routes>
        </Router>
        <Toaster />
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App