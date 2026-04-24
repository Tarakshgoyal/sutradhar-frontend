import { useState, useEffect } from "react"
import { DomainStabilityHeader } from "@/components/domains/shared/DomainStabilityHeader"
import { TemporalViewToggle } from "@/components/domains/shared/TemporalViewToggle"
import { PredictionOverlay } from "@/components/domains/shared/PredictionOverlay"
import { DisinformationLayerToggle } from "@/components/domains/shared/DisinformationLayerToggle"
import { ScenarioButton } from "@/components/domains/shared/ScenarioButton"
import { DomainAlertsPanel } from "@/components/domains/shared/DomainAlertsPanel"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldAlert, Crosshair, TrendingUp, Loader2, Globe, Users, Newspaper, AlertCircle } from "lucide-react"
import { ScenarioModal } from "@/components/dashboard/ScenarioModal"
import { 
    fetchSignals, 
    fetchReport, 
    fetchDisinfoSignals, 
    fetchTopNews,
    fetchNewsList,
    type Signal, 
    type Report,
    type DisinfoSignal,
    type NewsArticle,
    type IndiaImpactDetails,
} from "@/lib/api"

const DOMAIN = "geopolitics"
const SIGNALS_POLL_MS = 30_000
const REPORT_POLL_MS = 5 * 60_000
const DISINFO_POLL_MS = 60_000
const NEWS_POLL_MS = 60_000

function getDisplayText(value: unknown): string {
    if (typeof value === "string") return value
    if (typeof value === "number" || typeof value === "boolean") return String(value)
    if (Array.isArray(value)) {
        const parts = value.map(getDisplayText).filter(Boolean)
        return parts.join(" ")
    }
    if (!value || typeof value !== "object") return ""

    const record = value as Record<string, unknown>
    const risk = getDisplayText(record.risk)
    const summary = getDisplayText(record.summary)
    const implications = getDisplayText(record.implications)
    const strategicAssessment = getDisplayText(record.strategic_assessment)

    if (strategicAssessment) return strategicAssessment
    if (summary && implications && summary !== implications) return `${summary} ${implications}`
    if (summary) return summary
    if (implications) return implications
    if (risk) return risk

    return ""
}

