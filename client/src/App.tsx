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
import { Procurement } from "./pages/Procurement"
import { Projects } from "./pages/Projects"
import { Reports } from "./pages/Reports"
import { Settings } from "./pages/Settings"
import { BlankPage } from "./pages/BlankPage"

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
              <Route path="interventions" element={<Interventions />} />
              <Route path="inventory" element={<Inventory />} />
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