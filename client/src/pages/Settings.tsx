import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/useToast"
import { useAuth } from "@/contexts/AuthContext"
import { seedAdminUser, seedEquipmentTypes } from "@/api/seed"
import {
  User,
  Bell,
  Shield,
  Link,
  Settings as SettingsIcon,
  Database,
  UserPlus,
  Wrench,
  CheckCircle,
  AlertCircle
} from "lucide-react"

export function Settings() {
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({})
  const [seedResults, setSeedResults] = useState<{ [key: string]: any }>({})
  const { toast } = useToast()
  const { user } = useAuth()

  const handleSeedAdmin = async () => {
    try {
      setLoading({ ...loading, admin: true })
      const result = await seedAdminUser()
      setSeedResults({ ...seedResults, admin: result })
      toast({
        title: "Success",
        description: result.message,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading({ ...loading, admin: false })
    }
  }

  const handleSeedEquipment = async () => {
    try {
      setLoading({ ...loading, equipment: true })
      const result = await seedEquipmentTypes()
      setSeedResults({ ...seedResults, equipment: result })
      toast({
        title: "Success",
        description: result.message,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading({ ...loading, equipment: false })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Manage your account and system preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            System
          </TabsTrigger>
          {user?.role === 'admin' && (
            <TabsTrigger value="database" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Database
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile">
          <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>
                Manage your personal information and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" placeholder="Enter your first name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" placeholder="Enter your last name" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={user?.email || ''} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input id="role" value={user?.role || ''} disabled />
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-slate-600">Receive notifications via email</p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Push Notifications</Label>
                  <p className="text-sm text-slate-600">Receive push notifications in browser</p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>SMS Alerts</Label>
                  <p className="text-sm text-slate-600">Receive critical alerts via SMS</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your account security and privacy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" />
              </div>
              <Button>Update Password</Button>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-slate-600">Add an extra layer of security</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>
                Connect with external services and tools
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">WhatsApp Business</h4>
                    <p className="text-sm text-slate-600">Send notifications via WhatsApp</p>
                  </div>
                  <Button variant="outline">Connect</Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Email Service</h4>
                    <p className="text-sm text-slate-600">Configure SMTP settings</p>
                  </div>
                  <Button variant="outline">Configure</Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">IoT Sensors</h4>
                    <p className="text-sm text-slate-600">Connect equipment sensors</p>
                  </div>
                  <Button variant="outline">Setup</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
            <CardHeader>
              <CardTitle>System Preferences</CardTitle>
              <CardDescription>
                Configure system-wide settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="utc">UTC</SelectItem>
                    <SelectItem value="est">Eastern Time</SelectItem>
                    <SelectItem value="pst">Pacific Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateFormat">Date Format</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select date format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mm/dd/yyyy">MM/DD/YYYY</SelectItem>
                    <SelectItem value="dd/mm/yyyy">DD/MM/YYYY</SelectItem>
                    <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {user?.role === 'admin' && (
          <TabsContent value="database">
            <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
              <CardHeader>
                <CardTitle>Database Management</CardTitle>
                <CardDescription>
                  Initialize and manage database content
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Seed Admin User */}
                  <Card className="border-2 border-dashed border-slate-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <UserPlus className="h-5 w-5" />
                        Seed Admin User
                      </CardTitle>
                      <CardDescription>
                        Create the default admin user account
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button 
                        onClick={handleSeedAdmin} 
                        disabled={loading.admin}
                        className="w-full"
                      >
                        {loading.admin ? "Creating..." : "Create Admin User"}
                      </Button>
                      
                      {seedResults.admin && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2 text-green-800 mb-2">
                            <CheckCircle className="h-4 w-4" />
                            <span className="font-medium">Success</span>
                          </div>
                          <p className="text-sm text-green-700 mb-2">{seedResults.admin.message}</p>
                          {seedResults.admin.data?.credentials && (
                            <div className="text-xs text-green-600">
                              <p><strong>Email:</strong> {seedResults.admin.data.credentials.email}</p>
                              <p><strong>Password:</strong> {seedResults.admin.data.credentials.password}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Seed Equipment Types */}
                  <Card className="border-2 border-dashed border-slate-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Wrench className="h-5 w-5" />
                        Seed Equipment Types
                      </CardTitle>
                      <CardDescription>
                        Initialize the database with sample equipment
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button 
                        onClick={handleSeedEquipment} 
                        disabled={loading.equipment}
                        className="w-full"
                      >
                        {loading.equipment ? "Creating..." : "Create Equipment Types"}
                      </Button>
                      
                      {seedResults.equipment && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2 text-green-800 mb-2">
                            <CheckCircle className="h-4 w-4" />
                            <span className="font-medium">Success</span>
                          </div>
                          <p className="text-sm text-green-700 mb-2">{seedResults.equipment.message}</p>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="text-green-700">
                              Created: {seedResults.equipment.data?.created || 0}
                            </Badge>
                            <Badge variant="outline" className="text-yellow-700">
                              Skipped: {seedResults.equipment.data?.skipped || 0}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-800 mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">Important Notes</span>
                  </div>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• These operations are safe to run multiple times</li>
                    <li>• Existing records will not be duplicated</li>
                    <li>• Admin credentials will be shown only once after creation</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}