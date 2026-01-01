import { Search, Bell, User, LogOut, Factory, ChevronDown } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { Badge } from "./ui/badge"
import { useAuth } from "@/contexts/AuthContext"
import { useSite } from "@/contexts/SiteContext"
import { useNavigate } from "react-router-dom"
import { FactorySelector } from "./FactorySelector"

export function TopNavigation() {
  const { user, logout } = useAuth()
  const { currentSite, sites, setCurrentSite } = useSite()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const getRoleDisplayName = (role: string) => {
    const roleMap: Record<string, string> = {
      'admin': 'Administrator',
      'maintenance_manager': 'Maintenance Manager',
      'mechanic': 'Mechanic',
      'electrician': 'Electrician',
      'general_maintenance_agent': 'General Maintenance Agent',
      'dockworker': 'Dockworker',
      'assistant_maintenance_manager': 'Assistant Maintenance Manager',
      'factory_manager': 'Factory Manager',
      'production_manager': 'Production Manager',
      'line_manager': 'Line Manager',
      'foreman': 'Foreman',
      'procurement_manager': 'Procurement Manager',
      'project_manager': 'Project Manager',
    }
    return roleMap[role] || role
  }

  const getRoleBadgeVariant = (role: string) => {
    const variantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'admin': 'destructive',
      'maintenance_manager': 'default',
      'mechanic': 'secondary',
      'electrician': 'secondary',
      'general_maintenance_agent': 'secondary',
      'dockworker': 'outline',
      'assistant_maintenance_manager': 'default',
      'factory_manager': 'destructive',
      'production_manager': 'default',
      'line_manager': 'default',
      'foreman': 'default',
      'procurement_manager': 'outline',
      'project_manager': 'default',
    }
    return variantMap[role] || 'outline'
  }

  return (
    <header className="border-b bg-background px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search equipment, interventions..."
              className="pl-10 w-full"
            />
          </div>
        </div>

        {/* Site Selector */}
        <div className="mr-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Factory className="h-4 w-4 text-blue-600" />
                <span className="max-w-[150px] truncate">
                  {currentSite ? currentSite.name : "All Sites"}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuLabel>Select Site</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCurrentSite(null)}>
                <span className={!currentSite ? "font-bold" : ""}>All Sites / Global</span>
              </DropdownMenuItem>
              {sites.map(site => (
                <DropdownMenuItem key={site._id} onClick={() => setCurrentSite(site)}>
                  <span className={currentSite?._id === site._id ? "font-bold" : ""}>
                    {site.name}
                  </span>
                  {site.code && <span className="ml-2 text-xs text-slate-500">({site.code})</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-4">
          <FactorySelector />
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              3
            </Badge>
          </Button>


          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">{user?.email || 'User'}</span>
                  {user?.role && (
                    <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs h-4">
                      {getRoleDisplayName(user.role)}
                    </Badge>
                  )}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <User className="mr-2 h-4 w-4" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}