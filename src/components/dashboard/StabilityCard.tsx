import { useState, useEffect } from "react"
import { Activity, Loader2, TrendingUp, TrendingDown, Minus, Info } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { fetchStabilityScores, type StabilityScore } from "@/lib/api"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function StabilityCard() {
    const [scores, setScores] = useState<StabilityScore[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedDomain, setSelectedDomain] = useState<string | null>(null)

    useEffect(() => {
        let isMounted = true
        const load = () => {
            fetchStabilityScores()
                .then((d) => {
                    if (isMounted) {
                        // Sort by highest risk (score closest to 10)
                        setScores(d.sort((a, b) => b.score - a.score))
                        setLoading(false)
                    }
                })
                .catch(() => {
                    if (isMounted) setLoading(false)
                })
        }
        
        load()
        const id = setInterval(load, 120000) // Poll every 2m
        return () => {
            isMounted = false
            clearInterval(id)
        }
    }, [])

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                <span className="ml-2 text-xs text-muted-foreground">Loading stability metrics…</span>
            </div>
        )
    }

    if (scores.length === 0) {
        return (
            <div className="flex h-full flex-col items-center justify-center text-center p-4">
                <Activity className="h-8 w-8 text-neutral-800 mb-2" />
                <p className="text-xs text-muted-foreground">No stability data available.</p>
            </div>
        )
    }

    const getColor = (score: number) => {
        if (score >= 7.5) return "bg-red-500"
        if (score >= 4.0) return "bg-orange-500"
        return "bg-emerald-500"
    }
    
    const getTextColor = (score: number) => {
        if (score >= 7.5) return "text-red-400"
        if (score >= 4.0) return "text-orange-400"
        return "text-emerald-400"
    }

    return (
        <div className="flex h-full flex-col min-w-0">
            <div className="flex shrink-0 items-center justify-end border-b border-white/5 px-3 py-1.5">
                <span className="text-[10px] text-muted-foreground">Base: 10 (Max Risk)</span>
            </div>

            <ScrollArea className="flex-1 p-2">
                <div className="space-y-3">
                    {scores.map((s) => (
                        <div key={s.domain} className="space-y-1">
                            <div 
                                className="flex items-center justify-between cursor-pointer group"
                                onClick={() => setSelectedDomain(selectedDomain === s.domain ? null : s.domain)}
                            >
                                <span className="text-[11px] font-medium capitalize text-white/80 group-hover:text-white transition-colors">
                                    {s.domain}
                                </span>
                                <div className="flex items-center gap-1.5">
                                    {s.staleness_penalty > 0 && (
                                        <TooltipProvider delayDuration={0}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="text-[9px] text-orange-400/70 border border-orange-400/20 px-1 rounded cursor-help">
                                                        Stale Data
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent side="left" className="bg-neutral-900 border-white/10 text-xs">
                                                    Penalty applied due to {Math.round(s.data_age_hours)}h without new articles.
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )}
                                    <span className={`text-[11px] font-bold tabular-nums ${getTextColor(s.score)}`}>
                                        {s.score.toFixed(1)}
                                    </span>
                                    {/* Mock Trend Indicator based on score value parity for demonstration */}
                                    {s.score > 6 ? (
                                        <TrendingUp className="h-3 w-3 text-red-500" />
                                    ) : s.score < 4 ? (
                                        <TrendingDown className="h-3 w-3 text-emerald-500" />
                                    ) : (
                                        <Minus className="h-3 w-3 text-white/50" />
                                    )}
                                </div>
                            </div>
                            
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-1000 ${getColor(s.score)}`}
                                    style={{ width: `${(s.score / 10) * 100}%` }}
                                />
                            </div>
                            
                            {/* Drilldown view */}
                            {selectedDomain === s.domain && (
                                <div className="mt-2 text-[10px] bg-white/[0.02] p-2 rounded border border-white/5 flex flex-col gap-2">
                                    <div className="flex items-start gap-1">
                                        <Info className="h-3 w-3 text-sky-400 mt-0.5 shrink-0" />
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-sky-400 mb-0.5 tracking-wider uppercase">Why?</span>
                                            <span className="text-white/80 leading-relaxed">
                                                This score is determined by analyzing {s.components.recent_article_count} recent intelligence signals against an average volume of {Math.round(s.components.weekly_article_count / 7)}. The average impact weight is {s.components.avg_importance_score.toFixed(1)}/10. 
                                                {s.staleness_penalty > 0 ? ` A staleness penalty was applied due to ${Math.round(s.data_age_hours)}h missing data.` : ' Data flow is currently healthy.'}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-2 mt-1">
                                        <div className="flex flex-col">
                                            <span className="text-muted-foreground mb-0.5">Calculated Factors</span>
                                            <div className="flex items-center gap-2 text-white/70 font-mono">
                                                <span>Vol: {(s.components.volume_factor * 10).toFixed(1)}</span>
                                                <span>Imp: {(s.components.importance_factor * 10).toFixed(1)}</span>
                                                {s.staleness_penalty > 0 && <span className="text-orange-400">Pen: +{(s.staleness_penalty * 10).toFixed(1)}</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    )
}
