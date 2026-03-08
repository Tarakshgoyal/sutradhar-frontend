import { useCallback, useEffect, useRef, useState } from "react"
import { ResponsiveGridLayout, useContainerWidth } from "react-grid-layout"
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    fetchReportDomains,
    fetchReport,
    fetchNewsList,
    fetchTrendingTopics,
    fetchNewsDomains,
    fetchSignals,
    type DomainInfo,
    type Report,
    type NewsArticle,
    type TrendingTopic,
    type NewsDomain,
    type Signal,
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
    Newspaper,
    Hash,
    Search,
    ChevronLeft,
    ChevronRight,
    Star,
    Bell,
    GripVertical,
    ThermometerSun,
} from "lucide-react"

import { WeatherTab } from "@/components/graph/WeatherTab"
import type { Layouts } from "react-grid-layout"

const LAYOUT_STORAGE_KEY = "dashboard-card-layouts"

function getStoredLayouts(): Layouts | null {
    try {
        const raw = localStorage.getItem(LAYOUT_STORAGE_KEY)
        return raw ? JSON.parse(raw) : null
    } catch { return null }
}

const defaultLayouts: Layouts = {
    lg: [
        { i: "weather", x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 1 },
        { i: "news", x: 3, y: 0, w: 3, h: 2, minW: 3, minH: 1 },
        { i: "signals", x: 6, y: 0, w: 3, h: 1, minW: 2, minH: 1 },
        { i: "topics", x: 6, y: 1, w: 3, h: 1, minW: 2, minH: 1 },
        { i: "reports", x: 9, y: 0, w: 3, h: 2, minW: 3, minH: 1 },
    ],
    md: [
        { i: "weather", x: 0, y: 0, w: 5, h: 2, minW: 3, minH: 1 },
        { i: "news", x: 5, y: 0, w: 5, h: 2, minW: 3, minH: 1 },
        { i: "signals", x: 0, y: 2, w: 5, h: 1, minW: 2, minH: 1 },
        { i: "topics", x: 5, y: 2, w: 5, h: 1, minW: 2, minH: 1 },
        { i: "reports", x: 0, y: 3, w: 10, h: 2, minW: 3, minH: 1 },
    ],
    sm: [
        { i: "weather", x: 0, y: 0, w: 6, h: 1, minW: 3, minH: 1 },
        { i: "news", x: 0, y: 1, w: 6, h: 1, minW: 3, minH: 1 },
        { i: "signals", x: 0, y: 2, w: 6, h: 1, minW: 2, minH: 1 },
        { i: "topics", x: 0, y: 3, w: 6, h: 1, minW: 2, minH: 1 },
        { i: "reports", x: 0, y: 4, w: 6, h: 1, minW: 3, minH: 1 },
    ],
}

type Tab = "weather" | "news" | "topics" | "signals" | "reports"

const DOMAIN_COLORS: Record<string, string> = {
    geopolitics: "text-red-400 bg-red-950/30 border-red-500/20",
    politics: "text-orange-400 bg-orange-950/30 border-orange-500/20",
    economics: "text-green-400 bg-green-950/30 border-green-500/20",
    defense: "text-blue-400 bg-blue-950/30 border-blue-500/20",
    technology: "text-cyan-400 bg-cyan-950/30 border-cyan-500/20",
    environment: "text-emerald-400 bg-emerald-950/30 border-emerald-500/20",
    health: "text-pink-400 bg-pink-950/30 border-pink-500/20",
    crime: "text-rose-400 bg-rose-950/30 border-rose-500/20",
    education: "text-violet-400 bg-violet-950/30 border-violet-500/20",
    infrastructure: "text-sky-400 bg-sky-950/30 border-sky-500/20",
    energy: "text-yellow-400 bg-yellow-950/30 border-yellow-500/20",
    sports: "text-lime-400 bg-lime-950/30 border-lime-500/20",
    science: "text-indigo-400 bg-indigo-950/30 border-indigo-500/20",
}

function domainClass(domain: string) {
    return DOMAIN_COLORS[domain] ?? "text-gray-400 bg-gray-950/30 border-gray-500/20"
}

function scoreColor(score: number) {
    if (score >= 9) return "text-red-400"
    if (score >= 7) return "text-orange-400"
    if (score >= 5) return "text-yellow-400"
    return "text-gray-400"
}

function relativeTime(dateStr: string) {
    try {
        const d = new Date(dateStr)
        const diff = Date.now() - d.getTime()
        const mins = Math.floor(diff / 60000)
        if (mins < 60) return `${mins}m ago`
        const hrs = Math.floor(mins / 60)
        if (hrs < 24) return `${hrs}h ago`
        return `${Math.floor(hrs / 24)}d ago`
    } catch {
        return ""
    }
}

