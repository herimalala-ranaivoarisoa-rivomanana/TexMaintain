import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart3, Download, FileText, TrendingUp, Calendar, Activity, Settings, Package, Wrench } from "lucide-react"

export function Reports() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Reports & Analytics
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Generate insights and track performance metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="month">
            <SelectTrigger className="w-32">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-yellow-800">
            <Wrench className="h-4 w-4" />
            <span className="font-medium">Under Development</span>
          </div>
          <p className="text-sm text-yellow-700 mt-1">
            This feature is currently under development. The data shown is for demonstration purposes only.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60 hover:shadow-lg transition-all duration-200 cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5 text-blue-600" />
              Equipment Performance
            </CardTitle>
            <CardDescription>
              MTTR, MTBF, and availability metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Average MTTR</span>
                <span className="font-semibold">4.2 hours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Average MTBF</span>
                <span className="font-semibold">680 hours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Overall Availability</span>
                <span className="font-semibold text-green-600">92.3%</span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full mt-4">
              View Full Report
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60 hover:shadow-lg transition-all duration-200 cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="mr-2 h-5 w-5 text-orange-600" />
              Maintenance Activities
            </CardTitle>
            <CardDescription>
              Intervention trends and completion rates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Completed This Month</span>
                <span className="font-semibold">45</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Average Completion Time</span>
                <span className="font-semibold">2.8 days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">On-Time Completion</span>
                <span className="font-semibold text-green-600">87%</span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full mt-4">
              View Full Report
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60 hover:shadow-lg transition-all duration-200 cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="mr-2 h-5 w-5 text-purple-600" />
              Inventory Analysis
            </CardTitle>
            <CardDescription>
              Stock levels and consumption patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Total Parts</span>
                <span className="font-semibold">1,247</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Low Stock Items</span>
                <span className="font-semibold text-yellow-600">8</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Inventory Turnover</span>
                <span className="font-semibold">4.2x</span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full mt-4">
              View Full Report
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60 hover:shadow-lg transition-all duration-200 cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5 text-green-600" />
              Cost Analysis
            </CardTitle>
            <CardDescription>
              Maintenance costs and budget tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Monthly Budget</span>
                <span className="font-semibold">$125,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Spent This Month</span>
                <span className="font-semibold">$98,450</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Budget Utilization</span>
                <span className="font-semibold text-blue-600">78.8%</span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full mt-4">
              View Full Report
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60 hover:shadow-lg transition-all duration-200 cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5 text-indigo-600" />
              Compliance Report
            </CardTitle>
            <CardDescription>
              Safety and regulatory compliance status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Safety Inspections</span>
                <span className="font-semibold text-green-600">100%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Overdue Certifications</span>
                <span className="font-semibold text-red-600">2</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Compliance Score</span>
                <span className="font-semibold text-green-600">94%</span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full mt-4">
              View Full Report
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60 hover:shadow-lg transition-all duration-200 cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5 text-slate-600" />
              Custom Reports
            </CardTitle>
            <CardDescription>
              Create and schedule custom reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Saved Reports</span>
                <span className="font-semibold">12</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Scheduled Reports</span>
                <span className="font-semibold">5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Last Generated</span>
                <span className="font-semibold">Today</span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full mt-4">
              Create Report
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
        <CardHeader>
          <CardTitle>Quick Report Generator</CardTitle>
          <CardDescription>
            Generate reports for specific time periods and metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Select defaultValue="equipment">
              <SelectTrigger>
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equipment">Equipment Performance</SelectItem>
                <SelectItem value="maintenance">Maintenance Activities</SelectItem>
                <SelectItem value="inventory">Inventory Analysis</SelectItem>
                <SelectItem value="costs">Cost Analysis</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue="month">
              <SelectTrigger>
                <SelectValue placeholder="Select time period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Last 7 days</SelectItem>
                <SelectItem value="month">Last 30 days</SelectItem>
                <SelectItem value="quarter">Last 3 months</SelectItem>
                <SelectItem value="year">Last 12 months</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue="pdf">
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
            <Download className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}