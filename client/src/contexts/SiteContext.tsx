import React, { createContext, useContext, useState, useEffect } from "react"
import { Site, listSites } from "@/api/sites"

interface SiteContextType {
    sites: Site[]
    currentSite: Site | null
    setCurrentSite: (site: Site | null) => void
    loading: boolean
    refreshSites: () => Promise<void>
}

const SiteContext = createContext<SiteContextType | undefined>(undefined)

export function SiteProvider({ children }: { children: React.ReactNode }) {
    const [sites, setSites] = useState<Site[]>([])
    const [currentSite, setCurrentSite] = useState<Site | null>(null)
    const [loading, setLoading] = useState(true)

    const refreshSites = async () => {
        try {
            const response = await listSites()
            setSites(response.sites || [])

            // Attempt to restore selection from localStorage
            const savedSiteId = localStorage.getItem('texmaintain_site_id')
            if (savedSiteId && response.sites) {
                const found = response.sites.find(s => s._id === savedSiteId)
                if (found) setCurrentSite(found)
            }
        } catch (error) {
            console.error("Failed to load sites", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        refreshSites()
    }, [])

    const handleSetSite = (site: Site | null) => {
        setCurrentSite(site);
        if (site) {
            localStorage.setItem('texmaintain_site_id', site._id);
        } else {
            localStorage.removeItem('texmaintain_site_id');
        }
    }

    return (
        <SiteContext.Provider value={{ sites, currentSite, setCurrentSite: handleSetSite, loading, refreshSites }}>
            {children}
        </SiteContext.Provider>
    )
}

export function useSite() {
    const context = useContext(SiteContext)
    if (context === undefined) {
        throw new Error("useSite must be used within a SiteProvider")
    }
    return context
}
