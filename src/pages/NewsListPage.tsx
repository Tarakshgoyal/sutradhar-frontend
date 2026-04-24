import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Search, Calendar, ExternalLink, ArrowLeft, ArrowRight, Filter, TrendingUp } from "lucide-react"
import { fetchNewsList, fetchNewsDomains, fetchNewsSources, fetchTrendingTopics, type NewsArticle, type TrendingTopic } from "@/lib/api"

const DOMAINS = [
    { value: "", label: "All Domains" },
    { value: "geopolitics", label: "Geopolitics" },
    { value: "economics", label: "Economics" },
    { value: "defense", label: "Defense" },
    { value: "technology", label: "Technology" },
    { value: "climate", label: "Climate" },
    { value: "society", label: "Society" },
]

const MIN_SCORES = [
    { value: "", label: "All Importance" },
    { value: "8", label: "Critical (8+)" },
    { value: "6", label: "High (6+)" },
    { value: "4", label: "Medium (4+)" },
    { value: "2", label: "Low (2+)" },
]

export default function NewsListPage() {
    const [searchParams, setSearchParams] = useSearchParams()
    const navigate = useNavigate()

    const [articles, setArticles] = useState<NewsArticle[]>([])
    const [topics, setTopics] = useState<TrendingTopic[]>([])
    const [sources, setSources] = useState<{ source: string; count: number }[]>([])
    const [loading, setLoading] = useState(true)
    const [total, setTotal] = useState(0)

    // Filters from URL params
    const page = parseInt(searchParams.get("page") || "1")
    const query = searchParams.get("q") || ""
    const domain = searchParams.get("domain") || ""
    const source = searchParams.get("source") || ""
    const minScore = searchParams.get("min_score") || ""

    const [searchInput, setSearchInput] = useState(query)
    const [showFilters, setShowFilters] = useState(false)

    const perPage = 20

    useEffect(() => {
        let isMounted = true

        const load = async () => {
            setLoading(true)
            try {
                // Fetch articles
                const params: any = {
                    page,
                    per_page: perPage,
                }
                if (query) params.q = query
                if (domain) params.domain = domain
                if (source) params.source = source
                if (minScore) params.min_score = parseFloat(minScore)

                const data = await fetchNewsList(params)

                if (isMounted) {
                    setArticles(data.articles)
                    setTotal(data.total)
                }
            } catch (error) {
                console.error("Failed to load news:", error)
            } finally {
                if (isMounted) setLoading(false)
            }
        }

        load()
        return () => { isMounted = false }
    }, [page, query, domain, source, minScore])

    // Load metadata (topics, sources) on mount
    useEffect(() => {
        let isMounted = true

        const loadMetadata = async () => {
            try {
                const [topicsData, sourcesData] = await Promise.all([
                    fetchTrendingTopics(24, 20),
                    fetchNewsSources(),
                ])

                if (isMounted) {
                    setTopics(topicsData)
                    setSources(sourcesData)
                }
            } catch (error) {
                console.error("Failed to load metadata:", error)
            }
        }

        loadMetadata()
        return () => { isMounted = false }
    }, [])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        const newParams = new URLSearchParams(searchParams)
        if (searchInput) {
            newParams.set("q", searchInput)
        } else {
            newParams.delete("q")
        }
        newParams.set("page", "1") // Reset to page 1 on new search
        setSearchParams(newParams)
    }

    const updateFilter = (key: string, value: string) => {
        const newParams = new URLSearchParams(searchParams)
        if (value) {
            newParams.set(key, value)
        } else {
            newParams.delete(key)
        }
        newParams.set("page", "1") // Reset to page 1 on filter change
        setSearchParams(newParams)
    }

    const goToPage = (newPage: number) => {
        const newParams = new URLSearchParams(searchParams)
        newParams.set("page", String(newPage))
        setSearchParams(newParams)
        window.scrollTo({ top: 0, behavior: "smooth" })
    }

    const getScoreColor = (score: number) => {
        if (score >= 8) return "text-red-400 bg-red-500/10 border-red-500/20"
        if (score >= 6) return "text-orange-400 bg-orange-500/10 border-orange-500/20"
        if (score >= 4) return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    }

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        const diffDays = Math.floor(diffHours / 24)

        if (diffHours < 1) return "< 1 hour ago"
        if (diffHours < 24) return `${diffHours}h ago`
        if (diffDays === 1) return "1 day ago"
        if (diffDays < 7) return `${diffDays} days ago`
        return date.toLocaleDateString()
    }

    const totalPages = Math.ceil(total / perPage)
    const startItem = (page - 1) * perPage + 1
    const endItem = Math.min(page * perPage, total)

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white">
            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-white/10 bg-black/95 backdrop-blur-xl">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate("/")}
                                className="h-8 px-2"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <h1 className="text-2xl font-bold">News Intelligence</h1>
                            <Badge variant="outline" className="text-xs">
                                {total.toLocaleString()} articles
                            </Badge>
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowFilters(!showFilters)}
                            className="h-8 px-3 text-xs"
                        >
                            <Filter className="h-3 w-3 mr-1.5" />
                            {showFilters ? "Hide" : "Show"} Filters
                        </Button>
                    </div>

                    {/* Search Bar */}
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder="Search articles by keyword..."
                                className="pl-10 h-10 bg-white/5 border-white/10"
                            />
                        </div>
                        <Button type="submit" size="sm" className="h-10 px-4">
                            Search
                        </Button>
                    </form>

                    {/* Filters */}
                    {showFilters && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4 p-4 rounded-lg bg-white/5 border border-white/10">
                            <Select value={domain} onValueChange={(v) => updateFilter("domain", v)}>
                                <SelectTrigger className="h-9 bg-black/40 border-white/10">
                                    <SelectValue placeholder="Domain" />
                                </SelectTrigger>
                                <SelectContent>
                                    {DOMAINS.map((d) => (
                                        <SelectItem key={d.value} value={d.value}>
                                            {d.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={source} onValueChange={(v) => updateFilter("source", v)}>
                                <SelectTrigger className="h-9 bg-black/40 border-white/10">
                                    <SelectValue placeholder="Source" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">All Sources</SelectItem>
                                    {sources.map((s) => (
                                        <SelectItem key={s.source} value={s.source}>
                                            {s.source} ({s.count})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={minScore} onValueChange={(v) => updateFilter("min_score", v)}>
                                <SelectTrigger className="h-9 bg-black/40 border-white/10">
                                    <SelectValue placeholder="Importance" />
                                </SelectTrigger>
                                <SelectContent>
                                    {MIN_SCORES.map((s) => (
                                        <SelectItem key={s.value} value={s.value}>
                                            {s.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setSearchInput("")
                                    setSearchParams({})
                                }}
                                className="h-9"
                            >
                                Clear All
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <div className="container mx-auto px-4 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Trending Topics Sidebar */}
                    <aside className="lg:col-span-1">
                        <Card className="bg-black/40 border-white/10 sticky top-24">
                            <CardContent className="p-4">
                                <h3 className="text-sm font-semibold text-white/90 mb-3 flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-sky-400" />
                                    Trending Topics
                                </h3>
                                <div className="space-y-2">
                                    {topics.length === 0 && (
                                        <p className="text-xs text-muted-foreground italic">No trending topics yet.</p>
                                    )}
                                    {(() => {
                                        const domainColor: Record<string, string> = {
                                            geopolitics: "text-red-400",
                                            defense: "text-orange-400",
                                            economics: "text-yellow-400",
                                            technology: "text-blue-400",
                                            health: "text-green-400",
                                            climate: "text-emerald-400",
                                            energy: "text-amber-400",
                                            politics: "text-purple-400",
                                            sports: "text-sky-400",
                                            diplomacy: "text-fuchsia-400",
                                            science: "text-cyan-400",
                                        }

                                        // Resolve best display label for each topic
                                        const resolved = topics.map(t => {
                                            const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
                                            let label = (t.cluster_label || "").trim()
                                            // If label is a UUID or empty, fall back to article title
                                            if (!label || uuid.test(label)) {
                                                label = (t.top_article?.title || "").trim()
                                            }
                                            // Truncate long article titles to 60 chars
                                            if (label.length > 70) label = label.slice(0, 67) + "…"
                                            return { ...t, displayLabel: label }
                                        })
                                        // Drop entries that still have no label
                                        .filter(t => t.displayLabel.length > 0)
                                        // Sort by article count descending so real clusters rise to top
                                        .sort((a, b) => b.article_count - a.article_count)
                                        .slice(0, 20)

                                        if (resolved.length === 0) {
                                            return <p className="text-xs text-muted-foreground italic">No trending topics yet.</p>
                                        }

                                        return resolved.map((topic, idx) => {
                                            const domain = (topic.domain || "").toLowerCase()
                                            const showDomain = domain && domain !== "other" && domain !== "general"
                                            const dColor = domainColor[domain] || "text-muted-foreground"
                                            const searchLabel = topic.cluster_label && !/^[0-9a-f-]{36}$/i.test(topic.cluster_label)
                                                ? topic.cluster_label
                                                : topic.displayLabel
                                            return (
                                                <button
                                                    key={topic.cluster_id || idx}
                                                    onClick={() => {
                                                        setSearchInput(searchLabel)
                                                        const newParams = new URLSearchParams()
                                                        newParams.set("q", searchLabel)
                                                        setSearchParams(newParams)
                                                    }}
                                                    className="w-full text-left p-2 rounded hover:bg-white/5 transition-colors group border-b border-white/5 last:border-0"
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <span className="text-xs text-white/85 group-hover:text-sky-400 line-clamp-2 leading-snug">
                                                            {topic.displayLabel}
                                                        </span>
                                                        <Badge variant="outline" className="shrink-0 text-[9px] px-1.5 tabular-nums">
                                                            {topic.article_count}
                                                        </Badge>
                                                    </div>
                                                    {showDomain && (
                                                        <span className={`text-[9px] font-medium capitalize mt-0.5 block ${dColor}`}>
                                                            {topic.domain}
                                                        </span>
                                                    )}
                                                </button>
                                            )
                                        })
                                    })()}
                                </div>
                            </CardContent>
                        </Card>
                    </aside>

                    {/* Articles List */}
                    <main className="lg:col-span-3">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-6 w-6 animate-spin text-sky-400 motion-reduce:animate-none" />
                                <span className="ml-3 text-sm text-muted-foreground">Loading articles...</span>
                            </div>
                        ) : articles.length === 0 ? (
                            <Card className="bg-black/40 border-white/10">
                                <CardContent className="p-12 text-center">
                                    <Search className="h-12 w-12 text-neutral-800 mx-auto mb-3" />
                                    <p className="text-sm text-muted-foreground">
                                        No articles found. Try adjusting your filters or search query.
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <>
                                {/* Results Info */}
                                <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
                                    <span>
                                        Showing {startItem.toLocaleString()} - {endItem.toLocaleString()} of {total.toLocaleString()}
                                    </span>
                                    <span>Page {page} of {totalPages}</span>
                                </div>

                                {/* Articles */}
                                <div className="space-y-4">
                                    {articles.map((article) => (
                                        <Card
                                            key={article.id}
                                            className="bg-black/40 border-white/10 hover:bg-white/5 transition-colors group"
                                        >
                                            <CardContent className="p-4">
                                                <div className="flex gap-4">
                                                    {/* Thumbnail */}
                                                    {article.top_image && (
                                                        <div className="shrink-0">
                                                            <img
                                                                src={article.top_image}
                                                                alt=""
                                                                className="w-32 h-24 object-cover rounded border border-white/10"
                                                                onError={(e) => {
                                                                    e.currentTarget.style.display = "none"
                                                                }}
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-3 mb-2">
                                                            <h3
                                                                onClick={() => navigate(`/news/${article.id}`)}
                                                                className="text-base font-semibold text-white hover:text-sky-400 cursor-pointer group-hover:text-sky-400 transition-colors line-clamp-2"
                                                            >
                                                                {article.title}
                                                            </h3>
                                                            <Badge
                                                                className={`shrink-0 text-[10px] px-1.5 py-0.5 font-mono ${getScoreColor(article.importance_score)}`}
                                                            >
                                                                {article.importance_score.toFixed(1)}
                                                            </Badge>
                                                        </div>

                                                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                                            {article.description}
                                                        </p>

                                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                            <span className="text-sky-400">{article.source}</span>
                                                            {article.domain && (
                                                                <>
                                                                    <span className="text-white/30">•</span>
                                                                    <Badge variant="outline" className="text-[10px] capitalize">
                                                                        {article.domain}
                                                                    </Badge>
                                                                </>
                                                            )}
                                                            {article.cluster_label && (
                                                                <>
                                                                    <span className="text-white/30">•</span>
                                                                    <span className="text-purple-400 text-[10px]">
                                                                        {article.cluster_label}
                                                                    </span>
                                                                </>
                                                            )}
                                                            <span className="text-white/30">•</span>
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="h-3 w-3" />
                                                                {formatDate(article.pub_date)}
                                                            </span>
                                                            <span className="text-white/30">•</span>
                                                            <a
                                                                href={article.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-1 hover:text-white transition-colors"
                                                            >
                                                                <ExternalLink className="h-3 w-3" />
                                                                Original
                                                            </a>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="mt-6 flex items-center justify-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => goToPage(page - 1)}
                                            disabled={page === 1}
                                            className="h-8"
                                        >
                                            <ArrowLeft className="h-3 w-3 mr-1" />
                                            Previous
                                        </Button>

                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                let pageNum
                                                if (totalPages <= 5) {
                                                    pageNum = i + 1
                                                } else if (page <= 3) {
                                                    pageNum = i + 1
                                                } else if (page >= totalPages - 2) {
                                                    pageNum = totalPages - 4 + i
                                                } else {
                                                    pageNum = page - 2 + i
                                                }

                                                return (
                                                    <Button
                                                        key={pageNum}
                                                        variant={page === pageNum ? "default" : "outline"}
                                                        size="sm"
                                                        onClick={() => goToPage(pageNum)}
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        {pageNum}
                                                    </Button>
                                                )
                                            })}
                                        </div>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => goToPage(page + 1)}
                                            disabled={page === totalPages}
                                            className="h-8"
                                        >
                                            Next
                                            <ArrowRight className="h-3 w-3 ml-1" />
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </main>
                </div>
            </div>
        </div>
    )
}
