import { useState, useEffect } from 'react'
import { AlertTriangle, Package, ShoppingCart, RefreshCw, Download, Filter, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/useToast'
import { getReorderAlerts, type ReorderAlert } from '@/api/equipmentParts'
import { Link } from 'react-router-dom'

export default function ReorderAlerts() {
  const [alerts, setAlerts] = useState<ReorderAlert[]>([])
  const [filteredAlerts, setFilteredAlerts] = useState<ReorderAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'critical' | 'warning'>('all')
  const [sortBy, setSortBy] = useState<'deficit' | 'name' | 'stock'>('deficit')
  const { toast } = useToast()

  useEffect(() => {
    fetchAlerts()
  }, [])

  useEffect(() => {
    filterAndSortAlerts()
  }, [alerts, searchTerm, urgencyFilter, sortBy])

  const fetchAlerts = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const response = await getReorderAlerts()
      setAlerts(response.alerts || [])

      if (isRefresh) {
        toast({
          title: 'Actualisé',
          description: `${response.alerts?.length || 0} alerte(s) trouvée(s)`
        })
      }
    } catch (error: any) {
      console.error('Error fetching reorder alerts:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les alertes',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const filterAndSortAlerts = () => {
    let filtered = [...alerts]

    // Filtre par recherche
    if (searchTerm) {
      filtered = filtered.filter(alert =>
        alert.part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.part.partNumber.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filtre par urgence
    if (urgencyFilter !== 'all') {
      filtered = filtered.filter(alert => alert.urgency === urgencyFilter)
    }

    // Tri
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'deficit':
          return b.deficit - a.deficit
        case 'name':
          return a.part.name.localeCompare(b.part.name)
        case 'stock':
          return a.currentStock - b.currentStock
        default:
          return 0
      }
    })

    setFilteredAlerts(filtered)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setUrgencyFilter('all')
    setSortBy('deficit')
  }

  const exportToCSV = () => {
    const headers = ['Pièce', 'Référence', 'Stock actuel', 'Point de réappro', 'Déficit', 'Urgence', 'Équipements']
    const rows = filteredAlerts.map(alert => [
      alert.part.name,
      alert.part.partNumber,
      alert.currentStock,
      alert.reorderPoint,
      alert.deficit,
      alert.urgency,
      alert.equipmentCount
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `alertes-reappro-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    toast({
      title: 'Exporté',
      description: 'Le fichier CSV a été téléchargé'
    })
  }

  const criticalCount = alerts.filter(a => a.urgency === 'critical').length
  const warningCount = alerts.filter(a => a.urgency === 'warning').length
  const totalDeficit = filteredAlerts.reduce((sum, alert) => sum + alert.deficit, 0)

  if (loading) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-slate-500">Chargement des alertes...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8" />
            Alertes de Réapprovisionnement
          </h1>
          <p className="text-slate-600 mt-1">
            Gestion des pièces nécessitant un réapprovisionnement
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => fetchAlerts(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button
            variant="outline"
            onClick={exportToCSV}
            disabled={filteredAlerts.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Exporter CSV
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total alertes</p>
                <p className="text-3xl font-bold text-slate-900">{alerts.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">Critiques</p>
                <p className="text-3xl font-bold text-red-600">{criticalCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600">Warnings</p>
                <p className="text-3xl font-bold text-orange-600">{warningCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Déficit total</p>
                <p className="text-3xl font-bold text-blue-600">{totalDeficit}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtres
            </CardTitle>
            {(searchTerm || urgencyFilter !== 'all' || sortBy !== 'deficit') && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Réinitialiser
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Recherche</label>
              <Input
                placeholder="Nom ou référence..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Urgence</label>
              <Select value={urgencyFilter} onValueChange={(value: any) => setUrgencyFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="critical">🔴 Critiques</SelectItem>
                  <SelectItem value="warning">🟠 Warnings</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Trier par</label>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deficit">Déficit (décroissant)</SelectItem>
                  <SelectItem value="name">Nom (A-Z)</SelectItem>
                  <SelectItem value="stock">Stock actuel (croissant)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des alertes */}
      <Card>
        <CardHeader>
          <CardTitle>
            Alertes ({filteredAlerts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 mx-auto text-green-400 mb-4" />
              <h3 className="text-lg font-medium text-green-700 mb-2">
                ✅ Aucune alerte
              </h3>
              <p className="text-slate-600">
                {alerts.length === 0
                  ? 'Tous les stocks sont au niveau requis'
                  : 'Aucune alerte ne correspond aux filtres'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.part._id}
                  className={`border rounded-lg p-4 ${
                    alert.urgency === 'critical'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-orange-50 border-orange-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">
                          {alert.urgency === 'critical' ? '🔴' : '🟠'}
                        </span>
                        <div>
                          <Link
                            to={`/inventory/${alert.part._id}`}
                            className="font-semibold text-lg hover:underline"
                          >
                            {alert.part.name}
                          </Link>
                          <p className="text-sm text-slate-600">
                            {alert.part.partNumber}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={alert.urgency === 'critical' ? 'destructive' : 'default'}
                      className={alert.urgency === 'warning' ? 'bg-orange-500' : ''}
                    >
                      {alert.urgency === 'critical' ? 'CRITIQUE' : 'WARNING'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Stock actuel</p>
                      <p className="text-xl font-bold text-red-600">
                        {alert.currentStock}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Stock sécurité</p>
                      <p className="text-lg font-semibold">
                        {alert.safetyStock}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Point réappro</p>
                      <p className="text-lg font-semibold">
                        {alert.reorderPoint}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Déficit</p>
                      <p className="text-xl font-bold text-red-600">
                        -{alert.deficit}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Équipements</p>
                      <p className="text-lg font-semibold">
                        {alert.equipmentCount}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <Link to={`/inventory/${alert.part._id}`}>
                      <Button variant="outline" size="sm">
                        Voir détails
                      </Button>
                    </Link>
                    <Button size="sm">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Commander {alert.deficit} pièce(s)
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
