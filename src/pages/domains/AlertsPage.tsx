import { useState, useEffect, useCallback } from "react"
import { DomainStabilityHeader } from "@/components/domains/shared/DomainStabilityHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    BellRing, ShieldAlert, Activity, TrendingUp, Loader2, Sparkles,
    AlertTriangle, Eye, Radio, Globe, Newspaper, ChevronDown, ChevronUp,
    RefreshCw, Filter, Shield, Zap,
} from "lucide-react"
import {
    fetchSignals, fetchDisinfoSignals, fetchDisinfoNarratives,
    fetchSourceCredibilityList, fetchStabilityScores,
    type Signal, type DisinfoSignal, type SourceCredibility, type StabilityScore,
} from "@/lib/api"

// ── helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    const h = Math.floor(m / 60)
    const d = Math.floor(h / 24)
    if (m < 1) return "just now"
    if (m < 60) return `${m}m ago`
    if (h < 24) return `${h}h ago`
    return `${d}d ago`
}

const DOMAIN_COLORS: Record<string, string> = {
    geopolitics: "text-red-400 bg-red-500/10 border-red-500/20",
    defense: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    economics: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    technology: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    energy: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    health: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    climate: "text-teal-400 bg-teal-500/10 border-teal-500/20",
    diplomacy: "text-purple-400 bg-purple-500/10 border-purple-500/20",
}
const domainCls = (d: string | null) => DOMAIN_COLORS[d ?? ""] ?? "text-slate-400 bg-slate-500/10 border-slate-500/20"

// ── sub-components ────────────────────────────────────────────────────────────

function SectionLoader() {
    return (
        <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs">Loading…</span>
        </div>
    )
}

function EmptyState({ label }: { label: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
            <BellRing className="h-8 w-8 opacity-20" />
            <p className="text-xs">{label}</p>
        </div>
    )
}

// ── Anomaly Signals ───────────────────────────────────────────────────────────

const SIGNAL_ICONS: Record<string, typeof TrendingUp> = {
    entity_spike: TrendingUp,
    new_entity: Sparkles,
    topic_spike: Activity,
}

function signalTitle(s: Signal) {
    switch (s.type) {
        case "entity_spike":
            return `${s.entity_name ?? "Entity"} activity spike — ${s.spike_ratio.toFixed(1)}× baseline`
        case "new_entity":
            return `New ${s.entity_type ?? "entity"} emerged: ${s.entity_name ?? "Unknown"}`
        case "topic_spike":
            return `${s.cluster_label ?? "Topic"} trending — ${s.spike_ratio.toFixed(1)}× increase`
        default:
            return "Unknown signal"
    }
}

function AnomalySignalRow({ s }: { s: Signal }) {
    const Icon = SIGNAL_ICONS[s.type] ?? BellRing
    const isHigh = s.severity === "high"
    return (
        <div className={`flex items-center gap-4 p-3 rounded-lg border transition-colors hover:bg-white/5 ${
            isHigh ? "border-red-500/20 bg-red-500/5" : "border-yellow-500/20 bg-yellow-500/5"
        }`}>
            <div className={`p-2 rounded-full shrink-0 ${isHigh ? "bg-red-500/10" : "bg-yellow-500/10"}`}>
                <Icon className={`h-4 w-4 ${isHigh ? "text-red-400" : "text-yellow-400"}`} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                    <Badge variant="outline" className={`text-[9px] uppercase ${isHigh ? "border-red-500/30 text-red-400" : "border-yellow-500/30 text-yellow-400"}`}>
                        {s.severity}
                    </Badge>
                    <Badge variant="outline" className="text-[9px] uppercase border-sky-500/30 text-sky-400">
                        {s.type.replace(/_/g, " ")}
                    </Badge>
                    {s.domain && (
                        <Badge variant="outline" className={`text-[9px] uppercase border ${domainCls(s.domain)}`}>
                            {s.domain}
                        </Badge>
                    )}
                    <span className="ml-auto text-[10px] text-muted-foreground">{timeAgo(s.detected_at)}</span>
                </div>
                <p className="text-sm text-white/90">{signalTitle(s)}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                    Current: <span className="text-white font-mono">{s.current_count}</span>
                    {" · "}Baseline: <span className="text-white font-mono">{s.baseline_count.toFixed(1)}</span>
                    {s.entity_type && ` · Type: ${s.entity_type}`}
                </p>
            </div>
            <div className={`shrink-0 text-right ${isHigh ? "text-red-400" : "text-yellow-400"}`}>
                <p className="text-[9px] uppercase text-muted-foreground mb-0.5">Spike</p>
                <p className="text-lg font-bold font-mono">{s.spike_ratio.toFixed(1)}×</p>
            </div>
        </div>
    )
}