function DashboardCard({
    title,
    icon: Icon,
    accentColor,
    badge,
    badgeColor,
    liveIndicator,
    children,
}: {
    title: string
    icon: React.ElementType
    accentColor: string
    badge?: string
    badgeColor?: string
    liveIndicator?: boolean
    children: React.ReactNode
}) {
    return (
        <div className="flex flex-col h-full rounded-lg border border-white/[0.08] bg-[#111111]/95 backdrop-blur-sm overflow-hidden shadow-lg shadow-black/20">
            {/* Card Header — drag handle */}
            <div className="card-drag-handle flex items-center gap-2 px-3 py-2 border-b border-white/[0.06] bg-white/[0.02] cursor-grab active:cursor-grabbing shrink-0 select-none">
                <Icon className={`h-3.5 w-3.5 ${accentColor}`} />
                <span className={`text-[11px] font-bold uppercase tracking-wider ${accentColor}`}>
                    {title}
                </span>
                {liveIndicator && (
                    <span className="flex items-center gap-1 ml-1">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-red-400">Live</span>
                    </span>
                )}
                {badge && (
                    <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white tabular-nums ${badgeColor || "bg-white/10"}`}>
                        {badge}
                    </span>
                )}
                <GripVertical className="ml-auto h-3.5 w-3.5 text-white/20" />
            </div>
            {/* Card Content */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
                {children}
            </div>
        </div>
    )
}

export function ReportsPanel() {
    const [expanded, setExpanded] = useState(true)
    const [layouts, setLayouts] = useState<Layouts>(() => getStoredLayouts() ?? defaultLayouts)
    const { containerRef, width, mounted } = useContainerWidth()
    const [rowHeight, setRowHeight] = useState(200)
    const [panelHeight, setPanelHeight] = useState(() => {
        try { const v = localStorage.getItem("dashboard-panel-height"); return v ? Number(v) : Math.round(window.innerHeight * 0.55) } catch { return Math.round(window.innerHeight * 0.55) }
    })
    const isDragging = useRef(false)

    const onResizeStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        isDragging.current = true
        const startY = e.clientY
        const startH = panelHeight
        let latestH = startH
        const onMove = (ev: MouseEvent) => {
            if (!isDragging.current) return
            const delta = startY - ev.clientY
            latestH = Math.max(120, Math.min(window.innerHeight - 80, startH + delta))
            setPanelHeight(latestH)
        }
        const onUp = () => {
            isDragging.current = false
            document.removeEventListener("mousemove", onMove)
            document.removeEventListener("mouseup", onUp)
            document.body.style.cursor = ""
            document.body.style.userSelect = ""
            try { localStorage.setItem("dashboard-panel-height", String(latestH)) } catch { /* ignore */ }
        }
        document.body.style.cursor = "row-resize"
        document.body.style.userSelect = "none"
        document.addEventListener("mousemove", onMove)
        document.addEventListener("mouseup", onUp)
    }, [panelHeight])

    // — reports state —
    const [domains, setDomains] = useState<DomainInfo[]>([])
    const [activeDomain, setActiveDomain] = useState<string | null>(null)
    const [report, setReport] = useState<Report | null>(null)
    const [reportLoading, setReportLoading] = useState(false)
    const [domainsLoading, setDomainsLoading] = useState(true)
    const [activeSection, setActiveSection] = useState<string>("summary")

    // — news feed state —
    const [newsDomains, setNewsDomains] = useState<NewsDomain[]>([])
    const [newsFilter, setNewsFilter] = useState({ domain: "", q: "", min_score: "" })
    const [newsPage, setNewsPage] = useState(1)
    const [newsData, setNewsData] = useState<{ articles: NewsArticle[]; total: number } | null>(null)
    const [newsLoading, setNewsLoading] = useState(false)
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

    // — trending topics state —
    const [topics, setTopics] = useState<TrendingTopic[]>([])
    const [topicsLoading, setTopicsLoading] = useState(false)
    const [topicsHours, setTopicsHours] = useState(24)

    // — signals state —
    const [signals, setSignals] = useState<Signal[]>([])
    const [signalsLoading, setSignalsLoading] = useState(false)
    const [signalSeverity, setSignalSeverity] = useState<string>("")

    // Calculate rowHeight from container
    useEffect(() => {
        if (!expanded || !containerRef.current) return
        const calcHeight = () => {
            if (!containerRef.current) return
            const h = containerRef.current.clientHeight
            setRowHeight(Math.max(120, Math.floor((h - 32) / 2)))
        }
        calcHeight()
        const ro = new ResizeObserver(calcHeight)
        ro.observe(containerRef.current)
        return () => ro.disconnect()
    }, [expanded])

    // fetch report domains once
    useEffect(() => {
        fetchReportDomains()
            .then((d) => { setDomains(d.domains); setDomainsLoading(false) })
            .catch(() => setDomainsLoading(false))
    }, [])

    // fetch news domains once
    useEffect(() => {
        fetchNewsDomains().then(setNewsDomains).catch(() => { })
    }, [])

    const loadReport = useCallback(async (domain: string) => {
        setActiveDomain(domain)
        setReportLoading(true)
        setActiveSection("summary")
        try {
            const data = await fetchReport(domain)
            setReport(data.report)
        } catch {
            setReport(null)
        } finally {
            setReportLoading(false)
        }
    }, [])

    useEffect(() => {
        if (domains.length > 0 && !activeDomain) {
            loadReport(domains[0].domain)
        }
    }, [domains, activeDomain, loadReport])

    const loadNews = useCallback(async (page: number, filters: typeof newsFilter) => {
        setNewsLoading(true)
        try {
            const data = await fetchNewsList({
                page,
                per_page: 20,
                domain: filters.domain || undefined,
                q: filters.q || undefined,
                min_score: filters.min_score ? Number(filters.min_score) : undefined,
            })
            setNewsData({ articles: data.articles, total: data.total })
        } catch {
            setNewsData(null)
        } finally {
            setNewsLoading(false)
        }
    }, [])

    // Load news eagerly
    useEffect(() => {
        loadNews(newsPage, newsFilter)
    }, [newsPage]) // eslint-disable-line react-hooks/exhaustive-deps

    const loadTopics = useCallback(async (hours: number) => {
        setTopicsLoading(true)
        try {
            const data = await fetchTrendingTopics(hours, 50)
            setTopics(data)
        } catch {
            setTopics([])
        } finally {
            setTopicsLoading(false)
        }
    }, [])

    // Load topics eagerly
    useEffect(() => {
        loadTopics(topicsHours)
    }, [topicsHours, loadTopics])

    const loadSignals = useCallback(async (severity: string) => {
        setSignalsLoading(true)
        try {
            const data = await fetchSignals({ severity: severity || undefined, limit: 100 })
            setSignals(data.signals)
        } catch {
            setSignals([])
        } finally {
            setSignalsLoading(false)
        }
    }, [])

    // Load signals eagerly
    useEffect(() => {
        loadSignals(signalSeverity)
    }, [signalSeverity, loadSignals])

    function handleSearchChange(q: string) {
        const next = { ...newsFilter, q }
        setNewsFilter(next)
        if (searchTimeout.current) clearTimeout(searchTimeout.current)
        searchTimeout.current = setTimeout(() => {
            setNewsPage(1)
            loadNews(1, next)
        }, 400)
    }

    function handleDomainFilterChange(domain: string) {
        const next = { ...newsFilter, domain }
        setNewsFilter(next)
        setNewsPage(1)
        loadNews(1, next)
    }

    function handleScoreFilterChange(min_score: string) {
        const next = { ...newsFilter, min_score }
        setNewsFilter(next)
        setNewsPage(1)
        loadNews(1, next)
    }

    const totalPages = newsData ? Math.ceil(newsData.total / 20) : 1
    const highSignalCount = signals.filter((s) => s.severity === "high").length

    const handleLayoutChange = (_: unknown, allLayouts: Layouts) => {
        setLayouts(allLayouts)
        try { localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(allLayouts)) } catch { /* ignore */ }
    }

    return (
        <div
            className={`fixed right-0 bottom-0 left-0 z-[15] ${expanded ? "" : "h-9"}`}
            style={expanded ? { height: panelHeight } : undefined}
        >
            {/* Resize handle */}
            {expanded && (
                <div
                    onMouseDown={onResizeStart}
                    className="absolute inset-x-0 -top-1 h-2 cursor-row-resize z-10 group"
                >
                    <div className="mx-auto mt-0.5 h-0.5 w-12 rounded-full bg-white/10 group-hover:bg-white/30 transition-colors" />
                </div>
            )}
            {/* Toggle bar */}
            <div className="flex h-9 items-center gap-3 border-t border-white/10 bg-[#0a0a0a] px-4">
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
                    Dashboard
                </span>
                {!expanded && newsData?.articles[0] && (
                    <div className="ml-2 flex items-center gap-2 min-w-0 flex-1">
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                        </span>
                        <span className={`text-[10px] font-semibold ${scoreColor(newsData.articles[0].importance_score)}`}>
                            {newsData.articles[0].importance_score.toFixed(1)}
                        </span>
                        <span className="text-[11px] text-muted-foreground truncate">
                            {newsData.articles[0].title}
                        </span>
                    </div>
                )}
                {!expanded && highSignalCount > 0 && (
                    <span className="flex items-center gap-1">
                        <Bell className="h-3 w-3 text-red-400" />
                        <span className="rounded-full bg-red-500/80 px-1.5 text-[9px] font-bold text-white tabular-nums">
                            {highSignalCount}
                        </span>
                    </span>
                )}
                <button
                    onClick={() => setExpanded((v) => !v)}
                    className="ml-auto p-1 text-muted-foreground hover:text-white transition-colors"
                >
                    {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </button>
            </div>

            {/* Card grid dashboard */}
            {expanded && (
                <div
                    ref={containerRef}
                    className="h-[calc(100%-36px)] overflow-y-auto bg-[#0a0a0a]/98"
                >
                    {mounted && <ResponsiveGridLayout
                        width={width || 1200}
                        layouts={layouts}
                        onLayoutChange={handleLayoutChange}
                        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
                        cols={{ lg: 12, md: 10, sm: 6 }}
                        rowHeight={rowHeight}
                        draggableHandle=".card-drag-handle"
                        margin={[8, 8]}
                        containerPadding={[8, 4]}
                        isResizable={true}
                    >
                        <div key="weather">
                            <DashboardCard
                                title="Live Weather"
                                icon={ThermometerSun}
                                accentColor="text-yellow-400"
                            >
                                <WeatherTab />
                            </DashboardCard>
                        </div>
                        <div key="news">
                            <DashboardCard
                                title="News Feed"
                                icon={Newspaper}
                                accentColor="text-sky-400"
                                liveIndicator
                                badge={newsData ? String(newsData.total) : undefined}
                                badgeColor="bg-sky-500/20"
                            >
                                <NewsFeedTab
                                    articles={newsData?.articles ?? []}
                                    total={newsData?.total ?? 0}
                                    loading={newsLoading}
                                    page={newsPage}
                                    totalPages={totalPages}
                                    onPageChange={(p) => setNewsPage(p)}
                                    domains={newsDomains}
                                    filter={newsFilter}
                                    onDomainChange={handleDomainFilterChange}
                                    onSearchChange={handleSearchChange}
                                    onScoreChange={handleScoreFilterChange}
                                />
                            </DashboardCard>
                        </div>
                        <div key="signals">
                            <DashboardCard
                                title="Signals"
                                icon={Bell}
                                accentColor="text-red-400"
                                liveIndicator
                                badge={highSignalCount > 0 ? String(highSignalCount) : undefined}
                                badgeColor="bg-red-500/80"
                            >
                                <SignalsTab
                                    signals={signals}
                                    loading={signalsLoading}
                                    severity={signalSeverity}
                                    onSeverityChange={setSignalSeverity}
                                />
                            </DashboardCard>
                        </div>
                        <div key="topics">
                            <DashboardCard
                                title="Trending Topics"
                                icon={Hash}
                                accentColor="text-green-400"
                                badge={topics.length > 0 ? String(topics.length) : undefined}
                                badgeColor="bg-green-500/20"
                            >
                                <TrendingTopicsTab
                                    topics={topics}
                                    loading={topicsLoading}
                                    hours={topicsHours}
                                    onHoursChange={setTopicsHours}
                                />
                            </DashboardCard>
                        </div>
                        <div key="reports">
                            <DashboardCard
                                title="Intelligence"
                                icon={FileText}
                                accentColor="text-sky-400"
                            >
                                <ReportsTab
                                    domains={domains}
                                    domainsLoading={domainsLoading}
                                    activeDomain={activeDomain}
                                    report={report}
                                    loading={reportLoading}
                                    activeSection={activeSection}
                                    onSelectDomain={loadReport}
                                    onSectionChange={setActiveSection}
                                />
                            </DashboardCard>
                        </div>
                    </ResponsiveGridLayout>}
                </div>
            )}
        </div>
    )
}

// ─── News Feed Tab ──────────────────────────────────────────────────────────

function NewsFeedTab({
    articles,
    total,
    loading,
    page,
    totalPages,
    onPageChange,
    domains,
    filter,
    onDomainChange,
    onSearchChange,
    onScoreChange,
}: {
    articles: NewsArticle[]
    total: number
    loading: boolean
    page: number
    totalPages: number
    onPageChange: (p: number) => void
    domains: NewsDomain[]
    filter: { domain: string; q: string; min_score: string }
    onDomainChange: (d: string) => void
    onSearchChange: (q: string) => void
    onScoreChange: (s: string) => void
}) {
    return (
        <div className="flex flex-1 flex-col min-w-0">
            {/* Filter bar */}
            <div className="flex shrink-0 items-center gap-2 border-b border-white/5 px-3 py-1.5">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                        value={filter.q}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Search articles…"
                        className="h-7 pl-7 text-xs bg-white/5 border-white/10 focus-visible:ring-sky-400/30"
                    />
                </div>

                {/* Domain filter */}
                <div className="flex items-center gap-1 overflow-x-auto shrink-0">
                    <button
                        onClick={() => onDomainChange("")}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors whitespace-nowrap ${!filter.domain ? "bg-sky-500/20 text-sky-400" : "text-muted-foreground hover:text-white hover:bg-white/5"
                            }`}
                    >
                        All
                    </button>
                    {domains.slice(0, 8).map((d) => (
                        <button
                            key={d.domain}
                            onClick={() => onDomainChange(filter.domain === d.domain ? "" : d.domain)}
                            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors whitespace-nowrap capitalize ${filter.domain === d.domain
                                    ? "bg-sky-500/20 text-sky-400"
                                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                                }`}
                        >
                            {d.domain}
                            <span className="ml-0.5 text-[9px] opacity-60">{d.article_count}</span>
                        </button>
                    ))}
                </div>

                {/* Score filter */}
                <div className="flex items-center gap-1 shrink-0 ml-auto">
                    <Star className="h-3 w-3 text-muted-foreground" />
                    {["", "5", "7", "9"].map((s) => (
                        <button
                            key={s}
                            onClick={() => onScoreChange(s)}
                            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${filter.min_score === s
                                    ? "bg-amber-500/20 text-amber-400"
                                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                                }`}
                        >
                            {s === "" ? "Any" : `${s}+`}
                        </button>
                    ))}
                    <span className="text-[10px] text-muted-foreground ml-2">{total} articles</span>
                </div>
            </div>

            {/* Article list */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-4 w-4 animate-spin text-sky-400" />
                        <span className="ml-2 text-xs text-muted-foreground">Loading…</span>
                    </div>
                ) : articles.length === 0 ? (
                    <p className="py-8 text-center text-xs text-muted-foreground">No articles found</p>
                ) : (
                    <div className="divide-y divide-white/[0.04]">
                        {articles.map((a) => (
                            <ArticleRow key={a.id} article={a} />
                        ))}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex shrink-0 items-center justify-between border-t border-white/5 px-3 py-1.5">
                    <Button
                        variant="ghost"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => onPageChange(page - 1)}
                        className="h-6 gap-1 text-[11px]"
                    >
                        <ChevronLeft className="h-3 w-3" /> Prev
                    </Button>
                    <span className="text-[10px] text-muted-foreground">
                        Page {page} / {totalPages}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => onPageChange(page + 1)}
                        className="h-6 gap-1 text-[11px]"
                    >
                        Next <ChevronRight className="h-3 w-3" />
                    </Button>
                </div>
            )}
        </div>
    )
}

