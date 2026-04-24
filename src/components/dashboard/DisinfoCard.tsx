import { useState, useEffect, useCallback } from "react"
import { Shield, Loader2, Link2, ExternalLink, ChevronDown, ChevronRight, RefreshCw } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { fetchDisinfoSignals, type DisinfoSignal } from "@/lib/api"

const DISINFO_RUN_URL = (import.meta.env.VITE_API_URL || "") + "/api/disinfo/run"

export function DisinfoCard() {
    const [signals, setSignals] = useState<DisinfoSignal[]>([])
    const [loading, setLoading] = useState(true)
    const [running, setRunning] = useState(false)
    const [expandedId, setExpandedId] = useState<number | null>(null)

    const load = useCallback((quiet = false) => {
        if (!quiet) setLoading(true)
        fetchDisinfoSignals({ limit: 100 })
            .then((d) => setSignals(Array.isArray(d) ? d : []))
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [])

    useEffect(() => {
        load()
        const id = setInterval(() => load(true), 60_000)
        return () => clearInterval(id)
    }, [load])

    const runDetection = async () => {
        setRunning(true)
        try {
            await fetch(DISINFO_RUN_URL, { method: "POST" })
            load()
        } catch {
            /* ignore */
        } finally {
            setRunning(false)
        }
    }

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-red-400" />
                <span className="ml-2 text-xs text-muted-foreground">Loading signals…</span>
            </div>
        )
    }

    if (!signals || signals.length === 0) {
        return (
            <div className="flex h-full flex-col items-center justify-center text-center p-4 gap-3">
                <Shield className="h-8 w-8 text-neutral-700 mb-1" />
                <p className="text-xs text-muted-foreground">No active disinformation signals.</p>
                <p className="text-[10px] text-muted-foreground/60 max-w-[180px]">
                    Run an on-demand scan to detect coordinated narratives in recent articles.
                </p>
                <button
                    onClick={runDetection}
                    disabled={running}
                    className="flex items-center gap-1.5 rounded-md bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-[11px] font-semibold text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                    {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    {running ? "Scanning…" : "Run Detection"}
                </button>
            </div>
        )
    }

    return (
        <div className="flex h-full flex-col min-w-0">
            {/* Filter Bar */}
            <div className="flex shrink-0 items-center justify-between border-b border-white/5 px-3 py-1.5">
                <span className="text-[10px] text-muted-foreground">{signals.length} detected</span>
                <button
                    onClick={runDetection}
                    disabled={running}
                    className="flex items-center gap-1 text-[10px] text-red-400/70 hover:text-red-400 transition-colors disabled:opacity-40"
                    title="Run detection scan"
                >
                    {running ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <RefreshCw className="h-2.5 w-2.5" />}
                    {running ? "Scanning…" : "Scan"}
                </button>
            </div>

            <ScrollArea className="flex-1 p-2">
                <div className="space-y-2">
                    {signals.map((s) => (
                        <div 
                            key={s.id} 
                            className={`rounded-lg border bg-white/[0.02] p-2 transition-all ${
                                s.severity === "high" ? "border-red-500/20 hover:border-red-500/40" : 
                                s.severity === "medium" ? "border-orange-500/20 hover:border-orange-500/40" : 
                                "border-white/5 hover:border-white/10"
                            }`}
                        >
                            <div 
                                className="flex cursor-pointer items-start gap-2"
                                onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                            >
                                <button className="mt-0.5 shrink-0 text-muted-foreground hover:text-white transition-colors">
                                    {expandedId === s.id ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                </button>
                                
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-1 mb-1">
                                        <h4 className="text-[11px] font-semibold text-white/90 leading-snug break-words">
                                            {s.signal_type.replace(/_/g, " ")}
                                        </h4>
                                        <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider ${
                                            s.severity === "high" ? "bg-red-500/20 text-red-400" : 
                                            s.severity === "medium" ? "bg-orange-500/20 text-orange-400" : 
                                            "bg-yellow-500/20 text-yellow-400"
                                        }`}>
                                            {s.severity}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 leading-snug line-clamp-2">
                                        {s.narrative_summary}
                                    </p>
                                    
                                    {/* Confidence Bar */}
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Conf</span>
                                        <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full ${s.confidence >= 0.8 ? "bg-red-500" : s.confidence >= 0.6 ? "bg-orange-500" : "bg-yellow-500"}`}
                                                style={{ width: `${s.confidence * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-[9px] font-bold text-white tabular-nums">
                                            {Math.round(s.confidence * 100)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Expanded Details */}
                            {expandedId === s.id && (
                                <div className="mt-3 pt-3 border-t border-white/5 space-y-3 pl-5">
                                    {s.target_entity && (
                                        <div>
                                            <span className="block text-[9px] text-muted-foreground uppercase trwacking-wider mb-1">Target Entity</span>
                                            <span className="inline-flex px-1.5 py-0.5 rounded bg-white/5 text-[9px] text-sky-400 border border-sky-400/20">
                                                {s.target_entity}
                                            </span>
                                        </div>
                                    )}
                                    
                                    {(s.actor_attribution || (s.flagged_sources && s.flagged_sources.length > 0)) && (
                                        <div>
                                            <span className="block text-[9px] text-muted-foreground uppercase trwacking-wider mb-1">Actors / Sources</span>
                                            <div className="flex flex-wrap gap-1">
                                                {s.actor_attribution && (
                                                    <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-[9px] text-red-400 border border-red-500/20">
                                                        {s.actor_attribution}
                                                    </span>
                                                )}
                                                {s.flagged_sources?.slice(0, 3).map((source, i) => (
                                                    <span key={i} className="px-1.5 py-0.5 rounded bg-red-500/10 text-[9px] text-red-400 border border-red-500/20">
                                                        {source}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {s.evidence_articles && s.evidence_articles.length > 0 && (
                                        <div>
                                            <span className="flex items-center gap-1 text-[9px] text-muted-foreground uppercase tracking-wider mb-1.5">
                                                <Link2 className="h-3 w-3" /> Evidence
                                            </span>
                                            <div className="space-y-1">
                                                {s.evidence_articles.slice(0, 3).map((url, i) => (
                                                    <a 
                                                        key={i} 
                                                        href={url} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-white/[0.03] hover:bg-white/[0.06] transition-colors group"
                                                    >
                                                        <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground group-hover:text-white" />
                                                        <span className="text-[10px] text-sky-400/80 group-hover:text-sky-400 truncate">
                                                            {new URL(url).hostname.replace('www.', '')}
                                                        </span>
                                                    </a>
                                                ))}
                                                {s.evidence_articles.length > 3 && (
                                                    <span className="text-[9px] text-muted-foreground pl-1">
                                                        +{s.evidence_articles.length - 3} more articles
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    )
}