// ── Disinfo Signals ───────────────────────────────────────────────────────────

function DisinfoRow({ d }: { d: DisinfoSignal }) {
    const [open, setOpen] = useState(false)
    const sev = d.severity
    const cls = sev === "high" ? "border-red-500/20 bg-red-500/5" :
                sev === "medium" ? "border-yellow-500/20 bg-yellow-500/5" :
                "border-slate-500/20 bg-slate-500/5"
    const txtCls = sev === "high" ? "text-red-400" : sev === "medium" ? "text-yellow-400" : "text-slate-400"

    return (
        <div className={`rounded-lg border ${cls} overflow-hidden`}>
            <div
                className="flex items-start gap-3 p-3 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setOpen(o => !o)}
            >
                <Shield className={`h-4 w-4 shrink-0 mt-0.5 ${txtCls}`} />
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                        <Badge variant="outline" className={`text-[9px] uppercase border ${txtCls} border-current/30`}>
                            {d.severity}
                        </Badge>
                        <Badge variant="outline" className="text-[9px] uppercase border-fuchsia-500/30 text-fuchsia-400">
                            {d.signal_type.replace(/_/g, " ")}
                        </Badge>
                        {d.target_domain && (
                            <Badge variant="outline" className={`text-[9px] uppercase border ${domainCls(d.target_domain)}`}>
                                {d.target_domain}
                            </Badge>
                        )}
                        <span className="ml-auto text-[10px] text-muted-foreground">{timeAgo(d.detected_at)}</span>
                    </div>
                    <p className="text-sm text-white/90 line-clamp-2">{d.narrative_summary}</p>
                    {d.actor_attribution && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            Actor: <span className="text-orange-300">{d.actor_attribution}</span>
                        </p>
                    )}
                </div>
                <div className="shrink-0 flex items-center gap-1.5">
                    <span className={`text-sm font-bold font-mono ${txtCls}`}>{(d.confidence * 100).toFixed(0)}%</span>
                    {open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
            </div>
            {open && (
                <div className="px-4 pb-3 pt-1 border-t border-white/5 space-y-2">
                    {d.target_entity && (
                        <p className="text-xs text-muted-foreground">Target entity: <span className="text-white">{d.target_entity}</span></p>
                    )}
                    {d.flagged_sources && d.flagged_sources.length > 0 && (
                        <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Flagged Sources</p>
                            <div className="flex flex-wrap gap-1">
                                {d.flagged_sources.map((src, i) => (
                                    <span key={i} className="text-[10px] bg-red-500/10 border border-red-500/20 text-red-300 px-2 py-0.5 rounded-full">{src}</span>
                                ))}
                            </div>
                        </div>
                    )}
                    {d.evidence_articles && d.evidence_articles.length > 0 && (
                        <p className="text-[11px] text-muted-foreground">{d.evidence_articles.length} evidence article{d.evidence_articles.length !== 1 ? "s" : ""} linked</p>
                    )}
                </div>
            )}
        </div>
    )
}

// ── Coordinated Narratives ────────────────────────────────────────────────────

function NarrativeRow({ n }: { n: any }) {
    return (
        <div className="p-3 rounded-lg border border-fuchsia-500/20 bg-fuchsia-500/5 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-white/90 flex-1">{n.narrative}</p>
                <span className="shrink-0 text-[10px] font-bold font-mono text-fuchsia-300">
                    {(n.coordination_score * 100).toFixed(0)}% coord
                </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                {n.target_domain && (
                    <span className={`border rounded-full px-2 py-0.5 ${domainCls(n.target_domain)}`}>{n.target_domain}</span>
                )}
                <span>{n.article_count} articles</span>
                <span>confidence {(n.confidence * 100).toFixed(0)}%</span>
                <span className="ml-auto">{timeAgo(n.detected_at)}</span>
            </div>
            {n.flagged_sources?.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                    {n.flagged_sources.slice(0, 5).map((s: string, i: number) => (
                        <span key={i} className="text-[9px] bg-red-500/10 border border-red-500/20 text-red-300 px-1.5 py-0.5 rounded-full">{s}</span>
                    ))}
                    {n.flagged_sources.length > 5 && <span className="text-[9px] text-muted-foreground">+{n.flagged_sources.length - 5}</span>}
                </div>
            )}
        </div>
    )
}

