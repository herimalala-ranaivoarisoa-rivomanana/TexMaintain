import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart3, Download, Calendar, Activity, Package, Loader2, DollarSign } from "lucide-react"
import {
  getReportStats,
  getMaintenanceMetrics,
  getFinancialMetrics,
  ReportStats,
  MaintenanceMetrics,
  FinancialMetrics
} from "@/api/reports"
import { toast } from "sonner"
import { useFactory } from "@/contexts/FactoryContext"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export function Reports() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<(ReportStats & { totalTCO?: number, totalAssetValue?: number }) | null>(null)
  const [maintenanceMetrics, setMaintenanceMetrics] = useState<MaintenanceMetrics | null>(null)
  const [financialMetrics, setFinancialMetrics] = useState<FinancialMetrics | null>(null)
  const { currentFactory } = useFactory()

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching report data...');
        const results = await Promise.allSettled([
          getReportStats(),
          getMaintenanceMetrics(),
          getFinancialMetrics()
        ]);

        // Helper to get value or log error
        const getResult = (result: PromiseSettledResult<any>, name: string) => {
          if (result.status === 'fulfilled') return result.value;
          console.error(`Failed to fetch ${name}:`, result.reason);
          toast.error(`Failed to load ${name}`);
          return null;
        };

        const statsData = getResult(results[0], 'Stats');
        const maintenanceData = getResult(results[1], 'Maintenance');
        const financialData = getResult(results[2], 'Financials');

        console.log('Report Data Processed:', { statsData, maintenanceData, financialData });

        if (statsData) setStats(statsData);
        if (maintenanceData) setMaintenanceMetrics(maintenanceData);
        if (financialData) setFinancialMetrics(financialData);

      } catch (error) {
        console.error("Critical error in fetchData:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [currentFactory])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  // Data preparation for charts
  const interventionStatusData = maintenanceMetrics?.byStatus
    ? Object.entries(maintenanceMetrics.byStatus).map(([name, value]) => ({ name, value }))
    : [];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

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
            Export
          </Button>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Equipment Health KPI */}
        <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60 transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center">
              <BarChart3 className="mr-2 h-4 w-4" /> Equipment Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{maintenanceMetrics?.mtbf ? Math.round(maintenanceMetrics.mtbf) : 0}h</div>
            <p className="text-xs text-slate-500">Avg MTBF</p>
            <div className="mt-2 flex items-center text-xs">
              <span className="text-slate-900 font-semibold mr-1">{stats?.equipmentCount || 0}</span> Machines
            </div>
          </CardContent>
        </Card>

        {/* Maintenance Activity KPI */}
        <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60 transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center">
              <Activity className="mr-2 h-4 w-4" /> Active Interventions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats?.activeInterventions || 0}</div>
            <p className="text-xs text-slate-500">Currently in progress</p>
            <div className="mt-2 text-xs text-green-600 font-medium">
              {Math.round(maintenanceMetrics?.mttr || 0)}h Avg MTTR
            </div>
          </CardContent>
        </Card>

        {/* Inventory Value KPI */}
        <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60 transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center">
              <Package className="mr-2 h-4 w-4" /> Inventory Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">Rs {stats?.totalStockValue?.toLocaleString() || 0}</div>
            <p className="text-xs text-slate-500">Total Stock Value</p>
            <div className="mt-2 text-xs text-red-500 font-medium">
              {stats?.lowStockParts || 0} Low Stock Items
            </div>
          </CardContent>
        </Card>

        {/* Financial Health KPI */}
        <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60 transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center">
              <DollarSign className="mr-2 h-4 w-4" /> Total TCO
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">Rs {stats?.totalTCO?.toLocaleString() || 0}</div>
            <p className="text-xs text-slate-500">Calculated TCO</p>
            <div className="mt-2 text-xs text-slate-500">
              Asset Value: <span className="font-semibold text-slate-900">Rs {stats?.totalAssetValue?.toLocaleString() || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Monthly Maintenance Costs Chart */}
        <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
          <CardHeader>
            <CardTitle>Monthly Maintenance Costs</CardTitle>
            <CardDescription>Actual costs aggregated from interventions (Last 12 Months)</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={maintenanceMetrics?.monthlyData || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" fontSize={12} stroke="#64748b" tickLine={false} axisLine={false} />
                <YAxis
                  fontSize={12}
                  stroke="#64748b"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `Rs ${value}`}
                />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [`Rs ${value.toLocaleString()}`, 'Cost']}
                />
                <Bar dataKey="cost" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Intervention Breakdown Pie Chart */}
        <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
          <CardHeader>
            <CardTitle>Intervention Status</CardTitle>
            <CardDescription>Breakdown of all interventions by current status</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={interventionStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {interventionStatusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
              </RePieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Financial Deep Dive */}
      <h2 className="text-xl font-bold text-slate-900 mt-8">Financial Analysis</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TCO by Category Chart */}
        <Card className="lg:col-span-2 bg-white/60 backdrop-blur-sm border-slate-200/60">
          <CardHeader>
            <CardTitle>TCO by Category</CardTitle>
            <CardDescription>Which categories are costing the most?</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialMetrics?.tcoByCategory || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={100} fontSize={12} stroke="#64748b" tickLine={false} axisLine={false} />
                <Tooltip formatter={(value: any) => [`Rs ${value.toLocaleString()}`, 'Total TCO']} />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top 5 Costly Machines Table/List */}
        <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
          <CardHeader>
            <CardTitle>Top Costly Equipment</CardTitle>
            <CardDescription>Highest TCO Machines</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {financialMetrics?.topCostlyEquipment?.map((eq, i) => (
                <div key={eq._id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">
                      {i + 1}
                    </div>
                    <div>
                      <div className="font-medium text-sm text-slate-900">{eq.name}</div>
                      <div className="text-xs text-slate-500">Price: Rs {eq.purchasePrice?.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm text-slate-900">Rs {eq.tco.toLocaleString()}</div>
                    <div className="text-xs text-slate-500">TCO</div>
                  </div>
                </div>
              ))}
              {!financialMetrics?.topCostlyEquipment?.length && (
                <p className="text-sm text-slate-500 text-center py-4">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}