import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getPartById } from "@/api/inventory"
import { Package, MapPin, DollarSign, Hash, ArrowLeft } from "lucide-react"

interface PartData {
  _id: string
  name: string
  partNumber: string
  category: string
  currentStock: number
  minStock: number
  maxStock: number
  unitPrice: number
  supplier?: string
  location?: string
}

export function PartDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<PartData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await getPartById(id!)
        setData(res.part)
      } catch (error) {
        setData(null)
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchDetail()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="mr-2 h-4 w-4"/>Back</Button>
        <Card>
          <CardContent className="p-6">Part not found.</CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="mr-2 h-4 w-4"/>Back</Button>
      <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
        <CardHeader>
          <CardTitle className="text-2xl">{data.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500">Part Number</p>
              <p className="text-slate-900 flex items-center"><Hash className="mr-1 h-3 w-3"/>{data.partNumber}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Category</p>
              <p className="text-slate-900">{data.category}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Current / Min / Max</p>
              <p className="text-slate-900">{data.currentStock} / {data.minStock} / {data.maxStock}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Unit Price</p>
              <p className="text-slate-900 flex items-center"><DollarSign className="mr-1 h-3 w-3"/>{data.unitPrice}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Supplier</p>
              <p className="text-slate-900">{data.supplier || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Location</p>
              <p className="text-slate-900 flex items-center"><MapPin className="mr-1 h-3 w-3"/>{data.location || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function PartDetailWrapper() {
  return <PartDetail />
}



