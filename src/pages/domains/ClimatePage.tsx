import { useState, useEffect } from "react"
import { DomainStabilityHeader } from "@/components/domains/shared/DomainStabilityHeader"
import { TemporalViewToggle } from "@/components/domains/shared/TemporalViewToggle"
import { PredictionOverlay } from "@/components/domains/shared/PredictionOverlay"
import { DisinformationLayerToggle } from "@/components/domains/shared/DisinformationLayerToggle"
import { ScenarioButton } from "@/components/domains/shared/ScenarioButton"
import { DomainAlertsPanel } from "@/components/domains/shared/DomainAlertsPanel"
import { DomainFilters } from "@/components/domains/shared/DomainFilters"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Thermometer, CloudLightning, Loader2, AlertTriangle, Newspaper, AlertCircle, CloudSun } from "lucide-react"
import { ScenarioModal } from "@/components/dashboard/ScenarioModal"
import {
    fetchWeatherAnomalies,
    fetchSignals,
    fetchReport,
    fetchDisinfoSignals,
    fetchTopNews,
    fetchNewsList,
    type WeatherAnomaly,
    type Signal,
    type Report,
    type DisinfoSignal,
    type NewsArticle,
} from "@/lib/api"

const DOMAIN = "climate"
const DOMAIN_ALIAS = "environment"
const CORE_POLL_MS = 30_000
const REPORT_POLL_MS = 5 * 60_000
const DISINFO_POLL_MS = 60_000
const NEWS_POLL_MS = 60_000

