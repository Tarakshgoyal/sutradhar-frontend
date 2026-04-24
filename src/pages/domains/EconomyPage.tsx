import { useState, useEffect } from "react"
import { DomainStabilityHeader } from "@/components/domains/shared/DomainStabilityHeader"
import { TemporalViewToggle } from "@/components/domains/shared/TemporalViewToggle"
import { PredictionOverlay } from "@/components/domains/shared/PredictionOverlay"
import { DisinformationLayerToggle } from "@/components/domains/shared/DisinformationLayerToggle"
import { ScenarioButton } from "@/components/domains/shared/ScenarioButton"
import { DomainAlertsPanel } from "@/components/domains/shared/DomainAlertsPanel"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, TrendingUp, Loader2, Newspaper, AlertCircle, LineChart } from "lucide-react"
import { ScenarioModal } from "@/components/dashboard/ScenarioModal"
import {
    fetchDomainStability,
    fetchSignals,
    fetchGraph,
    fetchReport,
    fetchDisinfoSignals,
    fetchTopNews,
    fetchNewsList,
    type StabilityScore,
    type Signal,
    type Report,
    type DisinfoSignal,
    type NewsArticle,
} from "@/lib/api"

const DOMAIN = "economics"
const FRONTEND_DOMAIN = "economy"
const CORE_POLL_MS = 30_000
const REPORT_POLL_MS = 5 * 60_000
const DISINFO_POLL_MS = 60_000
const NEWS_POLL_MS = 60_000

