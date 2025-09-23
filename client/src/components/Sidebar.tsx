import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Button } from "./ui/button"
import { ScrollArea } from "./ui/scroll-area"
import {
  LayoutDashboard,
  Settings,
  Wrench,
  ClipboardList,
  Package,
  ShoppingCart,
  FolderOpen,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Factory,
  Tags,
  Layers
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Equipment", href: "/equipment", icon: Settings },
  { name: "Equipment Categories", href: "/equipment-categories", icon: Tags },
  { name: "Equipment Types", href: "/equipment-types", icon: Layers },
  { name: "Brands", href: "/brands", icon: Factory },
  { name: "Interventions", href: "/interventions", icon: Wrench },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Procurement", href: "/procurement", icon: ShoppingCart },
  { name: "Projects", href: "/projects", icon: FolderOpen },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: ClipboardList },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <div className={cn(
      "flex flex-col bg-white/80 backdrop-blur-md border-r border-slate-200/60 dark:bg-slate-900/80 dark:border-slate-700/60 transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="flex items-center justify-between p-4 border-b border-slate-200/60 dark:border-slate-700/60">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <Factory className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              AQUARELLE ATSIRABE
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link key={item.name} to={item.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start transition-all duration-200",
                    collapsed ? "px-2" : "px-3",
                    isActive 
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg" 
                      : "hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", collapsed ? "mr-0" : "mr-3")} />
                  {!collapsed && <span>{item.name}</span>}
                </Button>
              </Link>
            )
          })}
        </nav>
      </ScrollArea>
    </div>
  )
}