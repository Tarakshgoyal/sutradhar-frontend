import { useEffect, useState } from "react"
import { Activity, TrendingDown, TrendingUp, Minus, Clock, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { fetchDomainStability, fetchSignals, type StabilityScore } from "@/lib/api"

const STABILITY_POLL_MS = 60_000

interface DomainStabilityHeaderProps {
    domain: string
    /** Optional overrides — if omitted the component fetches from the API */
    score?: number
    trend?: "up" | "down" | "flat"
    timestamp?: string
    drivers?: string[]
}

export function DomainStabilityHeader({ domain, score: scoreProp, trend: trendProp, timestamp: tsProp, drivers: driversProp }: DomainStabilityHeaderProps) {
    const [stability, setStability] = useState<StabilityScore | null>(null)
    const [drivers, setDrivers] = useState<string[]>(driversProp ?? [])
    const [loading, setLoading] = useState(!scoreProp)

    useEffect(() => {
        if (scoreProp !== undefined) return // props override — no fetch

        let cancelled = false

        const load = async () => {
            try {
                // Stability score — map frontend domain names to backend names
                const backendDomain = domain === "Global Alerts" ? "geopolitics"
                    : domain === "economy" ? "economics"
                    : domain

                const [stab, signalsData] = await Promise.allSettled([
                    fetchDomainStability(backendDomain),
                    fetchSignals({ domain: backendDomain, limit: 10 }),
                ])

                if (cancelled) return

                if (stab.status === "fulfilled") {
                    setStability(stab.value)
                }

                // Use top signal entity/cluster names as instability drivers
                if (signalsData.status === "fulfilled" && signalsData.value.signals.length > 0) {
                    const topDrivers = signalsData.value.signals
                        .slice(0, 4)
                        .map(s => s.entity_name || s.cluster_label || s.type)
                        .filter(Boolean) as string[]
                    setDrivers(topDrivers)
                }
            } catch {
                // silently fail — show empty state
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        void load()
        const timer = setInterval(() => { void load() }, STABILITY_POLL_MS)
        return () => {
            cancelled = true
            clearInterval(timer)
        }
    }, [domain, scoreProp])

    const score = scoreProp ?? stability?.score ?? 0
    const rawTrend = trendProp ?? stability?.trend
    const trend: "up" | "down" | "flat" = rawTrend === "rising" ? "up" : rawTrend === "falling" ? "down" : "flat"
    const timestamp = tsProp ?? stability?.computed_at ?? new Date().toISOString()
    const activeDrivers = driversProp ?? drivers

    const isHighRisk = score >= 7.5
    const isMediumRisk = score >= 4.0 && score < 7.5

    const scoreColor = isHighRisk ? "text-red-400" : isMediumRisk ? "text-orange-400" : "text-emerald-400"
    const scoreBg = isHighRisk ? "bg-red-500/10 border-red-500/20" : isMediumRisk ? "bg-orange-500/10 border-orange-500/20" : "bg-emerald-500/10 border-emerald-500/20"

    return (
        <Card className="bg-black/60 border-white/10 backdrop-blur-md mb-6 overflow-hidden">
            <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className={`p-4 rounded-xl border ${scoreBg} flex flex-col items-center justify-center min-w-[100px]`}>
                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Instability</span>
                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin text-sky-400 motion-reduce:animate-none" />
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span className={`text-3xl font-bold tabular-nums ${scoreColor}`}>{score.toFixed(1)}</span>
                                    {trend === "up" ? <TrendingUp className="h-5 w-5 text-red-400" /> :
                                     trend === "down" ? <TrendingDown className="h-5 w-5 text-emerald-400" /> :
                                     <Minus className="h-5 w-5 text-white/50" />}
                                </div>
                            )}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white capitalize flex items-center gap-2">
                                <Activity className="h-6 w-6 text-sky-400" />
                                {domain} Intelligence
                            </h1>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                <Clock className="h-3.5 w-3.5" />
                                Last updated: {new Date(timestamp).toLocaleString()}
                            </div>
                            {stability && (
                                <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                                    {stability.components.recent_article_count ?? 0} recent articles · data age {stability.data_age_hours.toFixed(0)}h
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 md:max-w-md">
                        <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Primary Instability Drivers</h3>
                        {loading ? (
                            <div className="flex gap-2">
                                {[1,2,3].map(i => <div key={i} className="h-6 w-24 rounded bg-white/5 animate-pulse" />)}
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {activeDrivers.map((driver, i) => (
                                    <span key={i} className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-xs text-white/80">
                                        {driver}
                                    </span>
                                ))}
                                {activeDrivers.length === 0 && (
                                    <span className="text-sm text-muted-foreground italic">No primary drivers detected.</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