export default function EconomyPage() {
    const [viewMode, setViewMode] = useState<"timeline" | "diff">("timeline")
    const [disinfoEnabled, setDisinfoEnabled] = useState(false)
    const [scenarioOpen, setScenarioOpen] = useState(false)
    const [scenarioPrompt, setScenarioPrompt] = useState("")

    const [stability, setStability] = useState<StabilityScore | null>(null)
    const [topSignals, setTopSignals] = useState<Signal[]>([])
    const [economicIndicators, setEconomicIndicators] = useState<Array<{ id: string | number; name: string; degree: number }>>([])
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
                const [stab, sigs, graphData] = await Promise.allSettled([
                    fetchDomainStability(DOMAIN),
                    fetchSignals({ domain: DOMAIN, limit: 8 }),
                    fetchGraph({ entity_type: "Economic_Indicator", limit: 40, min_connections: 1, date_range: "90d" }),
                ])
                if (cancelled) return
                if (stab.status === "fulfilled") setStability(stab.value)
                if (sigs.status === "fulfilled") setTopSignals(sigs.value.signals)
                if (graphData.status === "fulfilled") {
                    const indicators = graphData.value.nodes
                        .filter((n) => (n.props.type ?? "") === "Economic_Indicator")
                        .slice(0, 10)
                        .map((n) => ({
                            id: n.id,
                            name: n.props.name || n.props.title || "Unknown",
                            degree: n.degree || 0,
                        }))
                    setEconomicIndicators(indicators)
                }
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

                const recentAlias = await fetchTopNews(5, 24, FRONTEND_DOMAIN)
                if (recentAlias.length > 0) {
                    if (!cancelled) {
                        setTopNews(recentAlias.slice(0, 5))
                        setNewsWindowLabel("last 24h (economy)")
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

                const weeklyAlias = await fetchTopNews(5, 168, FRONTEND_DOMAIN)
                if (weeklyAlias.length > 0) {
                    if (!cancelled) {
                        setTopNews(weeklyAlias.slice(0, 5))
                        setNewsWindowLabel("last 7 days (economy)")
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

                const latestAlias = await fetchNewsList({ domain: FRONTEND_DOMAIN, per_page: 5, page: 1 })
                if (!cancelled) {
                    const aliasArticles = (latestAlias.articles ?? []).slice(0, 5)
                    if (aliasArticles.length > 0) {
                        setTopNews(aliasArticles)
                        setNewsWindowLabel("latest available (economy)")
                        return
                    }
                }

                const genericRecent = await fetchTopNews(5, 24)
                if (genericRecent.length > 0) {
                    if (!cancelled) {
                        setTopNews(genericRecent.slice(0, 5))
                        setNewsWindowLabel("global latest (last 24h)")
                    }
                    return
                }

                const genericWeekly = await fetchTopNews(5, 168)
                if (genericWeekly.length > 0) {
                    if (!cancelled) {
                        setTopNews(genericWeekly.slice(0, 5))
                        setNewsWindowLabel("global latest (last 7 days)")
                    }
                    return
                }

                const genericList = await fetchNewsList({ per_page: 5, page: 1 })
                if (!cancelled) {
                    setTopNews((genericList.articles ?? []).slice(0, 5))
                    setNewsWindowLabel("global latest available")
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

    const fallbackActors = report?.key_actors?.slice(0, 6) ?? []

    const fragilityRows = stability ? [
        {
            label: "Volume Volatility",
            value: Math.round((stability.components.volume_factor ?? 0) * 100),
            colorClass: (stability.components.volume_factor ?? 0) > 0.7 ? "bg-red-500" : (stability.components.volume_factor ?? 0) > 0.4 ? "bg-orange-500" : "bg-emerald-500",
            textClass: (stability.components.volume_factor ?? 0) > 0.7 ? "text-red-400" : (stability.components.volume_factor ?? 0) > 0.4 ? "text-orange-400" : "text-emerald-400",
        },
        {
            label: "Importance-Weighted Risk",
            value: Math.round((stability.components.importance_factor ?? 0) * 100),
            colorClass: (stability.components.importance_factor ?? 0) > 0.7 ? "bg-red-500" : (stability.components.importance_factor ?? 0) > 0.4 ? "bg-amber-500" : "bg-emerald-500",
            textClass: (stability.components.importance_factor ?? 0) > 0.7 ? "text-red-400" : (stability.components.importance_factor ?? 0) > 0.4 ? "text-amber-400" : "text-emerald-400",
        },
        {
            label: "Data Freshness (staleness penalty)",
            value: Math.round((stability.staleness_penalty ?? 0) * 200),
            colorClass: (stability.staleness_penalty ?? 0) > 0.3 ? "bg-red-500" : (stability.staleness_penalty ?? 0) > 0.1 ? "bg-amber-500" : "bg-emerald-500",
            textClass: (stability.staleness_penalty ?? 0) > 0.3 ? "text-red-400" : (stability.staleness_penalty ?? 0) > 0.1 ? "text-amber-400" : "text-emerald-400",
        },
    ] : []

    return (
        <div className="flex flex-col gap-6 p-6 animate-in fade-in duration-500">
            <DomainStabilityHeader domain={FRONTEND_DOMAIN} />

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
                            <CardTitle className="text-sm text-orange-400 flex items-center gap-2">
                                <Activity className="h-4 w-4" /> Economic Fragility Indicators
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingCore ? (
                                <div className="flex items-center gap-2 py-6">
                                    <Loader2 className="h-4 w-4 animate-spin text-sky-400 motion-reduce:animate-none" />
                                    <span className="text-xs text-muted-foreground">Loading indicators...</span>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {fragilityRows.map(row => (
                                        <div key={row.label}>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-white/80">{row.label}</span>
                                                <span className={`${row.textClass} font-bold`}>{row.value}/100</span>
                                            </div>
                                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                <div className={`h-full ${row.colorClass} transition-all`} style={{ width: `${row.value}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                    {stability && (
                                        <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-muted-foreground border-t border-white/5 pt-3">
                                            <div>Recent articles: <span className="text-white font-mono">{stability.components.recent_article_count}</span></div>
                                            <div>Weekly articles: <span className="text-white font-mono">{stability.components.weekly_article_count}</span></div>
                                            <div>Avg importance: <span className="text-white font-mono">{stability.components.avg_importance_score}</span></div>
                                            <div>Data age: <span className="text-white font-mono">{stability.data_age_hours}h</span></div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-black/40 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-sm text-sky-400 flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" /> Live Economic Signals
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingCore ? (
                                <div className="flex items-center gap-2 py-4">
                                    <Loader2 className="h-4 w-4 animate-spin text-sky-400 motion-reduce:animate-none" />
                                </div>
                            ) : topSignals.length === 0 && economicIndicators.length > 0 ? (
                                <div className="space-y-3">
                                    <p className="text-xs text-muted-foreground">
                                        No economic spikes right now. Showing Economic Indicator entities from the live graph.
                                    </p>
                                    <div className="space-y-2">
                                        {economicIndicators.map((entity) => (
                                            <div key={entity.id} className="flex items-center justify-between p-3 rounded bg-white/5 border border-white/10">
                                                <span className="text-sm font-medium text-white truncate">{entity.name}</span>
                                                <span className="text-xs font-bold text-orange-300 shrink-0 ml-4">{entity.degree} links</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : topSignals.length === 0 && fallbackActors.length > 0 ? (
                                <div className="space-y-3">
                                    <p className="text-xs text-muted-foreground">
                                        No active spikes right now. Showing key actors from the latest economic report.
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
                            ) : topSignals.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic py-4 text-center">No active economic signals detected.</p>
                            ) : (
                                <div className="space-y-2">
                                    {topSignals.map(sig => (
                                        <div key={sig.id} className="flex items-center justify-between p-3 rounded bg-white/5">
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-sm font-medium text-white truncate">{sig.entity_name ?? sig.cluster_label ?? "Signal"}</span>
                                                <span className="text-[10px] text-muted-foreground">{sig.type.replace(/_/g, " ")} · {sig.severity}</span>
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
                            <CardTitle className="text-sm text-emerald-400 flex items-center gap-2">
                                <Newspaper className="h-4 w-4" /> Recent Economic News
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingNews ? (
                                <div className="flex items-center gap-2 py-6">
                                    <Loader2 className="h-4 w-4 animate-spin text-sky-400 motion-reduce:animate-none" />
                                    <span className="text-xs text-muted-foreground">Loading news...</span>
                                </div>
                            ) : topNews.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic py-4 text-center">No recent economic news articles found.</p>
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-[10px] text-muted-foreground mb-1">Showing {newsWindowLabel}</p>
                                    {topNews.map(article => (
                                        <a
                                            key={article.id}
                                            href={`/news/${article.id}`}
                                            className="block p-3 rounded bg-white/5 border border-white/10 hover:border-emerald-500/30 hover:bg-white/8 transition-colors"
                                        >
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <h4 className="text-sm font-medium text-white line-clamp-2">{article.title}</h4>
                                                <span className="text-xs font-bold text-emerald-400 shrink-0">
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
                                        {disinfoSignals.slice(0, 5).map(sig => (
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
                    <PredictionOverlay domain={FRONTEND_DOMAIN} />

                    {report && (
                        <Card className="bg-black/40 border-white/10">
                            <CardHeader>
                                <CardTitle className="text-sm text-blue-400 flex items-center gap-2">
                                    <LineChart className="h-4 w-4" /> Latest Economic Brief
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
                            domain="Economy"
                            prompt="Model cascading impacts of a 15% overnight drop in global equity indices."
                            onClick={openScenario}
                        />
                        <ScenarioButton
                            domain="Economy"
                            prompt="Simulate supply chain reallocation if new multipolar tariffs are enacted."
                            onClick={openScenario}
                        />
                    </div>
                </div>
            </div>

            <ScenarioModal isOpen={scenarioOpen} onClose={() => setScenarioOpen(false)} initialScenario={scenarioPrompt} domainFilter={DOMAIN} />
        </div>
    )
}