// ── Domain Stability Panel ────────────────────────────────────────────────────

function StabilityPanel({ scores }: { scores: StabilityScore[] }) {
    const sorted = [...scores].sort((a, b) => b.score - a.score)
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {sorted.map(s => {
                const pct = Math.min(s.score / 10, 1)
                const color = s.score >= 7 ? "bg-red-500" : s.score >= 4 ? "bg-yellow-500" : "bg-emerald-500"
                const textColor = s.score >= 7 ? "text-red-400" : s.score >= 4 ? "text-yellow-400" : "text-emerald-400"
                return (
                    <div key={s.domain} className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-1.5">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground capitalize">{s.domain}</span>
                            <span className={`text-sm font-bold font-mono ${textColor}`}>{s.score.toFixed(1)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct * 100}%` }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            {s.components.recent_article_count} articles · {s.data_age_hours.toFixed(0)}h ago
                        </p>
                    </div>
                )
            })}
        </div>
    )
}

// ── Source Credibility ────────────────────────────────────────────────────────

function SourceTable({ sources }: { sources: SourceCredibility[] }) {
    const flagged = sources.filter(s => s.is_flagged)
    const clean = sources.filter(s => !s.is_flagged).slice(0, 10)
    const display = [...flagged, ...clean]
    if (display.length === 0) return <EmptyState label="No source data available." />
    return (
        <div className="space-y-1.5">
            {display.map((s, i) => (
                <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                    s.is_flagged ? "bg-red-500/5 border border-red-500/15" : "bg-white/5 border border-white/5"
                }`}>
                    <Globe className={`h-3.5 w-3.5 shrink-0 ${s.is_flagged ? "text-red-400" : "text-muted-foreground"}`} />
                    <span className="text-xs text-white flex-1 truncate">{s.source_name}</span>
                    {s.credibility_score != null && (
                        <span className="text-[10px] font-mono text-muted-foreground">{(s.credibility_score * 100).toFixed(0)}% cred</span>
                    )}
                    {s.is_flagged ? (
                        <Badge variant="outline" className="text-[9px] border-red-500/30 text-red-400">
                            {s.disinfo_flag_count} flag{s.disinfo_flag_count !== 1 ? "s" : ""}
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400">clean</Badge>
                    )}
                </div>
            ))}
        </div>
    )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = "anomaly" | "disinfo" | "narratives" | "stability" | "sources"

