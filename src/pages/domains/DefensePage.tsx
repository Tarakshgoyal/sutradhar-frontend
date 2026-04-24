import { useState, useEffect } from "react"
import { DomainStabilityHeader } from "@/components/domains/shared/DomainStabilityHeader"
import { TemporalViewToggle } from "@/components/domains/shared/TemporalViewToggle"
import { PredictionOverlay } from "@/components/domains/shared/PredictionOverlay"
import { DisinformationLayerToggle } from "@/components/domains/shared/DisinformationLayerToggle"
import { ScenarioButton } from "@/components/domains/shared/ScenarioButton"
import { DomainAlertsPanel } from "@/components/domains/shared/DomainAlertsPanel"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Crosshair, TrendingUp, Loader2, Newspaper, AlertCircle } from "lucide-react"
import { ScenarioModal } from "@/components/dashboard/ScenarioModal"
import {
    fetchSignals,
    fetchGraph,
    fetchTrendingTopics,
    fetchReport,
    fetchDisinfoSignals,
    fetchTopNews,
    fetchNewsList,
    type Signal,
    type Report,
    type DisinfoSignal,
    type NewsArticle,
} from "@/lib/api"

const DOMAIN = "defense"
const DOMAIN_ALIAS = "defence"
const SIGNALS_POLL_MS = 30_000
const REPORT_POLL_MS = 5 * 60_000
const DISINFO_POLL_MS = 60_000
const NEWS_POLL_MS = 60_000

function isUuidLike(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim())
}

