import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowLeft, ExternalLink, Calendar, Tag, Network } from "lucide-react"
import { fetchArticleById, type NewsArticle } from "@/lib/api"

export default function ArticleDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()

    const [article, setArticle] = useState<NewsArticle | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let isMounted = true

        const load = async () => {
            if (!id) {
                setError("No article ID provided")
                setLoading(false)
                return
            }

            setLoading(true)
            setError(null)

            try {
                const data = await fetchArticleById(parseInt(id))
                if (isMounted) {
                    setArticle(data)
                }
            } catch (err) {
                console.error("Failed to load article:", err)
                if (isMounted) {
                    setError("Failed to load article. It may have been removed.")
                }
            } finally {
                if (isMounted) {
                    setLoading(false)
                }
            }
        }

        load()
        return () => { isMounted = false }
    }, [id])

    const getScoreColor = (score: number) => {
        if (score >= 8) return "text-red-400 bg-red-500/10 border-red-500/20"
        if (score >= 6) return "text-orange-400 bg-orange-500/10 border-orange-500/20"
        if (score >= 4) return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    }

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
                <div className="flex items-center gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-sky-400 motion-reduce:animate-none" />
                    <span className="text-sm text-muted-foreground">Loading article...</span>
                </div>
            </div>
        )
    }

    if (error || !article) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] text-white">
                <div className="container mx-auto px-4 py-12 max-w-4xl">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate("/news")}
                        className="mb-6"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to News
                    </Button>

                    <Card className="bg-black/40 border-red-500/20">
                        <CardContent className="p-12 text-center">
                            <p className="text-lg text-red-400 mb-2">Article Not Found</p>
                            <p className="text-sm text-muted-foreground">{error}</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white">
            {/* Header */}
            <div className="border-b border-white/10 bg-black/95 backdrop-blur-xl">
                <div className="container mx-auto px-4 py-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate("/news")}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to News
                    </Button>
                </div>
            </div>

            {/* Article Content */}
            <article className="container mx-auto px-4 py-8 max-w-4xl">
                <Card className="bg-black/40 border-white/10">
                    <CardContent className="p-8">
                        {/* Header Image */}
                        {article.top_image && (
                            <div className="mb-6 -mx-8 -mt-8">
                                <img
                                    src={article.top_image}
                                    alt={article.title}
                                    className="w-full h-auto max-h-96 object-cover rounded-t-lg"
                                    onError={(e) => {
                                        e.currentTarget.style.display = "none"
                                    }}
                                />
                            </div>
                        )}

                        {/* Metadata */}
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                            <Badge
                                className={`text-xs px-2 py-1 font-mono ${getScoreColor(article.importance_score)}`}
                            >
                                Importance: {article.importance_score.toFixed(1)}
                            </Badge>

                            {article.domain && (
                                <Badge variant="outline" className="text-xs capitalize">
                                    <Tag className="h-3 w-3 mr-1" />
                                    {article.domain}
                                </Badge>
                            )}

                            {article.cluster_label && (
                                <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/20">
                                    <Network className="h-3 w-3 mr-1" />
                                    {article.cluster_label}
                                </Badge>
                            )}
                        </div>

                        {/* Title */}
                        <h1 className="text-3xl font-bold text-white mb-4 leading-tight">
                            {article.title}
                        </h1>

                        {/* Source & Date */}
                        <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-muted-foreground">
                            <span className="text-sky-400 font-medium">{article.source}</span>
                            <span className="text-white/30">•</span>
                            <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {formatDate(article.pub_date)}
                            </span>
                            <span className="text-white/30">•</span>
                            <a
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 hover:text-white transition-colors"
                            >
                                <ExternalLink className="h-4 w-4" />
                                View Original Article
                            </a>
                        </div>

                        <hr className="border-white/10 mb-6" />

                        {/* Description */}
                        {article.description && (
                            <div className="mb-6">
                                <p className="text-lg text-white/90 leading-relaxed">
                                    {article.description}
                                </p>
                            </div>
                        )}

                        {/* Cluster Info */}
                        {article.cluster_label && article.cluster_id && (
                            <div className="mt-8 p-4 rounded-lg bg-purple-500/5 border border-purple-500/20">
                                <h3 className="text-sm font-semibold text-purple-400 mb-2 flex items-center gap-2">
                                    <Network className="h-4 w-4" />
                                    Part of Story Cluster
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    This article is part of the "<span className="text-white">{article.cluster_label}</span>" story cluster.
                                    Multiple articles are covering this topic from different perspectives.
                                </p>
                            </div>
                        )}

                        {/* Footer Actions */}
                        <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate("/news")}
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to News List
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(article.url, '_blank')}
                            >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Read Full Article
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Scraped Timestamp */}
                <p className="text-xs text-muted-foreground text-center mt-4">
                    Scraped at {formatDate(article.scraped_at)}
                </p>
            </article>
        </div>
    )
}