function ArticleRow({ article }: { article: NewsArticle }) {
    return (
        <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 px-3 py-2.5 hover:bg-white/[0.03] transition-colors group"
        >
            {/* Score bar */}
            <div className="flex shrink-0 flex-col items-center gap-0.5 pt-0.5">
                <span className={`text-[11px] font-bold tabular-nums ${scoreColor(article.importance_score)}`}>
                    {article.importance_score.toFixed(1)}
                </span>
                <div className="h-12 w-0.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className={`w-full rounded-full ${article.importance_score >= 9
                                ? "bg-red-500"
                                : article.importance_score >= 7
                                    ? "bg-orange-500"
                                    : article.importance_score >= 5
                                        ? "bg-yellow-500"
                                        : "bg-gray-600"
                            }`}
                        style={{ height: `${(article.importance_score / 10) * 100}%` }}
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 mb-0.5">
                    <h4 className="flex-1 text-xs font-medium text-white/90 group-hover:text-white leading-snug line-clamp-2">
                        {article.title}
                    </h4>
                    <ExternalLink className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {article.description && (
                    <p className="text-[11px] text-gray-500 leading-snug line-clamp-1 mb-1">
                        {article.description}
                    </p>
                )}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-sky-400/80">{article.source}</span>
                    <Badge
                        variant="outline"
                        className={`border text-[9px] px-1 py-0 h-4 capitalize ${domainClass(article.domain)}`}
                    >
                        {article.domain}
                    </Badge>
                    {article.cluster_label && (
                        <span className="text-[10px] text-muted-foreground truncate max-w-[160px]">
                            {article.cluster_label}
                        </span>
                    )}
                    <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                        {relativeTime(article.pub_date || article.scraped_at)}
                    </span>
                </div>
            </div>
        </a>
    )
}

// ─── Trending Topics Tab ────────────────────────────────────────────────────

function TrendingTopicsTab({
    topics,
    loading,
    hours,
    onHoursChange,
}: {
    topics: TrendingTopic[]
    loading: boolean
    hours: number
    onHoursChange: (h: number) => void
}) {
    return (
        <div className="flex flex-1 flex-col min-w-0">
            {/* Filter bar */}
            <div className="flex shrink-0 items-center gap-2 border-b border-white/5 px-3 py-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-green-400" />
                <span className="text-xs text-muted-foreground">Time window:</span>
                {([6, 24, 48, 168] as const).map((h) => (
                    <button
                        key={h}
                        onClick={() => onHoursChange(h)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${hours === h ? "bg-green-500/20 text-green-400" : "text-muted-foreground hover:text-white hover:bg-white/5"
                            }`}
                    >
                        {h < 24 ? `${h}h` : `${h / 24}d`}
                    </button>
                ))}
                <span className="ml-auto text-[10px] text-muted-foreground">{topics.length} topics</span>
            </div>

            {/* Topics grid */}
            <div className="flex-1 overflow-y-auto p-3">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-4 w-4 animate-spin text-green-400" />
                        <span className="ml-2 text-xs text-muted-foreground">Loading…</span>
                    </div>
                ) : topics.length === 0 ? (
                    <p className="py-8 text-center text-xs text-muted-foreground">No trending topics found</p>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {topics.map((t) => (
                            <TopicCard key={t.cluster_id} topic={t} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

function TopicCard({ topic }: { topic: TrendingTopic }) {
    return (
        <a
            href={topic.top_article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col gap-1.5 rounded-lg border border-white/5 bg-white/[0.02] p-2.5 hover:bg-white/[0.05] hover:border-white/10 transition-all group"
        >
            <div className="flex items-start justify-between gap-1">
                <h4 className="text-[11px] font-semibold text-white leading-snug line-clamp-2 flex-1">
                    {topic.cluster_label}
                </h4>
                <span className={`text-[11px] font-bold tabular-nums shrink-0 ${scoreColor(topic.importance_score)}`}>
                    {topic.importance_score.toFixed(1)}
                </span>
            </div>

            <p className="text-[10px] text-gray-500 leading-snug line-clamp-2">
                {topic.top_article.title}
            </p>

            <div className="flex items-center gap-1.5 mt-auto">
                <Badge
                    variant="outline"
                    className={`border text-[9px] px-1 py-0 h-4 capitalize ${domainClass(topic.domain)}`}
                >
                    {topic.domain}
                </Badge>
                <span className="text-[10px] text-muted-foreground">{topic.article_count} articles</span>
                <ExternalLink className="h-2.5 w-2.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
        </a>
    )
}

// ─── Signals Tab ────────────────────────────────────────────────────────────

const SIGNAL_TYPE_LABEL: Record<string, string> = {
    entity_spike: "Entity Spike",
    topic_spike: "Topic Spike",
    new_entity: "New Entity",
}

function SignalsTab({
    signals,
    loading,
    severity,
    onSeverityChange,
}: {
    signals: Signal[]
    loading: boolean
    severity: string
    onSeverityChange: (s: string) => void
}) {
    return (
        <div className="flex flex-1 flex-col min-w-0">
            {/* Filter bar */}
            <div className="flex shrink-0 items-center gap-2 border-b border-white/5 px-3 py-1.5">
                <Bell className="h-3.5 w-3.5 text-red-400" />
                <span className="text-xs text-muted-foreground">Severity:</span>
                {(["", "high", "medium"] as const).map((s) => (
                    <button
                        key={s}
                        onClick={() => onSeverityChange(s)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${severity === s
                                ? s === "high" ? "bg-red-500/20 text-red-400"
                                    : s === "medium" ? "bg-orange-500/20 text-orange-400"
                                        : "bg-white/10 text-white"
                                : "text-muted-foreground hover:text-white hover:bg-white/5"
                            }`}
                    >
                        {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                ))}
                <span className="ml-auto text-[10px] text-muted-foreground">{signals.length} active signals</span>
            </div>

            {/* Signals list */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-4 w-4 animate-spin text-red-400" />
                        <span className="ml-2 text-xs text-muted-foreground">Loading…</span>
                    </div>
                ) : signals.length === 0 ? (
                    <p className="py-8 text-center text-xs text-muted-foreground">No active signals</p>
                ) : (
                    <div className="divide-y divide-white/[0.04]">
                        {signals.map((s) => (
                            <SignalRow key={s.id} signal={s} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

function SignalRow({ signal }: { signal: Signal }) {
    const isHigh = signal.severity === "high"
    return (
        <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.03] transition-colors">
            {/* Spike ratio */}
            <div className={`shrink-0 text-center w-12`}>
                <div className={`text-sm font-bold tabular-nums ${isHigh ? "text-red-400" : "text-orange-400"}`}>
                    {signal.spike_ratio.toFixed(1)}x
                </div>
                <div className="text-[9px] text-muted-foreground">spike</div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-white">
                        {signal.entity_name ?? signal.cluster_label ?? "Unknown"}
                    </span>
                    <Badge
                        variant="outline"
                        className={`border text-[9px] px-1 py-0 h-4 ${isHigh ? "border-red-500/30 text-red-400" : "border-orange-500/30 text-orange-400"}`}
                    >
                        {signal.severity}
                    </Badge>
                    <Badge variant="secondary" className="bg-white/5 text-[9px] px-1 py-0 h-4 text-muted-foreground">
                        {SIGNAL_TYPE_LABEL[signal.type] ?? signal.type}
                    </Badge>
                    {signal.entity_type && (
                        <Badge variant="secondary" className="bg-sky-950/30 text-[9px] px-1 py-0 h-4 text-sky-400">
                            {signal.entity_type}
                        </Badge>
                    )}
                </div>
                <div className="text-[10px] text-muted-foreground">
                    {signal.current_count} mentions now vs {signal.baseline_count.toFixed(1)} baseline
                    <span className="mx-1.5 opacity-40">·</span>
                    expires {relativeTime(signal.expires_at)}
                </div>
            </div>

            {/* Detected time */}
            <div className="shrink-0 text-[10px] text-muted-foreground">
                {relativeTime(signal.detected_at)}
            </div>
        </div>
    )
}

// ─── Intelligence Reports Tab ───────────────────────────────────────────────

const reportSections = [
    { id: "summary", label: "Summary", icon: FileText },
    { id: "developments", label: "Key Developments", icon: Zap },
    { id: "actors", label: "Key Actors", icon: Users },
    { id: "relationships", label: "Relationships", icon: Link2 },
    { id: "trends", label: "Trends", icon: TrendingUp },
    { id: "inference", label: "Intelligence", icon: Shield },
    { id: "sources", label: "Sources", icon: ExternalLink },
]

function ReportsTab({
    domains,
    domainsLoading,
    activeDomain,
    report,
    loading,
    activeSection,
    onSelectDomain,
    onSectionChange,
}: {
    domains: DomainInfo[]
    domainsLoading: boolean
    activeDomain: string | null
    report: Report | null
    loading: boolean
    activeSection: string
    onSelectDomain: (d: string) => void
    onSectionChange: (s: string) => void
}) {
    return (
        <div className="flex flex-col flex-1 min-w-0 min-h-0">
            {/* Domain pills row */}
            <div className="flex shrink-0 items-center gap-1.5 border-b border-white/[0.06] px-2 py-1 overflow-x-auto">
                {domainsLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                ) : (
                    domains.map((d) => (
                        <button
                            key={d.domain}
                            onClick={() => onSelectDomain(d.domain)}
                            className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium capitalize transition-colors ${activeDomain === d.domain
                                    ? "bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/30"
                                    : "text-muted-foreground hover:bg-white/5 hover:text-white"
                                }`}
                        >
                            {d.domain}
                        </button>
                    ))
                )}
            </div>

            {/* Section tabs row */}
            {report && !loading && (
                <div className="flex shrink-0 items-center gap-1 border-b border-white/[0.06] px-2 py-1 overflow-x-auto">
                    {reportSections.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => onSectionChange(s.id)}
                            className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${activeSection === s.id
                                    ? "bg-white/10 text-white"
                                    : "text-muted-foreground hover:bg-white/5 hover:text-white/70"
                                }`}
                        >
                            <s.icon className="h-2.5 w-2.5" />
                            {s.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-2.5">
                {loading ? (
                    <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-4 w-4 animate-spin text-sky-400" />
                        <span className="ml-2 text-xs text-muted-foreground">Loading report…</span>
                    </div>
                ) : !report ? (
                    <p className="py-6 text-center text-[11px] text-muted-foreground">
                        Select a domain above
                    </p>
                ) : (
                    <ReportContent report={report} section={activeSection} />
                )}
            </div>
        </div>
    )
}

function ReportContent({ report, section }: { report: Report; section: string }) {
    const sectionHeader = (icon: React.ElementType, label: string, count?: number) => {
        const I = icon
        return (
            <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-sky-400 mb-2">
                <I className="h-3 w-3" /> {label}{count != null ? ` (${count})` : ""}
            </h3>
        )
    }

    switch (section) {
        case "summary":
            return (
                <div className="space-y-2.5">
                    <div>
                        {sectionHeader(FileText, "Executive Summary")}
                        <p className="text-[11px] leading-relaxed text-gray-300">{report.executive_summary}</p>
                    </div>
                    {report.inference?.executive_summary && (
                        <div className="rounded border border-sky-500/15 bg-sky-950/10 p-2">
                            <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-sky-300 flex items-center gap-1">
                                <Shield className="h-2.5 w-2.5" /> Intelligence Assessment
                            </h4>
                            <p className="text-[11px] leading-relaxed text-gray-300">{report.inference.executive_summary}</p>
                        </div>
                    )}
                    <div className="flex gap-3 text-[9px] text-muted-foreground pt-1">
                        <span>Domain: <span className="capitalize text-sky-400">{report.domain}</span></span>
                        <span>Range: {report.date_range}</span>
                        <span>Generated: {new Date(report.generated_at).toLocaleString()}</span>
                    </div>
                </div>
            )

        case "developments": {
            const developments = report.key_developments ?? []
            return (
                <div className="space-y-1.5">
                    {sectionHeader(Zap, "Key Developments", developments.length)}
                    {developments.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground">No key developments available.</p>
                    ) : developments.map((d, i) => (
                        <div key={i} className="rounded border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5">
                            <div className="flex items-start justify-between gap-2 mb-0.5">
                                <span className="text-[11px] font-medium text-white leading-tight">{d.title}</span>
                                <span className="shrink-0 text-[9px] text-muted-foreground">{d.date}</span>
                            </div>
                            <p className="text-[10px] leading-snug text-gray-400 mb-1">{d.details}</p>
                            <div className="flex flex-wrap gap-1">
                                {d.entities.map((e) => (
                                    <span key={e} className="rounded bg-sky-950/40 px-1.5 py-px text-[9px] text-sky-400">{e}</span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )
        }

        case "actors": {
            const actors = report.key_actors ?? []
            return (
                <div className="space-y-1.5">
                    {sectionHeader(Users, "Key Actors", actors.length)}
                    {actors.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground">No key actors available.</p>
                    ) : (
                        <div className="grid grid-cols-2 gap-1.5">
                            {actors.map((a, i) => (
                                <div key={i} className="rounded border border-white/[0.06] bg-white/[0.02] px-2 py-1.5">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <span className="text-[11px] font-medium text-white">{a.name}</span>
                                        <span className="rounded bg-white/5 px-1 py-px text-[9px] text-muted-foreground">{a.type}</span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 leading-snug">{a.role}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )
        }

        case "relationships": {
            const relationships = report.critical_relationships ?? []
            return (
                <div className="space-y-1.5">
                    {sectionHeader(Link2, "Critical Relationships", relationships.length)}
                    {relationships.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground">No critical relationships available.</p>
                    ) : relationships.map((r, i) => (
                        <div key={i} className="rounded border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5">
                            <div className="flex items-center gap-1.5 mb-0.5 text-[11px]">
                                <span className="font-medium text-sky-400">{r.source}</span>
                                <span className="rounded bg-white/5 px-1 py-px text-[9px] text-muted-foreground">{r.relation_type}</span>
                                <span className="font-medium text-sky-400">{r.target}</span>
                            </div>
                            <p className="text-[10px] text-gray-400 leading-snug">{r.analysis}</p>
                        </div>
                    ))}
                </div>
            )
        }

        case "trends":
            return (
                <div className="space-y-2">
                    {sectionHeader(TrendingUp, "Trends Analysis")}
                    {report.trends ? (
                        <p className="text-[11px] leading-relaxed text-gray-300">{report.trends}</p>
                    ) : (
                        <p className="text-[11px] text-muted-foreground">No trends analysis available.</p>
                    )}
                </div>
            )

        case "inference":
            return (
                <div className="space-y-3">
                    {report.inference?.causal_chains?.length > 0 && (
                        <div>
                            <h4 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-sky-300 mb-1.5">
                                <Zap className="h-2.5 w-2.5" /> Causal Chains
                            </h4>
                            <div className="space-y-1.5">
                                {report.inference.causal_chains.map((c, i) => (
                                    <div key={i} className="rounded border border-sky-500/10 bg-sky-950/5 px-2 py-1.5">
                                        <div className="flex flex-wrap items-center gap-1 mb-1">
                                            {c.chain.map((step, j) => (
                                                <span key={j} className="flex items-center gap-0.5">
                                                    <span className="rounded bg-sky-950/40 px-1 py-px text-[9px] text-sky-300">{step.entity}</span>
                                                    {step.relation && j < c.chain.length - 1 && (
                                                        <span className="text-[9px] text-sky-600">\u2192 {step.relation} \u2192</span>
                                                    )}
                                                </span>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-gray-400 leading-snug mb-1">{c.narrative}</p>
                                        <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                                            <span className="text-sky-400">Score: {(c.score * 100).toFixed(0)}%</span>
                                            <span>{c.source_articles.length} sources</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {report.inference?.impact_propagations?.length > 0 && (
                        <div>
                            <h4 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-red-400 mb-1.5">
                                <AlertTriangle className="h-2.5 w-2.5" /> Impact Propagations
                            </h4>
                            <div className="space-y-1.5">
                                {report.inference.impact_propagations.map((ip, i) => (
                                    <div key={i} className="rounded border border-red-500/10 bg-red-950/5 px-2 py-1.5">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <span className="text-[11px] font-medium text-white">{ip.trigger_event}</span>
                                            <span className="rounded bg-red-950/30 px-1 py-px text-[9px] text-red-400">{ip.event_status}</span>
                                            <span className="text-[9px] text-muted-foreground">{ip.event_date}</span>
                                        </div>
                                        <p className="text-[10px] text-gray-400 leading-snug mb-1">{ip.narrative}</p>
                                        <div className="flex flex-wrap gap-1">
                                            {ip.affected.map((a, j) => (
                                                <span key={j} className="rounded bg-red-950/20 px-1 py-px text-[9px] text-red-300">
                                                    {a.name} ({a.via_relation})
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {report.inference?.weak_links?.length > 0 && (
                        <div>
                            <h4 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-orange-400 mb-1.5">
                                <AlertTriangle className="h-2.5 w-2.5" /> Weak Links & Risk Nodes
                            </h4>
                            <div className="grid grid-cols-2 gap-1.5">
                                {report.inference.weak_links.map((w, i) => (
                                    <div key={i} className="rounded border border-white/[0.06] bg-white/[0.02] px-2 py-1.5">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className="text-[11px] font-medium text-white">{w.entity}</span>
                                            <span className="rounded bg-white/5 px-1 py-px text-[9px] text-muted-foreground">{w.type}</span>
                                            <span className="text-[9px] text-orange-400">{w.connection_count} conn.</span>
                                        </div>
                                        <div className="flex flex-wrap gap-0.5 mb-0.5">
                                            {w.domains_bridged.map((d) => (
                                                <span key={d} className="rounded bg-white/5 px-1 py-px text-[8px] capitalize text-muted-foreground">{d}</span>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-gray-400 leading-snug">{w.risk_narrative}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )

        case "sources":
            return (
                <div className="space-y-1">
                    {sectionHeader(ExternalLink, "Sources", report.sources.length)}
                    {report.sources.map((s, i) => (
                        <div key={i} className="flex items-center gap-2 py-1 border-b border-white/[0.04] last:border-0">
                            <a
                                href={s.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 text-[11px] text-sky-300 hover:underline truncate"
                            >
                                {s.title}
                            </a>
                            <span className="shrink-0 text-[9px] text-muted-foreground">{s.source}</span>
                        </div>
                    ))}
                </div>
            )

        default:
            return null
    }
}
