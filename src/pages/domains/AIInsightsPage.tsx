import { useState } from "react"
import { DomainStabilityHeader } from "@/components/domains/shared/DomainStabilityHeader"
import { TemporalViewToggle } from "@/components/domains/shared/TemporalViewToggle"
import { PredictionOverlay } from "@/components/domains/shared/PredictionOverlay"
import { DisinformationLayerToggle } from "@/components/domains/shared/DisinformationLayerToggle"
import { ScenarioButton } from "@/components/domains/shared/ScenarioButton"
import { ScenarioModal } from "@/components/dashboard/ScenarioModal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Binary, Gavel, GlobeLock } from "lucide-react"

export default function AIInsightsPage() {
    const [viewMode, setViewMode] = useState<'timeline' | 'diff'>('timeline')
    const [disinfoEnabled, setDisinfoEnabled] = useState(false)
    const [scenarioOpen, setScenarioOpen] = useState(false)
    const [scenarioPrompt, setScenarioPrompt] = useState("")

    const openScenario = (prompt: string) => {
        setScenarioPrompt(prompt)
        setScenarioOpen(true)
    }

    const mockPredictions = [
        { id: "ai1", title: "AGI Benchmark Acceleration", probability: 0.85, timeframe: "Next 6 Months", reasoning: "Convergence of synthetic data generation and novel reasoning architectures." },
        { id: "ai2", title: "Fragmented Regulatory Regimes", probability: 0.92, timeframe: "Next 12 Months", reasoning: "Divergent approaches to open-source model weighting in EU vs. US policy drafts." }
    ]

    return (
        <div className="flex flex-col gap-6 p-6 animate-in fade-in duration-500">
            <DomainStabilityHeader 
                domain="AI Insights" 
                score={7.8} 
                trend="up" 
                timestamp={new Date().toISOString()}
                drivers={["Model Capability Leaks", "Compute Monopolization", "Regulatory Uncertainty"]}
            />

            <div className="flex flex-wrap items-center justify-between gap-4">
                <TemporalViewToggle view={viewMode} onChange={setViewMode} />
                <div className="w-72">
                    <DisinformationLayerToggle enabled={disinfoEnabled} onToggle={setDisinfoEnabled} count={42} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="bg-black/40 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-sm text-violet-400 flex items-center gap-2">
                                <Binary className="h-4 w-4" /> Global Model Capability Tracking
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-64 flex flex-col items-center justify-center border border-white/5 bg-white/[0.02] rounded-lg">
                                <Binary className="h-8 w-8 text-violet-500/50 mb-3 animate-pulse" />
                                <span className="text-muted-foreground text-sm">Frontier Model Capability Scatter Plot</span>
                                <span className="text-xs text-violet-500/50 mt-1">Parameters vs. Reasoning Benchmarks over time</span>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="bg-black/40 border-white/10">
                            <CardHeader>
                                <CardTitle className="text-sm text-sky-400 flex items-center gap-2">
                                    <GlobeLock className="h-4 w-4" /> AI Geopolitical Competition
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-white/80">Sovereign Compute Accumulation</span>
                                            <span className="text-red-400 font-bold">Intense</span>
                                        </div>
                                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-red-500 w-[90%]" />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-white/80">Talent Migration Restriction</span>
                                            <span className="text-orange-400 font-bold">Moderate</span>
                                        </div>
                                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-orange-500 w-[60%]" />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-white/80">Open Source Geo-Weaponization</span>
                                            <span className="text-sky-400 font-bold">Emergent</span>
                                        </div>
                                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-sky-500 w-[35%]" />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-black/40 border-white/10">
                            <CardHeader>
                                <CardTitle className="text-sm text-yellow-400 flex items-center gap-2">
                                    <Gavel className="h-4 w-4" /> Regulatory Shifts
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {[
                                        { policy: "EU AI Act Implementation", impact: "High", icon: Gavel },
                                        { policy: "US Executive Order Expansion", impact: "Medium", icon: Gavel },
                                        { policy: "Global Safety Summit Treaty", impact: "Pending", icon: Gavel }
                                    ].map(reg => (
                                        <div key={reg.policy} className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5">
                                            <div className="flex items-center gap-2">
                                                <reg.icon className="h-3.5 w-3.5 text-yellow-400/70" />
                                                <span className="text-sm text-white truncate max-w-[120px] sm:max-w-[150px]">{reg.policy}</span>
                                            </div>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${reg.impact === 'High' ? 'bg-red-500/20 text-red-400' : reg.impact === 'Medium' ? 'bg-orange-500/20 text-orange-400' : 'bg-white/10 text-muted-foreground'}`}>
                                                {reg.impact}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="space-y-6">
                    <PredictionOverlay predictions={mockPredictions} />

                    <div className="space-y-3">
                        <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Simulate Scenarios</h3>
                        <ScenarioButton
                            domain="AI Insights"
                            prompt="Model geopolitical fallout if a rogue state achieves unrestricted multi-modal capability."
                            onClick={openScenario}
                        />
                        <ScenarioButton
                            domain="AI Insights"
                            prompt="Evaluate global GDP shift resulting from full automation of tier-1 cognitive labor."
                            onClick={openScenario}
                        />
                    </div>
                </div>
            </div>
            <ScenarioModal isOpen={scenarioOpen} onClose={() => setScenarioOpen(false)} initialScenario={scenarioPrompt} domainFilter="technology" />
        </div>
    )
}