export default function AlertsPage() {
    const [tab, setTab] = useState<Tab>("anomaly")
    const [severityFilter, setSeverityFilter] = useState<"all" | "high" | "medium">("all")
    const [domainFilter, setDomainFilter] = useState<string>("all")
    const [refreshing, setRefreshing] = useState(false)

    const [signals, setSignals] = useState<Signal[]>([])
    const [disinfoSignals, setDisinfoSignals] = useState<DisinfoSignal[]>([])
    const [narratives, setNarratives] = useState<any[]>([])
    const [stability, setStability] = useState<StabilityScore[]>([])
    const [sources, setSources] = useState<SourceCredibility[]>([])

    const [loadingSignals, setLoadingSignals] = useState(true)
    const [loadingDisinfo, setLoadingDisinfo] = useState(true)
    const [loadingNarratives, setLoadingNarratives] = useState(true)
    const [loadingStability, setLoadingStability] = useState(true)
    const [loadingSources, setLoadingSources] = useState(true)

    const DOMAINS = ["geopolitics", "defense", "economics", "technology", "energy", "health", "climate", "diplomacy"]

    const loadAll = useCallback(async () => {
        setRefreshing(true)

        // Anomaly signals
        setLoadingSignals(true)
        fetchSignals({ limit: 100 })
            .then(d => setSignals(d.signals))
            .catch(() => {})
            .finally(() => setLoadingSignals(false))

        // Disinfo signals
        setLoadingDisinfo(true)
        fetchDisinfoSignals({ limit: 50 })
            .then(d => setDisinfoSignals(d))
            .catch(() => {})
            .finally(() => setLoadingDisinfo(false))

        // Narratives
        setLoadingNarratives(true)
        fetchDisinfoNarratives(20)
            .then(d => setNarratives(d))
            .catch(() => {})
            .finally(() => setLoadingNarratives(false))

        // Stability
        setLoadingStability(true)
        fetchStabilityScores()
            .then(d => setStability(d))
            .catch(() => {})
            .finally(() => setLoadingStability(false))

        // Sources
        setLoadingSources(true)
        fetchSourceCredibilityList(false, 60)
            .then(d => setSources(d))
            .catch(() => {})
            .finally(() => setLoadingSources(false))

        setRefreshing(false)
    }, [])

    useEffect(() => {
        loadAll()
        const interval = setInterval(loadAll, 60_000)
        return () => clearInterval(interval)
    }, [loadAll])

    // Derived filtered signals
    const filteredSignals = signals.filter(s =>
        (severityFilter === "all" || s.severity === severityFilter) &&
        (domainFilter === "all" || s.domain === domainFilter)
    )
    const filteredDisinfo = disinfoSignals.filter(s =>
        (severityFilter === "all" || s.severity === severityFilter) &&
        (domainFilter === "all" || s.target_domain === domainFilter)
    )

    const highCount = signals.filter(s => s.severity === "high").length
    const disinfoHighCount = disinfoSignals.filter(s => s.severity === "high").length
    const totalAlerts = signals.length + disinfoSignals.length

    const TABS: { id: Tab; label: string; icon: typeof BellRing; count?: number }[] = [
        { id: "anomaly", label: "Anomaly Signals", icon: Zap, count: signals.length },
        { id: "disinfo", label: "Disinformation", icon: Shield, count: disinfoSignals.length },
        { id: "narratives", label: "Narratives", icon: Radio, count: narratives.length },
        { id: "stability", label: "Domain Stability", icon: Activity },
        { id: "sources", label: "Source Intel", icon: Newspaper },
    ]

    return (
        <div className="flex flex-col gap-5 p-6 animate-in fade-in duration-500">
            <DomainStabilityHeader domain="alerts" />

            {/* Summary bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: "Total Active Alerts", value: totalAlerts, icon: BellRing, color: "text-white" },
                    { label: "High Severity", value: highCount + disinfoHighCount, icon: AlertTriangle, color: "text-red-400" },
                    { label: "Disinfo Signals", value: disinfoSignals.length, icon: Shield, color: "text-fuchsia-400" },
                    { label: "Narratives Tracked", value: narratives.length, icon: Radio, color: "text-sky-400" },
                ].map(card => (
                    <div key={card.label} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                        <card.icon className={`h-5 w-5 shrink-0 ${card.color}`} />
                        <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{card.label}</p>
                            <p className={`text-xl font-bold font-mono ${card.color}`}>{card.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters + Refresh */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Severity filter */}
                <div className="flex items-center gap-1 p-1 rounded-lg bg-black/40 border border-white/10">
                    {(["all", "high", "medium"] as const).map(sev => (
                        <button
                            key={sev}
                            onClick={() => setSeverityFilter(sev)}
                            className={`px-3 py-1 text-xs rounded transition-colors capitalize ${
                                severityFilter === sev
                                    ? sev === "high" ? "bg-red-500/20 text-red-400"
                                    : sev === "medium" ? "bg-yellow-500/20 text-yellow-400"
                                    : "bg-white/10 text-white"
                                    : "text-muted-foreground hover:text-white"
                            }`}
                        >
                            {sev === "all" ? `All (${totalAlerts})` : `${sev.charAt(0).toUpperCase() + sev.slice(1)} (${
                                sev === "high" ? highCount + disinfoHighCount : signals.filter(s => s.severity === sev).length + disinfoSignals.filter(s => s.severity === sev).length
                            })`}
                        </button>
                    ))}
                </div>

                {/* Domain filter */}
                <div className="flex items-center gap-1.5">
                    <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                    <select
                        value={domainFilter}
                        onChange={e => setDomainFilter(e.target.value)}
                        className="h-7 px-2 text-xs bg-black/40 border border-white/10 rounded-md text-white focus:outline-none focus:border-sky-500/50"
                    >
                        <option value="all">All Domains</option>
                        {DOMAINS.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                    </select>
                </div>

                <button
                    onClick={loadAll}
                    disabled={refreshing}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-muted-foreground hover:text-white"
                >
                    <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            {/* Tab navigation */}
            <div className="flex gap-1 p-1 rounded-xl bg-black/40 border border-white/10 flex-wrap">
                {TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors flex-1 justify-center ${
                            tab === t.id ? "bg-white/10 text-white font-medium" : "text-muted-foreground hover:text-white"
                        }`}
                    >
                        <t.icon className="h-3.5 w-3.5" />
                        {t.label}
                        {t.count !== undefined && t.count > 0 && (
                            <span className={`rounded-full px-1.5 text-[9px] font-bold ${
                                tab === t.id ? "bg-sky-500/20 text-sky-400" : "bg-white/10 text-muted-foreground"
                            }`}>{t.count}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <Card className="bg-black/40 border-white/10">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base text-white flex items-center gap-2">
                        {tab === "anomaly" && <><Zap className="h-4 w-4 text-sky-400" /> Anomaly Signals</>}
                        {tab === "disinfo" && <><Shield className="h-4 w-4 text-fuchsia-400" /> Disinformation Intelligence</>}
                        {tab === "narratives" && <><Radio className="h-4 w-4 text-orange-400" /> Coordinated Narratives</>}
                        {tab === "stability" && <><Activity className="h-4 w-4 text-emerald-400" /> Domain Instability Scores</>}
                        {tab === "sources" && <><Newspaper className="h-4 w-4 text-yellow-400" /> Source Credibility Intel</>}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {tab === "anomaly" && (
                        loadingSignals ? <SectionLoader /> :
                        filteredSignals.length === 0 ? <EmptyState label="No anomaly signals match the current filters." /> :
                        <div className="space-y-2">
                            {filteredSignals.map(s => <AnomalySignalRow key={s.id} s={s} />)}
                        </div>
                    )}

                    {tab === "disinfo" && (
                        loadingDisinfo ? <SectionLoader /> :
                        filteredDisinfo.length === 0 ? <EmptyState label="No disinformation signals detected." /> :
                        <div className="space-y-2">
                            {filteredDisinfo.map(d => <DisinfoRow key={d.id} d={d} />)}
                        </div>
                    )}

                    {tab === "narratives" && (
                        loadingNarratives ? <SectionLoader /> :
                        narratives.length === 0 ? <EmptyState label="No coordinated narratives detected." /> :
                        <div className="space-y-2">
                            {narratives.map((n, i) => <NarrativeRow key={i} n={n} />)}
                        </div>
                    )}

                    {tab === "stability" && (
                        loadingStability ? <SectionLoader /> :
                        stability.length === 0 ? <EmptyState label="No stability data available." /> :
                        <div className="space-y-4">
                            <p className="text-xs text-muted-foreground">
                                Instability score 0–10. Higher = more volatile. Based on article volume and importance in the last 48h.
                            </p>
                            <StabilityPanel scores={stability} />
                            {/* High instability alerts */}
                            {stability.filter(s => s.score >= 6).length > 0 && (
                                <div className="mt-4 space-y-2">
                                    <p className="text-[10px] uppercase tracking-wider text-red-400 font-semibold">⚠ High Instability Domains</p>
                                    {stability.filter(s => s.score >= 6).sort((a, b) => b.score - a.score).map(s => (
                                        <div key={s.domain} className="flex items-center gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                                            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                                            <div className="flex-1">
                                                <p className="text-sm text-white capitalize">{s.domain}</p>
                                                <p className="text-[11px] text-muted-foreground">
                                                    {s.components.recent_article_count} high-importance articles · avg score {s.components.avg_importance_score}
                                                </p>
                                            </div>
                                            <span className="text-red-400 font-bold font-mono">{s.score.toFixed(1)}/10</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {tab === "sources" && (
                        loadingSources ? <SectionLoader /> :
                        <div className="space-y-3">
                            {sources.filter(s => s.is_flagged).length > 0 && (
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-red-400 font-semibold mb-2 flex items-center gap-1.5">
                                        <Eye className="h-3 w-3" /> Flagged Sources ({sources.filter(s => s.is_flagged).length})
                                    </p>
                                    <SourceTable sources={sources.filter(s => s.is_flagged)} />
                                </div>
                            )}
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">All Monitored Sources</p>
                                <SourceTable sources={sources} />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
