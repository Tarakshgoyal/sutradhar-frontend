import { useEffect, useState } from "react"
import { TrendingUp, AlertTriangle, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { fetchPredictions, type PredictionOut } from "@/lib/api"

const PREDICTIONS_POLL_MS = 60_000

// ── Static (prop-based) prediction shape ────────────────────────────────────
interface StaticPrediction {
    id: string
    title: string
    probability: number
    timeframe: string
    reasoning: string
}

interface PredictionOverlayProps {
    /** When provided the component uses these directly (no fetch). */
    predictions?: StaticPrediction[]
    /** When provided the component fetches live predictions for this domain. */
    domain?: string
}

function timeframe(isoStr?: string) {
    if (!isoStr) return "Open-ended"
    const days = Math.round((new Date(isoStr).getTime() - Date.now()) / 86_400_000)
    if (days <= 0) return "Expired"
    if (days === 1) return "Next 1 day"
    if (days < 7) return `Next ${days} days`
    if (days < 30) return `Next ${Math.round(days / 7)} weeks`
    return `Next ${Math.round(days / 30)} months`
}

function mapApiToStatic(p: PredictionOut): StaticPrediction {
    return {
        id: String(p.id),
        title: p.prediction_text,
        probability: p.confidence,
        timeframe: timeframe(p.expires_at),
        reasoning: p.confidence_components
            ? Object.entries(p.confidence_components)
                  .map(([k, v]) => `${k.replace(/_/g, " ")}: ${(v * 100).toFixed(0)}%`)
                  .join(" · ")
            : `Confidence: ${(p.confidence * 100).toFixed(0)}%`,
    }
}

export function PredictionOverlay({ predictions: propPredictions, domain }: PredictionOverlayProps) {
    const [livePredictions, setLivePredictions] = useState<StaticPrediction[]>([])
    const [loading, setLoading] = useState(!propPredictions && !!domain)

    useEffect(() => {
        if (propPredictions || !domain) return
        let cancelled = false
        const backendDomain = domain === "economy" ? "economics" : domain
        const load = async () => {
            try {
                const data = await fetchPredictions({ domain: backendDomain, limit: 4 })
                if (!cancelled) setLivePredictions(data.map(mapApiToStatic))
            } catch {
                // keep prior values on transient API errors
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        void load()
        const timer = setInterval(() => { void load() }, PREDICTIONS_POLL_MS)
        return () => {
            cancelled = true
            clearInterval(timer)
        }
    }, [domain, propPredictions])

    const predictions = propPredictions ?? livePredictions

    if (!loading && predictions.length === 0) return null

    return (
        <Card className="bg-black/80 border-white/10 backdrop-blur-md">
            <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-emerald-400">Future Risk Predictions</h3>
                </div>

                {loading ? (
                    <div className="flex items-center gap-2 py-3">
                        <Loader2 className="h-4 w-4 animate-spin text-sky-400 motion-reduce:animate-none" />
                        <span className="text-xs text-muted-foreground">Loading predictions…</span>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {predictions.map(pred => (
                            <div key={pred.id} className="bg-white/5 border border-white/10 rounded-lg p-3 group hover:border-emerald-500/30 transition-colors">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <span className="text-sm font-medium text-white leading-snug">{pred.title}</span>
                                    <div className="flex flex-col items-end shrink-0">
                                        <span className={`text-xs font-bold tabular-nums ${pred.probability > 0.7 ? "text-red-400" : pred.probability > 0.4 ? "text-orange-400" : "text-emerald-400"}`}>
                                            {(pred.probability * 100).toFixed(0)}%
                                        </span>
                                        <span className="text-[9px] text-muted-foreground">{pred.timeframe}</span>
                                    </div>
                                </div>
                                <div className="text-[11px] text-gray-400 leading-relaxed flex gap-2">
                                    <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5 text-emerald-500/50" />
                                    <span>{pred.reasoning}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