export default function GeopoliticsPage() {
    const [viewMode, setViewMode] = useState<"timeline" | "diff">("timeline")
    const [disinfoEnabled, setDisinfoEnabled] = useState(false)
    const [scenarioOpen, setScenarioOpen] = useState(false)
    const [scenarioPrompt, setScenarioPrompt] = useState("")

    // Entity spike signals for Country Instability Ranking
    const [entitySignals, setEntitySignals] = useState<Signal[]>([])
    const [loadingSignals, setLoadingSignals] = useState(true)

    // Domain report data
    const [report, setReport] = useState<Report | null>(null)
    const [loadingReport, setLoadingReport] = useState(true)

    // Disinformation signals
    const [disinfoSignals, setDisinfoSignals] = useState<DisinfoSignal[]>([])
    const [loadingDisinfo, setLoadingDisinfo] = useState(true)

    // Top news articles
    const [topNews, setTopNews] = useState<NewsArticle[]>([])
    const [loadingNews, setLoadingNews] = useState(true)
    const [newsWindowLabel, setNewsWindowLabel] = useState("last 24h")

    // Fetch entity signals
    useEffect(() => {
        let cancelled = false
        const load = async () => {
            try {
                const d = await fetchSignals({ domain: DOMAIN, signal_type: "entity_spike", limit: 10 })
                if (!cancelled) setEntitySignals(d.signals)
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

    // Fetch domain report
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

    // Fetch disinformation signals
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

    // Fetch top news for this domain
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

                const weekly = await fetchTopNews(5, 168, DOMAIN)
                if (weekly.length > 0) {
                    if (!cancelled) {
                        setTopNews(weekly.slice(0, 5))
                        setNewsWindowLabel("last 7 days")
                    }
                    return
                }

                const latest = await fetchNewsList({ domain: DOMAIN, per_page: 5, page: 1 })
                if (!cancelled) {
                    setTopNews((latest.articles ?? []).slice(0, 5))
                    setNewsWindowLabel("latest available")
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
    const indiaImpact =
        report?.india_impact && typeof report.india_impact === "object"
            ? (report.india_impact as IndiaImpactDetails)
            : null
    const strategicAssessmentText = getDisplayText(indiaImpact?.strategic_assessment)
    const fallbackActors = report?.key_actors?.slice(0, 8) ?? []
    const fallbackEntityNames = Array.from(
        new Set((report?.key_developments ?? []).flatMap((d) => d.entities ?? []))
    ).slice(0, 10)

    return (
        <div className="flex flex-col gap-6 p-6 animate-in fade-in duration-500">
            <DomainStabilityHeader domain={DOMAIN} />

            <div className="flex flex-wrap items-center justify-between gap-4">
                <TemporalViewToggle view={viewMode} onChange={setViewMode} />
                <div className="w-72">
                    <DisinformationLayerToggle 
                        enabled={disinfoEnabled} 
                        onToggle={setDisinfoEnabled} 
                        count={disinfoSignals.length} 
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Entity Instability Ranking from live signals */}
                    <Card className="bg-black/40 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-sm text-orange-400 flex items-center gap-2">
                                <Crosshair className="h-4 w-4" /> Entity Instability Signals
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingSignals ? (
                                <div className="flex items-center gap-2 py-6">
                                    <Loader2 className="h-4 w-4 animate-spin text-sky-400 motion-reduce:animate-none" />
                                    <span className="text-xs text-muted-foreground">Loading signals…</span>
                                </div>
                            ) : entitySignals.length === 0 && (fallbackActors.length > 0 || fallbackEntityNames.length > 0) ? (
                                <div className="space-y-3">
                                    <p className="text-xs text-muted-foreground">
                                        No active entity spikes right now. Showing entities from the latest domain report.
                                    </p>
                                    {fallbackActors.length > 0 && (
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
                                    )}
                                    {fallbackActors.length === 0 && fallbackEntityNames.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {fallbackEntityNames.map((entity) => (
                                                <span key={entity} className="text-[11px] bg-white/5 border border-white/10 text-white/80 px-2 py-1 rounded-full">
                                                    {entity}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : entitySignals.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic py-4 text-center">No entity spikes detected in this domain.</p>
                            ) : (
                                <div className="space-y-2">
                                    {entitySignals.slice(0, 8).map(sig => (
                                        <div key={sig.id} className="flex items-center justify-between p-3 rounded bg-white/5 hover:bg-white/8 transition-colors cursor-pointer">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-white">{sig.entity_name ?? sig.cluster_label ?? "Unknown"}</span>
                                                {sig.entity_type && <span className="text-[10px] text-muted-foreground capitalize">{sig.entity_type}</span>}
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-xs text-muted-foreground">
                                                    {sig.current_count} mentions · {sig.baseline_count.toFixed(1)} baseline
                                                </span>
                                                <span className={`text-sm font-bold tabular-nums flex items-center gap-1 ${
                                                    sig.severity === "high" ? "text-red-400" : "text-orange-400"
                                                }`}>
                                                    <TrendingUp className="h-3 w-3" />
                                                    {sig.spike_ratio.toFixed(1)}×
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Conflict Escalation Risk derived from signals */}
                    <Card className="bg-black/40 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-sm text-red-400 flex items-center gap-2">
                                <ShieldAlert className="h-4 w-4" /> Conflict Escalation Risk
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {[
                                    {
                                        label: "Global Flashpoints (high-severity signals)",
                                        value: Math.min((entitySignals.filter(s => s.severity === "high").length / Math.max(entitySignals.length, 1)) * 100, 100),
                                        colorClass: "bg-red-500",
                                        textClass: "text-red-400",
                                        tag: entitySignals.filter(s => s.severity === "high").length > 5 ? "CRITICAL" : entitySignals.filter(s => s.severity === "high").length > 2 ? "ELEVATED" : "MODERATE",
                                    },
                                    {
                                        label: "Signal Activity (spike intensity)",
                                        value: Math.min(entitySignals.reduce((a, s) => a + s.spike_ratio, 0) / Math.max(entitySignals.length, 1) * 10, 100),
                                        colorClass: "bg-orange-500",
                                        textClass: "text-orange-400",
                                        tag: entitySignals.length > 0 ? "ACTIVE" : "QUIET",
                                    },
                                ].map(row => (
                                    <div key={row.label}>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-white/80">{row.label}</span>
                                            <span className={`${row.textClass} font-bold`}>{row.tag}</span>
                                        </div>
                                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                            <div className={`h-full ${row.colorClass} transition-all`} style={{ width: `${row.value}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Key Developments from Report */}
                    {report?.key_developments && report.key_developments.length > 0 && (
                        <Card className="bg-black/40 border-white/10">
                            <CardHeader>
                                <CardTitle className="text-sm text-sky-400 flex items-center gap-2">
                                    <Globe className="h-4 w-4" /> Key Developments
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loadingReport ? (
                                    <div className="flex items-center gap-2 py-6">
                                        <Loader2 className="h-4 w-4 animate-spin text-sky-400 motion-reduce:animate-none" />
                                        <span className="text-xs text-muted-foreground">Loading report…</span>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {report.key_developments.slice(0, 5).map((dev, i) => (
                                            <div key={i} className="p-3 rounded bg-white/5 border border-white/10 hover:border-sky-500/30 transition-colors">
                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                    <h4 className="text-sm font-medium text-white">{dev.title}</h4>
                                                    {dev.date && (
                                                        <span className="text-[10px] text-muted-foreground shrink-0">
                                                            {new Date(dev.date).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-white/70 leading-relaxed mb-2">{dev.details}</p>
                                                {dev.entities && dev.entities.length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {dev.entities.slice(0, 5).map((entity, j) => (
                                                            <span key={j} className="text-[10px] bg-sky-500/10 border border-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full">
                                                                {entity}
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

                    {/* Key Actors from Report */}
                    {report?.key_actors && report.key_actors.length > 0 && (
                        <Card className="bg-black/40 border-white/10">
                            <CardHeader>
                                <CardTitle className="text-sm text-purple-400 flex items-center gap-2">
                                    <Users className="h-4 w-4" /> Key Actors
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {report.key_actors.slice(0, 8).map((actor, i) => (
                                        <div key={i} className="p-3 rounded bg-white/5 border border-white/10 hover:border-purple-500/30 transition-colors">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <span className="text-sm font-medium text-white">{actor.name}</span>
                                                <span className="text-[10px] text-muted-foreground uppercase shrink-0">{actor.type}</span>
                                            </div>
                                            <p className="text-xs text-white/60 leading-relaxed">{actor.role}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Top News Articles */}
                    <Card className="bg-black/40 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-sm text-emerald-400 flex items-center gap-2">
                                <Newspaper className="h-4 w-4" /> Recent News
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingNews ? (
                                <div className="flex items-center gap-2 py-6">
                                    <Loader2 className="h-4 w-4 animate-spin text-sky-400 motion-reduce:animate-none" />
                                    <span className="text-xs text-muted-foreground">Loading news…</span>
                                </div>
                            ) : topNews.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic py-4 text-center">No recent news articles found.</p>
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

                    {/* Disinformation Signals (when enabled) */}
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
                                        <span className="text-xs text-muted-foreground">Loading disinformation signals…</span>
                                    </div>
                                ) : disinfoSignals.length === 0 ? (
                                    <p className="text-sm text-muted-foreground italic py-4 text-center">No disinformation signals detected.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {disinfoSignals.slice(0, 5).map(sig => (
                                            <div key={sig.id} className="p-3 rounded bg-red-500/10 border border-red-500/20">
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <span className="text-sm font-medium text-red-200">{sig.signal_type.replace(/_/g, ' ').toUpperCase()}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                                            sig.severity === "high" ? "bg-red-500/20 text-red-300" :
                                                            sig.severity === "medium" ? "bg-orange-500/20 text-orange-300" :
                                                            "bg-yellow-500/20 text-yellow-300"
                                                        }`}>
                                                            {sig.severity}
                                                        </span>
                                                        <span className="text-[10px] text-red-300 font-mono">
                                                            {(sig.confidence * 100).toFixed(0)}%
                                                        </span>
                                                    </div>
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

                    {/* India Impact Assessment */}
                    {indiaImpact && (
                        <Card className="bg-black/40 border-white/10">
                            <CardHeader>
                                <CardTitle className="text-sm text-orange-400 flex items-center gap-2">
                                    <Globe className="h-4 w-4" /> India Impact Assessment
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {strategicAssessmentText && (
                                        <div>
                                            <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Strategic Assessment</h4>
                                            <p className="text-xs text-white/80 leading-relaxed">{strategicAssessmentText}</p>
                                        </div>
                                    )}
                                    {!strategicAssessmentText && (
                                        <div>
                                            <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Strategic Assessment</h4>
                                            <p className="text-xs text-muted-foreground italic">No strategic assessment generated yet.</p>
                                        </div>
                                    )}
                                    {indiaImpact.national_advantages && indiaImpact.national_advantages.map(getDisplayText).filter(Boolean).length > 0 && (
                                        <div>
                                            <h4 className="text-[10px] uppercase tracking-widest text-emerald-400 mb-1">Advantages</h4>
                                            <ul className="space-y-1">
                                                {indiaImpact.national_advantages.map(getDisplayText).filter(Boolean).slice(0, 3).map((adv, i) => (
                                                    <li key={i} className="text-xs text-emerald-200/70 flex items-start gap-2">
                                                        <span className="text-emerald-500 mt-0.5 shrink-0">•</span>
                                                        <span>{adv}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {indiaImpact.risks && indiaImpact.risks.map(getDisplayText).filter(Boolean).length > 0 && (
                                        <div>
                                            <h4 className="text-[10px] uppercase tracking-widest text-red-400 mb-1">Risks</h4>
                                            <ul className="space-y-1">
                                                {indiaImpact.risks.map(getDisplayText).filter(Boolean).slice(0, 3).map((riskText, i) => {
                                                    return (
                                                        <li key={i} className="text-xs text-red-200/70 flex items-start gap-2">
                                                            <span className="text-red-500 mt-0.5 shrink-0">•</span>
                                                            <span>{riskText}</span>
                                                        </li>
                                                    )
                                                })}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    {/* Fallback for string india_impact (legacy format) */}
                    {report?.india_impact && typeof report.india_impact === 'string' && (
                        <Card className="bg-black/40 border-white/10">
                            <CardHeader>
                                <CardTitle className="text-sm text-orange-400 flex items-center gap-2">
                                    <Globe className="h-4 w-4" /> India Impact
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-white/80 leading-relaxed">{report.india_impact}</p>
                            </CardContent>
                        </Card>
                    )}

                    <div className="space-y-3">
                        <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Simulate Scenarios</h3>
                        <ScenarioButton
                            domain="Geopolitics"
                            prompt="Simulate impact of a blockade in the Strait of Malacca on Indo-Pacific supply chains."
                            onClick={openScenario}
                        />
                        <ScenarioButton
                            domain="Geopolitics"
                            prompt="Evaluate coalition realignment if formal defense treaty is dissolved."
                            onClick={openScenario}
                        />
                        <ScenarioButton
                            domain="Geopolitics"
                            prompt="Analyze cascading effects of a major cyberattack on critical infrastructure."
                            onClick={openScenario}
                        />
                    </div>
                </div>
            </div>

            <ScenarioModal isOpen={scenarioOpen} onClose={() => setScenarioOpen(false)} initialScenario={scenarioPrompt} domainFilter={DOMAIN} />
        </div>
    )
}
