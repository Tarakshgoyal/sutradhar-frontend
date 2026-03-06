import { useCallback, useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    fetchReportDomains,
    fetchReport,
    type DomainInfo,
    type Report,
} from "@/lib/api"
import {
    ChevronUp,
    ChevronDown,
    Loader2,
    ExternalLink,
    AlertTriangle,
    TrendingUp,
    Users,
    Link2,
    Zap,
    Shield,
    FileText,
} from "lucide-react"


export function ReportsPanel() {
    const [expanded, setExpanded] = useState(false)
    const [domains, setDomains] = useState<DomainInfo[]>([])
    const [activeDomain, setActiveDomain] = useState<string | null>(null)
    const [report, setReport] = useState<Report | null>(null)
    const [loading, setLoading] = useState(false)
    const [domainsLoading, setDomainsLoading] = useState(true)
    const [activeSection, setActiveSection] = useState<string>("summary")

    // Fetch domains on mount
    useEffect(() => {
        fetchReportDomains()
            .then((data) => {
                setDomains(data.domains)
                setDomainsLoading(false)
            })
            .catch(() => setDomainsLoading(false))
    }, [])

    const loadReport = useCallback(async (domain: string) => {
        setActiveDomain(domain)
        setLoading(true)
        setActiveSection("summary")
        try {
            const data = await fetchReport(domain)
            setReport(data.report)
        } catch {
            setReport(null)
        } finally {
            setLoading(false)
        }
    }, [])

    // Auto-load first domain when expanded
    useEffect(() => {
        if (expanded && domains.length > 0 && !activeDomain) {
            loadReport(domains[0].domain)
        }
    }, [expanded, domains, activeDomain, loadReport])

    const sections = [
        { id: "summary", label: "Summary", icon: FileText },
        { id: "developments", label: "Key Developments", icon: Zap },
        { id: "actors", label: "Key Actors", icon: Users },
        { id: "relationships", label: "Relationships", icon: Link2 },
        { id: "trends", label: "Trends", icon: TrendingUp },
        { id: "inference", label: "Intelligence", icon: Shield },
        { id: "sources", label: "Sources", icon: ExternalLink },
    ]

    return (
        <div
            className={`fixed right-0 bottom-0 left-0 z-[15] border-t border-white/10 bg-[#0a0a0a]/98 transition-all duration-300 ${expanded ? "h-[55vh]" : "h-11"}`}
        >
            {/* Toggle bar */}
            <button
                onClick={() => setExpanded((v) => !v)}
                className="flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-white/5"
            >
                <FileText className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-xs font-semibold tracking-wide text-amber-400 uppercase">
                    Intelligence Reports
                </span>
                {!expanded && domains.length > 0 && (
                    <div className="flex gap-1.5 ml-2">
                        {domains.map((d) => (
                            <Badge
                                key={d.domain}
                                variant="secondary"
                                className="bg-white/5 text-[10px] text-muted-foreground"
                            >
                                {d.domain}
                            </Badge>
                        ))}
                    </div>
                )}
                <div className="ml-auto">
                    {expanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    )}
                </div>
            </button>

            {/* Expanded content */}
            {expanded && (
                <div className="flex h-[calc(100%-44px)]">
                    {/* Domain tabs (left sidebar) */}
                    <div className="flex w-40 shrink-0 flex-col gap-1 border-r border-white/10 p-2 overflow-y-auto">
                        {domainsLoading ? (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            domains.map((d) => (
                                <button
                                    key={d.domain}
                                    onClick={() => loadReport(d.domain)}
                                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-left text-xs transition-colors ${activeDomain === d.domain
                                            ? "bg-amber-500/10 text-amber-400"
                                            : "text-muted-foreground hover:bg-white/5 hover:text-white"
                                        }`}
                                >
                                    <div>
                                        <div className="font-medium capitalize">{d.domain}</div>
                                        <div className="text-[10px] text-muted-foreground">
                                            {new Date(d.generated_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    {/* Report content */}
                    <div className="flex flex-1 flex-col min-w-0">
                        {/* Section tabs */}
                        {report && !loading && (
                            <div className="flex shrink-0 gap-0.5 border-b border-white/10 px-3 py-1.5 overflow-x-auto">
                                {sections.map((s) => (
                                    <Button
                                        key={s.id}
                                        variant={activeSection === s.id ? "secondary" : "ghost"}
                                        size="sm"
                                        onClick={() => setActiveSection(s.id)}
                                        className="h-7 gap-1.5 text-[11px] shrink-0"
                                    >
                                        <s.icon className="h-3 w-3" />
                                        {s.label}
                                    </Button>
                                ))}
                            </div>
                        )}

                        {/* Content area */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
                                    <span className="ml-2 text-sm text-muted-foreground">
                                        Loading report…
                                    </span>
                                </div>
                            ) : !report ? (
                                <p className="py-8 text-center text-sm text-muted-foreground">
                                    Select a domain to view its intelligence report
                                </p>
                            ) : (
                                <ReportContent report={report} section={activeSection} />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function ReportContent({
    report,
    section,
}: {
    report: Report
    section: string
}) {
    switch (section) {
        case "summary":
            return (
                <div className="max-w-4xl space-y-4">
                    <div>
                        <h3 className="mb-2 text-sm font-semibold text-amber-400 flex items-center gap-2">
                            <FileText className="h-4 w-4" /> Executive Summary
                        </h3>
                        <p className="text-xs leading-relaxed text-gray-300">
                            {report.executive_summary}
                        </p>
                    </div>
                    {report.inference?.executive_summary && (
                        <div className="rounded-lg border border-purple-500/20 bg-purple-950/10 p-3">
                            <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                                <Shield className="h-3 w-3" /> Intelligence Assessment
                            </h4>
                            <p className="text-xs leading-relaxed text-gray-300">
                                {report.inference.executive_summary}
                            </p>
                        </div>
                    )}
                    <div className="flex gap-3 text-[10px] text-muted-foreground">
                        <span>Domain: <span className="capitalize text-amber-400">{report.domain}</span></span>
                        <span>Range: {report.date_range}</span>
                        <span>Generated: {new Date(report.generated_at).toLocaleString()}</span>
                    </div>
                </div>
            )

        case "developments":
            return (
                <div className="max-w-4xl space-y-3">
                    <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                        <Zap className="h-4 w-4" /> Key Developments ({report.key_developments.length})
                    </h3>
                    {report.key_developments.map((d, i) => (
                        <div
                            key={i}
                            className="rounded-lg border border-white/5 bg-white/[0.02] p-3"
                        >
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                                <h4 className="text-xs font-medium text-white">{d.title}</h4>
                                <Badge variant="outline" className="shrink-0 border-white/10 text-[10px] text-muted-foreground">
                                    {d.date}
                                </Badge>
                            </div>
                            <p className="text-[11px] leading-relaxed text-gray-400 mb-2">
                                {d.details}
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {d.entities.map((e) => (
                                    <Badge key={e} variant="secondary" className="bg-sky-950/30 text-[10px] text-sky-400">
                                        {e}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )

        case "actors":
            return (
                <div className="max-w-4xl space-y-3">
                    <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                        <Users className="h-4 w-4" /> Key Actors ({report.key_actors.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {report.key_actors.map((a, i) => (
                            <div
                                key={i}
                                className="rounded-lg border border-white/5 bg-white/[0.02] p-3"
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium text-white">{a.name}</span>
                                    <Badge variant="secondary" className="bg-white/5 text-[10px]">
                                        {a.type}
                                    </Badge>
                                </div>
                                <p className="text-[11px] text-gray-400 leading-relaxed">{a.role}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )

        case "relationships":
            return (
                <div className="max-w-4xl space-y-3">
                    <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                        <Link2 className="h-4 w-4" /> Critical Relationships ({report.critical_relationships.length})
                    </h3>
                    {report.critical_relationships.map((r, i) => (
                        <div
                            key={i}
                            className="rounded-lg border border-white/5 bg-white/[0.02] p-3"
                        >
                            <div className="flex items-center gap-2 mb-1.5 text-xs">
                                <span className="font-medium text-sky-400">{r.source}</span>
                                <Badge variant="outline" className="border-amber-500/30 text-[10px] text-amber-400">
                                    {r.relation_type}
                                </Badge>
                                <span className="font-medium text-sky-400">{r.target}</span>
                            </div>
                            <p className="text-[11px] text-gray-400 leading-relaxed">{r.analysis}</p>
                        </div>
                    ))}
                </div>
            )

        case "trends":
            return (
                <div className="max-w-4xl space-y-4">
                    <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" /> Trends Analysis
                    </h3>
                    <p className="text-xs leading-relaxed text-gray-300">{report.trends}</p>
                </div>
            )

        case "inference":
            return (
                <div className="max-w-4xl space-y-5">
                    {/* Causal Chains */}
                    {report.inference?.causal_chains?.length > 0 && (
                        <div>
                            <h3 className="mb-3 text-sm font-semibold text-purple-400 flex items-center gap-2">
                                <Zap className="h-4 w-4" /> Causal Chains
                            </h3>
                            <div className="space-y-3">
                                {report.inference.causal_chains.map((c, i) => (
                                    <div
                                        key={i}
                                        className="rounded-lg border border-purple-500/15 bg-purple-950/5 p-3"
                                    >
                                        <div className="flex flex-wrap items-center gap-1 mb-2">
                                            {c.chain.map((step, j) => (
                                                <span key={j} className="flex items-center gap-1">
                                                    <Badge variant="secondary" className="bg-purple-950/30 text-[10px] text-purple-300">
                                                        {step.entity}
                                                    </Badge>
                                                    {step.relation && j < c.chain.length - 1 && (
                                                        <span className="text-[10px] text-purple-500">→ {step.relation} →</span>
                                                    )}
                                                </span>
                                            ))}
                                        </div>
                                        <p className="text-[11px] text-gray-400 leading-relaxed mb-1.5">
                                            {c.narrative}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="border-amber-500/30 text-[10px] text-amber-400">
                                                Score: {(c.score * 100).toFixed(0)}%
                                            </Badge>
                                            <span className="text-[10px] text-muted-foreground">
                                                {c.source_articles.length} source articles
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Impact Propagations */}
                    {report.inference?.impact_propagations?.length > 0 && (
                        <div>
                            <h3 className="mb-3 text-sm font-semibold text-red-400 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" /> Impact Propagations
                            </h3>
                            <div className="space-y-3">
                                {report.inference.impact_propagations.map((ip, i) => (
                                    <div
                                        key={i}
                                        className="rounded-lg border border-red-500/15 bg-red-950/5 p-3"
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-medium text-white">{ip.trigger_event}</span>
                                            <Badge variant="outline" className="border-red-500/30 text-[10px] text-red-400">
                                                {ip.event_status}
                                            </Badge>
                                            <Badge variant="outline" className="border-white/10 text-[10px] text-muted-foreground">
                                                {ip.event_date}
                                            </Badge>
                                        </div>
                                        <p className="text-[11px] text-gray-400 leading-relaxed mb-2">
                                            {ip.narrative}
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                            {ip.affected.map((a, j) => (
                                                <Badge key={j} variant="secondary" className="bg-red-950/20 text-[10px] text-red-300">
                                                    {a.name} ({a.via_relation})
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Weak Links */}
                    {report.inference?.weak_links?.length > 0 && (
                        <div>
                            <h3 className="mb-3 text-sm font-semibold text-amber-400 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" /> Weak Links & Risk Nodes
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {report.inference.weak_links.map((w, i) => (
                                    <div
                                        key={i}
                                        className="rounded-lg border border-amber-500/15 bg-amber-950/5 p-3"
                                    >
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-xs font-medium text-white">{w.entity}</span>
                                            <Badge variant="secondary" className="bg-white/5 text-[10px]">
                                                {w.type}
                                            </Badge>
                                            <Badge variant="outline" className="border-amber-500/30 text-[10px] text-amber-400">
                                                {w.connection_count} connections
                                            </Badge>
                                        </div>
                                        <div className="flex flex-wrap gap-1 mb-1.5">
                                            {w.domains_bridged.map((d) => (
                                                <Badge key={d} variant="secondary" className="bg-white/5 text-[9px] capitalize">
                                                    {d}
                                                </Badge>
                                            ))}
                                        </div>
                                        <p className="text-[11px] text-gray-400 leading-relaxed">
                                            {w.risk_narrative}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )

        case "sources":
            return (
                <div className="max-w-4xl space-y-3">
                    <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" /> Sources ({report.sources.length})
                    </h3>
                    <div className="space-y-1.5">
                        {report.sources.map((s, i) => (
                            <div key={i} className="flex items-start gap-2 py-1.5 border-b border-white/5 last:border-0">
                                <a
                                    href={s.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 text-xs text-sky-300 hover:underline"
                                >
                                    {s.title}
                                </a>
                                <Badge variant="outline" className="shrink-0 border-white/10 text-[10px] text-muted-foreground">
                                    {s.source}
                                </Badge>
                            </div>
                        ))}
                    </div>
                </div>
            )

        default:
            return null
    }
}