export default function ClimatePage() {
    const [viewMode, setViewMode] = useState<"timeline" | "diff">("timeline")
    const [disinfoEnabled, setDisinfoEnabled] = useState(false)
    const [scenarioOpen, setScenarioOpen] = useState(false)
    const [scenarioPrompt, setScenarioPrompt] = useState("")

    const [anomalies, setAnomalies] = useState<WeatherAnomaly[]>([])
    const [signals, setSignals] = useState<Signal[]>([])
    const [loadingCore, setLoadingCore] = useState(true)

    const [report, setReport] = useState<Report | null>(null)
    const [loadingReport, setLoadingReport] = useState(true)

    const [disinfoSignals, setDisinfoSignals] = useState<DisinfoSignal[]>([])
    const [loadingDisinfo, setLoadingDisinfo] = useState(true)

    const [topNews, setTopNews] = useState<NewsArticle[]>([])
    const [loadingNews, setLoadingNews] = useState(true)
    const [newsWindowLabel, setNewsWindowLabel] = useState("last 24h")

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            try {
                const [anoms, sigs] = await Promise.allSettled([
                    fetchWeatherAnomalies({ days: 30 }),
                    fetchSignals({ domain: DOMAIN, limit: 10 }),
                ])
                if (cancelled) return
                if (anoms.status === "fulfilled") setAnomalies(anoms.value.anomalies)
                if (sigs.status === "fulfilled") setSignals(sigs.value.signals)
            } catch {
                // keep prior values on transient API errors
            } finally {
                if (!cancelled) setLoadingCore(false)
            }
        }
        void load()
        const timer = setInterval(() => { void load() }, CORE_POLL_MS)
        return () => {
            cancelled = true
            clearInterval(timer)
        }
    }, [])

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            try {
                const d = await fetchReport(DOMAIN)
                if (!cancelled) setReport(d.report)
            } catch {
                // keep prior values on transient API errors
            } finally {
                if (!cancelled) setLoadingReport(false)
            }
        }
        void load()
        const timer = setInterval(() => { void load() }, REPORT_POLL_MS)
        return () => {
            cancelled = true
            clearInterval(timer)
        }
    }, [])

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            try {
                const d = await fetchDisinfoSignals({ hours: 72, domain: DOMAIN, limit: 10 })
                if (!cancelled) setDisinfoSignals(d)
            } catch {
                // keep prior values on transient API errors
            } finally {
                if (!cancelled) setLoadingDisinfo(false)
            }
        }
        void load()
        const timer = setInterval(() => { void load() }, DISINFO_POLL_MS)
        return () => {
            cancelled = true
            clearInterval(timer)
        }
    }, [])

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            try {
                const recent = await fetchTopNews(5, 24, DOMAIN)
                if (recent.length > 0) {
                    if (!cancelled) {
                        setTopNews(recent.slice(0, 5))
                        setNewsWindowLabel("last 24h")
                    }
                    return
                }

                const recentAlias = await fetchTopNews(5, 24, DOMAIN_ALIAS)
                if (recentAlias.length > 0) {
                    if (!cancelled) {
                        setTopNews(recentAlias.slice(0, 5))
                        setNewsWindowLabel("last 24h (environment)")
                    }
                    return
                }

                const weekly = await fetchTopNews(5, 168, DOMAIN)
                if (weekly.length > 0) {
                    if (!cancelled) {
                        setTopNews(weekly.slice(0, 5))
                        setNewsWindowLabel("last 7 days")
                    }
                    return
                }

                const weeklyAlias = await fetchTopNews(5, 168, DOMAIN_ALIAS)
                if (weeklyAlias.length > 0) {
                    if (!cancelled) {
                        setTopNews(weeklyAlias.slice(0, 5))
                        setNewsWindowLabel("last 7 days (environment)")
                    }
                    return
                }

                const latest = await fetchNewsList({ domain: DOMAIN, per_page: 5, page: 1 })
                if (!cancelled) {
                    const primary = (latest.articles ?? []).slice(0, 5)
                    if (primary.length > 0) {
                        setTopNews(primary)
                        setNewsWindowLabel("latest available")
                        return
                    }
                }

                const latestAlias = await fetchNewsList({ domain: DOMAIN_ALIAS, per_page: 5, page: 1 })
                if (!cancelled) {
                    const alias = (latestAlias.articles ?? []).slice(0, 5)
                    if (alias.length > 0) {
                        setTopNews(alias)
                        setNewsWindowLabel("latest available (environment)")
                        return
                    }
                }

                const generic = await fetchTopNews(5, 24)
                if (!cancelled) {
                    setTopNews(generic.slice(0, 5))
                    setNewsWindowLabel("global latest (last 24h)")
                }
            } catch {
                // keep prior values on transient API errors
            } finally {
                if (!cancelled) setLoadingNews(false)
            }
        }
        void load()
        const timer = setInterval(() => { void load() }, NEWS_POLL_MS)
        return () => {
            cancelled = true
            clearInterval(timer)
        }
    }, [])

    const openScenario = (prompt: string) => {
        setScenarioPrompt(prompt)
        setScenarioOpen(true)
    }

    const severityColor = (sev: string) => {
        if (sev === "extreme") return { text: "text-red-400", bg: "bg-red-500/20", border: "border-red-500/30" }
        if (sev === "high") return { text: "text-orange-400", bg: "bg-orange-500/20", border: "border-orange-500/30" }
        return { text: "text-amber-400", bg: "bg-amber-500/20", border: "border-amber-500/30" }
    }

    const fallbackActors = report?.key_actors?.slice(0, 6) ?? []

    return (
        <div className="flex flex-col gap-6 p-6 animate-in fade-in duration-500">
            <DomainStabilityHeader domain={DOMAIN} />

            <DomainFilters />

            <div className="flex flex-wrap items-center justify-between gap-4">
                <TemporalViewToggle view={viewMode} onChange={setViewMode} />
                <div className="w-72">
                    <DisinformationLayerToggle enabled={disinfoEnabled} onToggle={setDisinfoEnabled} count={disinfoSignals.length} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="bg-black/40 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-sm text-yellow-500 flex items-center gap-2">
                                <Thermometer className="h-4 w-4" /> Active Weather Anomalies
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingCore ? (
                                <div className="flex items-center gap-2 py-6">
                                    <Loader2 className="h-4 w-4 animate-spin text-sky-400 motion-reduce:animate-none" />
                                    <span className="text-xs text-muted-foreground">Loading anomaly data...</span>
                                </div>
                            ) : anomalies.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic py-4 text-center">No active weather anomalies detected.</p>
                            ) : (
                                <div className="space-y-3">
                                    {anomalies.map((a) => {
                                        const c = severityColor(a.severity)
                                        return (
                                            <div key={a.id} className={`flex items-start gap-3 p-3 rounded border ${c.bg} ${c.border}`}>
                                                <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${c.text}`} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                                        <span className="text-sm font-medium text-white">{a.city} - {a.type.replace(/_/g, " ")}</span>
                                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>{a.severity}</span>
                                                    </div>
                                                    {a.description && (
                                                        <p className="text-xs text-muted-foreground mt-1">{a.description}</p>
                                                    )}
                                                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground mt-1">
                                                        {a.peak_value != null && <span>Peak: {a.peak_value.toFixed(1)}</span>}
                                                        {a.z_score != null && <span>Z-score: {a.z_score.toFixed(2)}sigma</span>}
                                                        <span>{a.start_date} &rarr; {a.end_date ?? "ongoing"}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-black/40 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-sm text-emerald-400 flex items-center gap-2">
                                <CloudLightning className="h-4 w-4" /> Climate Intelligence Signals
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingCore ? (
                                <div className="flex items-center gap-2 py-4">
                                    <Loader2 className="h-4 w-4 animate-spin text-sky-400 motion-reduce:animate-none" />
                                </div>
                            ) : signals.length === 0 && fallbackActors.length > 0 ? (
                                <div className="space-y-3">
                                    <p className="text-xs text-muted-foreground">
                                        No active climate spikes right now. Showing key actors from the latest climate report.
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {fallbackActors.map((actor, i) => (
                                            <div key={i} className="p-3 rounded bg-white/5 border border-white/10">
                                                <div className="flex items-start justify-between gap-2">
                                                    <span className="text-sm font-medium text-white">{actor.name}</span>
                                                    <span className="text-[10px] text-muted-foreground uppercase shrink-0">{actor.type}</span>
                                                </div>
                                                <p className="text-xs text-white/60 mt-1 line-clamp-2">{actor.role}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : signals.length === 0 && anomalies.length > 0 ? (
                                <div className="space-y-3">
                                    <p className="text-xs text-muted-foreground">
                                        No signal spikes right now. Showing most severe active anomalies from live weather backend.
                                    </p>
                                    <div className="space-y-2">
                                        {anomalies.slice(0, 6).map((a) => (
                                            <div key={a.id} className="flex items-center justify-between p-3 rounded bg-white/5 border border-white/10">
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm text-white truncate">{a.city} - {a.type.replace(/_/g, " ")}</span>
                                                    <span className="text-[10px] text-muted-foreground">{a.severity} · {a.start_date}</span>
                                                </div>
                                                <span className="text-xs font-bold text-emerald-300 shrink-0 ml-4">
                                                    {a.z_score != null ? `${a.z_score.toFixed(1)}sigma` : "anomaly"}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : signals.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic py-4 text-center">No active climate signals detected.</p>
                            ) : (
                                <div className="space-y-2">
                                    {signals.map((sig) => (
                                        <div key={sig.id} className="flex items-center justify-between p-3 rounded bg-white/5">
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-sm text-white truncate">{sig.entity_name ?? sig.cluster_label ?? "Signal"}</span>
                                                <span className="text-[10px] text-muted-foreground">{sig.type.replace(/_/g, " ")} · {sig.current_count} mentions</span>
                                            </div>
                                            <span className={`text-sm font-bold tabular-nums shrink-0 ml-4 ${sig.severity === "high" ? "text-red-400" : "text-orange-400"}`}>
                                                {sig.spike_ratio.toFixed(1)}x
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-black/40 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-sm text-cyan-400 flex items-center gap-2">
                                <Newspaper className="h-4 w-4" /> Recent Climate News
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingNews ? (
                                <div className="flex items-center gap-2 py-6">
                                    <Loader2 className="h-4 w-4 animate-spin text-sky-400 motion-reduce:animate-none" />
                                    <span className="text-xs text-muted-foreground">Loading news...</span>
                                </div>
                            ) : topNews.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic py-4 text-center">No recent climate news found.</p>
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-[10px] text-muted-foreground mb-1">Showing {newsWindowLabel}</p>
                                    {topNews.map((article) => (
                                        <a
                                            key={article.id}
                                            href={`/news/${article.id}`}
                                            className="block p-3 rounded bg-white/5 border border-white/10 hover:border-cyan-500/30 hover:bg-white/8 transition-colors"
                                        >
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <h4 className="text-sm font-medium text-white line-clamp-2">{article.title}</h4>
                                                <span className="text-xs font-bold text-cyan-300 shrink-0">
                                                    {article.importance_score.toFixed(1)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                <span>{article.source}</span>
                                                <span>•</span>
                                                <span>{new Date(article.pub_date).toLocaleDateString()}</span>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {disinfoEnabled && (
                        <Card className="bg-red-950/20 border-red-500/20">
                            <CardHeader>
                                <CardTitle className="text-sm text-red-400 flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" /> Disinformation Signals
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loadingDisinfo ? (
                                    <div className="flex items-center gap-2 py-6">
                                        <Loader2 className="h-4 w-4 animate-spin text-red-400 motion-reduce:animate-none" />
                                        <span className="text-xs text-muted-foreground">Loading disinformation signals...</span>
                                    </div>
                                ) : disinfoSignals.length === 0 ? (
                                    <p className="text-sm text-muted-foreground italic py-4 text-center">No disinformation signals detected.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {disinfoSignals.slice(0, 5).map((sig) => (
                                            <div key={sig.id} className="p-3 rounded bg-red-500/10 border border-red-500/20">
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <span className="text-sm font-medium text-red-200">{sig.signal_type.replace(/_/g, " ").toUpperCase()}</span>
                                                    <span className="text-[10px] text-red-300 font-mono">
                                                        {(sig.confidence * 100).toFixed(0)}%
                                                    </span>
                                                </div>
                                                <p className="text-xs text-red-100/70 leading-relaxed mb-2">{sig.narrative_summary}</p>
                                                {(sig.target_entity || (sig.flagged_sources && sig.flagged_sources.length > 0)) && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {sig.target_entity && (
                                                            <span className="text-[10px] bg-red-500/20 border border-red-500/30 text-red-200 px-2 py-0.5 rounded-full">
                                                                Target: {sig.target_entity}
                                                            </span>
                                                        )}
                                                        {sig.flagged_sources?.slice(0, 3).map((source, j) => (
                                                            <span key={j} className="text-[10px] bg-red-500/20 border border-red-500/30 text-red-200 px-2 py-0.5 rounded-full">
                                                                Source: {source}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="space-y-6">
                    <DomainAlertsPanel domain={DOMAIN} />
                    <PredictionOverlay domain={DOMAIN} />

                    {report && (
                        <Card className="bg-black/40 border-white/10">
                            <CardHeader>
                                <CardTitle className="text-sm text-teal-400 flex items-center gap-2">
                                    <CloudSun className="h-4 w-4" /> Latest Climate Brief
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loadingReport ? (
                                    <div className="flex items-center gap-2 py-4">
                                        <Loader2 className="h-4 w-4 animate-spin text-sky-400 motion-reduce:animate-none" />
                                        <span className="text-xs text-muted-foreground">Loading report...</span>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <p className="text-xs text-white/80 leading-relaxed line-clamp-6">
                                            {report.executive_summary}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            Generated: {new Date(report.generated_at).toLocaleString()}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    <div className="space-y-3">
                        <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Simulate Scenarios</h3>
                        <ScenarioButton
                            domain="Climate"
                            prompt="Simulate socioeconomic cascade if wet-bulb temperatures exceed 35C for 5 days in South Asia."
                            onClick={openScenario}
                        />
                        <ScenarioButton
                            domain="Climate"
                            prompt="Model supply chain impact of concurrent droughts in the Panama and Suez canals."
                            onClick={openScenario}
                        />
                    </div>
                </div>
            </div>

            <ScenarioModal isOpen={scenarioOpen} onClose={() => setScenarioOpen(false)} initialScenario={scenarioPrompt} domainFilter={DOMAIN} />
        </div>
    )
}

