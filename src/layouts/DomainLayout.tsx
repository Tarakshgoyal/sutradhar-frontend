import { useState } from "react"
import { Outlet, useNavigate, useLocation } from "react-router-dom"
import { ArrowLeft, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScenarioModal } from "@/components/dashboard/ScenarioModal"

function DomainNavigation() {
    const navigate = useNavigate()
    const location = useLocation()
    const [scenarioOpen, setScenarioOpen] = useState(false)

    const domainName = location.pathname.split("/").pop()?.replace("-", " ") || "Domain"
    const title = domainName.charAt(0).toUpperCase() + domainName.slice(1)

    return (
        <>
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 bg-black/95 px-4 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-muted-foreground hover:text-white"
                        onClick={() => navigate("/")}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Global Graph
                    </Button>
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <h1 className="text-sm font-semibold text-white tracking-widest uppercase">
                            {title} INTELLIGENCE
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 border-fuchsia-500/30 text-fuchsia-400 bg-fuchsia-500/10 hover:bg-fuchsia-500/20"
                        onClick={() => setScenarioOpen(true)}
                    >
                        <Zap className="mr-2 h-3 w-3" />
                        Simulate
                    </Button>
                </div>
            </div>
            <ScenarioModal isOpen={scenarioOpen} onClose={() => setScenarioOpen(false)} />
        </>
    )
}

export function DomainLayout() {
    return (
        <div className="flex h-screen flex-col bg-[#0a0a0a] text-white">
            <DomainNavigation />
            <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 custom-scrollbar">
                <Outlet />
            </main>
        </div>
    )
}

export default DomainLayout