export default function DefensePage() {
    const [viewMode, setViewMode] = useState<"timeline" | "diff">("timeline")
    const [disinfoEnabled, setDisinfoEnabled] = useState(false)
    const [scenarioOpen, setScenarioOpen] = useState(false)
    const [scenarioPrompt, setScenarioPrompt] = useState("")

    const [signals, setSignals] = useState<Signal[]>([])
    const [globalSignals, setGlobalSignals] = useState<Signal[]>([])
    const [militaryAssetEntities, setMilitaryAssetEntities] = useState<Array<{ id: string | number; name: string; entityType: string; degree: number }>>([])
    const [defenseTopics, setDefenseTopics] = useState<Array<{ label: string; articleCount: number; score: number; domain: string }>>([])
    const [loadingSignals, setLoadingSignals] = useState(true)

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
                const [domainData, globalData, graphData, topicsData] = await Promise.allSettled([
                    fetchSignals({ domain: DOMAIN, limit: 10 }),
                    fetchSignals({ limit: 30 }),
                    fetchGraph({ entity_type: "Military_Asset", limit: 40, min_connections: 1, date_range: "90d" }),
                    fetchTrendingTopics(168, 100),
                ])
                if (cancelled) return
                if (domainData.status === "fulfilled") setSignals(domainData.value.signals)
                if (globalData.status === "fulfilled") setGlobalSignals(globalData.value.signals)
                if (graphData.status === "fulfilled") {
                    const assets = graphData.value.nodes
                        .filter((n) => (n.props.type ?? "") === "Military_Asset")
                        .slice(0, 10)
                        .map((n) => ({
                            id: n.id,
                            name: n.props.name || n.props.title || "Unknown",
                            entityType: n.props.type || "Military_Asset",
                            degree: n.degree || 0,
                    }))
                    setMilitaryAssetEntities(assets)
                }
                if (topicsData.status === "fulfilled") {
                    const mapTopic = (t: typeof topicsData.value[number]) => {
                        const rawLabel = (t.cluster_label || "").trim()
                        const clusterId = (t.cluster_id || "").trim()
                        const topTitle = (t.top_article?.title || "").trim()
                        const label =
                            rawLabel && !isUuidLike(rawLabel)
                                ? rawLabel
                                : topTitle
                                    ? topTitle
                                    : !isUuidLike(clusterId) && clusterId
                                        ? clusterId
                                        : "Emerging Cluster"
                        return {
                            label,
                            articleCount: t.article_count,
                            score: t.importance_score,
                            domain: t.domain,
                        }
                    }

                    const domainTopics = topicsData.value
                        .filter((t) => t.domain === DOMAIN || t.domain === DOMAIN_ALIAS)
                        .filter((t) => t.article_count > 1 || ((t.cluster_label || "").trim().length > 0))
                        .slice(0, 6)
                        .map(mapTopic)

                    if (domainTopics.length > 0) {
                        setDefenseTopics(domainTopics)
                    } else {
                        const fallbackTopics = topicsData.value
                            .filter((t) => t.article_count > 1 || ((t.cluster_label || "").trim().length > 0))
                            .slice(0, 6)
                            .map(mapTopic)
                        setDefenseTopics(fallbackTopics)
                    }
                }
            } catch {
                // keep prior values on transient API errors
            } finally {
                if (!cancelled) setLoadingSignals(false)
            }
        }
        void load()
        const timer = setInterval(() => { void load() }, SIGNALS_POLL_MS)
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
                        setNewsWindowLabel("last 24h (defence)")
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
                        setNewsWindowLabel("last 7 days (defence)")
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
                    const aliasArticles = (latestAlias.articles ?? []).slice(0, 5)
                    if (aliasArticles.length > 0) {
                        setTopNews(aliasArticles)
                        setNewsWindowLabel("latest available (defence)")
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

    const entitySignals = signals.filter((s) => s.type === "entity_spike")
    const topicSignals = signals.filter((s) => s.type === "topic_spike")
    const fallbackActors = report?.key_actors?.slice(0, 6) ?? []
    const fallbackGlobalEntitySignals = globalSignals
        .filter((s) => s.type === "entity_spike")
        .slice(0, 6)
    const fallbackGlobalTopicSignals = globalSignals
        .filter((s) => s.type === "topic_spike")
        .slice(0, 6)

    return (
        <div className="flex flex-col gap-6 p-6 animate-in fade-in duration-500">
            <DomainStabilityHeader domain={DOMAIN} />

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
                            <CardTitle className="text-sm text-red-500 flex items-center gap-2">
                                <Crosshair className="h-4 w-4" /> Active Defense Entity Signals
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingSignals ? (
                                <div className="flex items-center gap-2 py-6">
                                    <Loader2 className="h-4 w-4 animate-spin text-sky-400 motion-reduce:animate-none" />
                                    <span className="text-xs text-muted-foreground">Loading signals...</span>
                                </div>
                            ) : entitySignals.length === 0 && militaryAssetEntities.length > 0 ? (
                                <div className="space-y-3">
                                    <p className="text-xs text-muted-foreground">
                                        No defense spikes detected right now. Showing Military Asset entities from the live graph.
                                    </p>
                                    <div className="space-y-2">
                                        {militaryAssetEntities.map((asset) => (
                                            <div key={asset.id} className="flex items-center justify-between p-3 rounded bg-white/5">
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm font-medium text-white truncate">{asset.name}</span>
                                                    <span className="text-[10px] text-muted-foreground capitalize">{asset.entityType}</span>
                                                </div>
                                                <span className="text-xs font-bold text-red-300 shrink-0 ml-4">
                                                    {asset.degree} links
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : entitySignals.length === 0 && fallbackActors.length > 0 ? (
                                <div className="space-y-3">
                                    <p className="text-xs text-muted-foreground">
                                        No active spikes right now. Showing key actors from the latest defense report.
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
                            ) : entitySignals.length === 0 && fallbackGlobalEntitySignals.length > 0 ? (
                                <div className="space-y-3">
                                    <p className="text-xs text-muted-foreground">
                                        No defense-only entity spikes right now. Showing top live entity spikes across all domains.
                                    </p>
                                    <div className="space-y-2">
                                        {fallbackGlobalEntitySignals.map((sig) => (
                                            <div key={sig.id} className="flex items-center justify-between p-3 rounded bg-white/5">
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm font-medium text-white truncate">{sig.entity_name ?? "Unknown"}</span>
                                                    <span className="text-[10px] text-muted-foreground capitalize">{sig.entity_type ?? "entity"} · {sig.domain ?? "global"}</span>
                                                </div>
                                                <span className={`text-sm font-bold tabular-nums ${sig.severity === "high" ? "text-red-400" : "text-amber-400"}`}>
                                                    {sig.spike_ratio.toFixed(1)}x
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : entitySignals.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic py-4 text-center">No active defense entity signals detected.</p>
                            ) : (
                                <div className="space-y-2">
                                    {entitySignals.slice(0, 6).map((sig) => (
                                        <div key={sig.id} className="flex items-center justify-between p-3 rounded bg-white/5">
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-sm font-medium text-white truncate">{sig.entity_name ?? "Unknown"}</span>
                                                <span className="text-[10px] text-muted-foreground capitalize">{sig.entity_type ?? "entity"}</span>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0 ml-4">
                                                <div className="h-1.5 w-20 bg-white/10 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${sig.severity === "high" ? "bg-red-500" : "bg-amber-500"}`}
                                                        style={{ width: `${Math.min(sig.spike_ratio * 15, 100)}%` }}
                                                    />
                                                </div>
                                                <span className={`text-sm font-bold tabular-nums ${sig.severity === "high" ? "text-red-400" : "text-amber-400"}`}>
                                                    {sig.spike_ratio.toFixed(1)}x
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-black/40 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-sm text-sky-400 flex items-center gap-2">
                                <Shield className="h-4 w-4" /> Defense Intelligence Topics
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingSignals ? (
                                <div className="flex items-center gap-2 py-4">
                                    <Loader2 className="h-4 w-4 animate-spin text-sky-400 motion-reduce:animate-none" />
                                </div>
                            ) : topicSignals.length === 0 && defenseTopics.length > 0 ? (
                                <div className="space-y-3">
                                    <p className="text-xs text-muted-foreground">
                                        No defense topic spikes right now. Showing live trending topics from backend news clusters.
                                    </p>
                                    <div className="space-y-2">
                                        {defenseTopics.map((topic, i) => (
                                            <div key={`${topic.label}-${i}`} className="flex items-center justify-between p-3 rounded bg-white/5">
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm text-white truncate">{topic.label}</span>
                                                    <span className="text-[10px] text-muted-foreground">{topic.domain} · {topic.articleCount} articles</span>
                                                </div>
                                                <span className="text-sm font-bold tabular-nums shrink-0 ml-4 text-orange-400">
                                                    {topic.score.toFixed(1)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : topicSignals.length === 0 && fallbackGlobalTopicSignals.length > 0 ? (
                                <div className="space-y-3">
                                    <p className="text-xs text-muted-foreground">
                                        No defense-only topic spikes right now. Showing top live topic spikes across all domains.
                                    </p>
                                    <div className="space-y-2">
                                        {fallbackGlobalTopicSignals.map((sig) => (
                                            <div key={sig.id} className="flex items-center justify-between p-3 rounded bg-white/5">
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm text-white truncate">{sig.cluster_label ?? sig.cluster_id ?? "Cluster"}</span>
                                                    <span className="text-[10px] text-muted-foreground">{sig.domain ?? "global"} · {sig.current_count} articles</span>
                                                </div>
                                                <span className={`text-sm font-bold tabular-nums shrink-0 ml-4 ${sig.severity === "high" ? "text-red-400" : "text-orange-400"}`}>
                                                    {sig.spike_ratio.toFixed(1)}x
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : topicSignals.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic py-4 text-center">No trending defense topics detected.</p>
                            ) : (
                                <div className="space-y-2">
                                    {topicSignals.slice(0, 5).map((sig) => (
                                        <div key={sig.id} className="flex items-center justify-between p-3 rounded bg-white/5">
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-sm text-white truncate">{sig.cluster_label ?? sig.cluster_id ?? "Cluster"}</span>
                                                <span className="text-[10px] text-muted-foreground">{sig.current_count} articles · {sig.baseline_count.toFixed(1)} baseline</span>
                                            </div>
                                            <span className={`text-sm font-bold tabular-nums shrink-0 ml-4 flex items-center gap-1 ${sig.severity === "high" ? "text-red-400" : "text-orange-400"}`}>
                                                <TrendingUp className="h-3 w-3" />
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
                                <Newspaper className="h-4 w-4" /> Recent Defense News
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingNews ? (
                                <div className="flex items-center gap-2 py-6">
                                    <Loader2 className="h-4 w-4 animate-spin text-sky-400 motion-reduce:animate-none" />
                                    <span className="text-xs text-muted-foreground">Loading news...</span>
                                </div>
                            ) : topNews.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic py-4 text-center">No recent defense news articles found.</p>
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-[10px] text-muted-foreground mb-1">Showing {newsWindowLabel}</p>
                                    {topNews.map((article) => (
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
                                <CardTitle className="text-sm text-fuchsia-400 flex items-center gap-2">
                                    <Shield className="h-4 w-4" /> Latest Defense Brief
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
                            domain="Defense"
                            prompt="Model force projection capabilities given a concurrent cyber-denial of service attack on SATCOM."
                            onClick={openScenario}
                        />
                        <ScenarioButton
                            domain="Defense"
                            prompt="Evaluate supply line resilience during a sudden closure of the Strait of Hormuz."
                            onClick={openScenario}
                        />
                    </div>
                </div>
            </div>

            <ScenarioModal isOpen={scenarioOpen} onClose={() => setScenarioOpen(false)} initialScenario={scenarioPrompt} domainFilter={DOMAIN} />
        </div>
    )
}
