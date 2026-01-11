import { useParams, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Droplet } from "lucide-react"
import { AssetPartsList } from "@/components/AssetPartsList"

export function AssetConsumables() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  if (!id) {
    return (
      <div className="p-8">
        <p>Missing Asset ID</p>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
            <Droplet className="h-7 w-7" />
            Consumables
          </h1>
          <p className="text-slate-600 mt-1">
            Advanced consumables management with automatic calculations
          </p>
        </div>
      </div>

      {/* Composant pour les consommables uniquement */}
      <AssetPartsList assetId={id} type="consumable" />
    </div>
  )
}
