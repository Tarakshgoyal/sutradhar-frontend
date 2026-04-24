import { useEffect, useState } from "react"
import { ShieldAlert, AlertTriangle, Info, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchSignals, type Signal } from "@/lib/api"

const ALERTS_POLL_MS = 30_000

interface DomainAlertsPanelProps {
    domain?: string
}

function timeAgo(isoStr: string) {
    const diff = Date.now() - new Date(isoStr).getTime()
    const m = Math.floor(diff / 60000)
    const h = Math.floor(m / 60)
    const d = Math.floor(h / 24)
    if (m < 1) return "just now"
    if (m < 60) return `${m}m ago`
    if (h < 24) return `${h}h ago`
    return `${d}d ago`
}

function signalToAlert(s: Signal): { type: "critical" | "warning" | "info"; msg: string; time: string } {
    const type = s.severity === "high" ? "critical" : "warning"
    let msg = ""
    if (s.type === "entity_spike") {
        msg = `${s.entity_name ?? "Entity"} activity spiked ${s.spike_ratio.toFixed(1)}× above baseline`
    } else if (s.type === "new_entity") {
        msg = `New ${s.entity_type ?? "entity"} detected: ${s.entity_name ?? "Unknown"}`
    } else {
        msg = `Topic cluster "${s.cluster_label ?? s.cluster_id}" trending (${s.spike_ratio.toFixed(1)}×)`
    }
    return { type, msg, time: timeAgo(s.detected_at) }
}

export function DomainAlertsPanel({ domain }: DomainAlertsPanelProps) {
    const [signals, setSignals] = useState<Signal[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            try {
                const d = await fetchSignals({ domain, limit: 5 })
                if (!cancelled) setSignals(d.signals)
            } catch {
                // keep prior values on transient API errors
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        void load()
        const timer = setInterval(() => { void load() }, ALERTS_POLL_MS)
        return () => {
            cancelled = true
            clearInterval(timer)
        }
    }, [domain])

    const alerts = signals.map(signalToAlert)

    // Fallback static alerts when there's no domain data
    const displayAlerts = alerts.length > 0 ? alerts : loading ? [] : [
        { type: "info" as const, msg: "No active signals detected for this domain.", time: "now" }
    ]

    return (
        <Card className="bg-black/40 border-white/10">
            <CardHeader className="py-3">
                <CardTitle className="text-sm text-red-400 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" /> Domain Alerts
                </CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex items-center gap-2 py-3">
                        <Loader2 className="h-4 w-4 animate-spin text-sky-400 motion-reduce:animate-none" />
                        <span className="text-xs text-muted-foreground">Loading signals…</span>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {displayAlerts.map((a, i) => (
                            <div key={i} className={`flex items-start gap-2 p-2 rounded border ${
                                a.type === "critical" ? "bg-red-500/10 border-red-500/20 text-red-100" :
                                a.type === "warning" ? "bg-amber-500/10 border-amber-500/20 text-amber-100" :
                                "bg-blue-500/10 border-blue-500/20 text-blue-100"
                            }`}>
                                {a.type === "critical" ? <ShieldAlert className="h-3 w-3 mt-0.5 text-red-400 shrink-0" /> :
                                 a.type === "warning" ? <AlertTriangle className="h-3 w-3 mt-0.5 text-amber-400 shrink-0" /> :
                                 <Info className="h-3 w-3 mt-0.5 text-blue-400 shrink-0" />}
                                <div className="flex flex-col flex-1 min-w-0">
                                    <span className="text-xs leading-snug">{a.msg}</span>
                                    <span className="text-[9px] opacity-60 mt-0.5">{a.time}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
