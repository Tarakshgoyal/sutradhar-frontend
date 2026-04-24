import { useEffect, useRef, useState } from "react"
import { Activity, Newspaper, AlertCircle, Wifi, WifiOff, ExternalLink } from "lucide-react"
import { fetchTopNews } from "@/lib/api"

// Construct WebSocket URL
// For WebSocket, we connect directly to backend (not through Vite proxy)
const getWebSocketUrl = () => {
    // Check for explicit WebSocket URL from environment
    const wsUrl = import.meta.env.VITE_WS_URL
    if (wsUrl) {
        return wsUrl
    }

    // Development mode - connect directly to backend
    if (import.meta.env.DEV) {
        return 'ws://localhost:8000/ws/live-feed'
    }

    // Production - construct from API URL or use current origin
    const apiUrl = import.meta.env.VITE_API_URL || window.location.origin
    return apiUrl.replace(/^http/, 'ws') + '/ws/live-feed'
}

const WS_URL = getWebSocketUrl()

interface LiveArticle {
    url: string
    title: string
    source: string
    thumbnail?: string
    pub_date: string
    status: "scraped" | "processing" | "indexed"
    timestamp: string
    importance_score?: number
}

export function LiveActivityFeed() {
    const [articles, setArticles] = useState<LiveArticle[]>([])
    const [connected, setConnected] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [initialLoading, setInitialLoading] = useState(true)
    const wsRef = useRef<WebSocket | null>(null)
    const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
    const reconnectAttemptsRef = useRef(0)
    const maxReconnectAttempts = 10

    const connect = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            return // Already connected
        }

        try {
            console.log(`[LiveFeed] Connecting to WebSocket: ${WS_URL}`)
            const ws = new WebSocket(WS_URL)

            ws.onopen = () => {
                console.log("[LiveFeed] WebSocket connected")
                setConnected(true)
                setError(null)
                reconnectAttemptsRef.current = 0
            }

            ws.onmessage = (event) => {
                try {
                    const article: LiveArticle = JSON.parse(event.data)

                    setArticles((prev) => {
                        // Prevent duplicates
                        if (prev.some(a => a.url === article.url)) {
                            return prev
                        }
                        // Keep only last 50 articles to prevent memory issues
                        const updated = [article, ...prev].slice(0, 50)

                        // Play sound notification for high importance articles
                        if (article.importance_score && article.importance_score >= 8.0) {
                            playNotificationSound()
                        }

                        return updated
                    })
                } catch (err) {
                    console.error("[LiveFeed] Failed to parse message:", err)
                }
            }

            ws.onerror = (event) => {
                console.error("[LiveFeed] WebSocket error:", event)
                setError("Connection error")
            }

            ws.onclose = (event) => {
                console.log("[LiveFeed] WebSocket closed:", event.code, event.reason)
                setConnected(false)

                // Attempt reconnection with exponential backoff
                if (reconnectAttemptsRef.current < maxReconnectAttempts) {
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
                    console.log(`[LiveFeed] Reconnecting in ${delay}ms... (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`)

                    reconnectTimeoutRef.current = setTimeout(() => {
                        reconnectAttemptsRef.current++
                        connect()
                    }, delay)
                } else {
                    setError("Connection failed after multiple attempts")
                }
            }

            wsRef.current = ws
        } catch (err) {
            console.error("[LiveFeed] Failed to create WebSocket:", err)
            setError("Failed to connect")
        }
    }

    const playNotificationSound = () => {
        // Play a subtle notification sound for high-importance articles
        // Using Web Audio API to create a gentle beep
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
            const oscillator = audioContext.createOscillator()
            const gainNode = audioContext.createGain()

            oscillator.connect(gainNode)
            gainNode.connect(audioContext.destination)

            oscillator.frequency.value = 800
            oscillator.type = 'sine'
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)

            oscillator.start(audioContext.currentTime)
            oscillator.stop(audioContext.currentTime + 0.2)
        } catch (err) {
            // Audio failed, silent fallback
            console.debug("[LiveFeed] Audio notification failed:", err)
        }
    }

    const formatTimeAgo = (timestamp: string) => {
        const now = new Date()
        const then = new Date(timestamp)
        const diffMs = now.getTime() - then.getTime()
        const diffSecs = Math.floor(diffMs / 1000)
        const diffMins = Math.floor(diffSecs / 60)
        const diffHours = Math.floor(diffMins / 60)

        if (diffSecs < 10) return 'just now'
        if (diffSecs < 60) return `${diffSecs}s ago`
        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        return then.toLocaleDateString()
    }

    const getStatusColor = (status: LiveArticle['status']) => {
        switch (status) {
            case 'scraped': return { color: "text-blue-400", bg: "bg-blue-500/20" }
            case 'processing': return { color: "text-yellow-400", bg: "bg-yellow-500/20" }
            case 'indexed': return { color: "text-emerald-400", bg: "bg-emerald-500/20" }
            default: return { color: "text-gray-400", bg: "bg-gray-500/20" }
        }
    }

    // Load initial articles from API
    const loadInitialArticles = async () => {
        try {
            console.log("[LiveFeed] Loading initial articles...")
            const newsArticles = await fetchTopNews(20, 24) // Get top 20 from last 24 hours

            // Convert NewsArticle format to LiveArticle format
            const liveArticles: LiveArticle[] = newsArticles.map(article => ({
                url: article.url,
                title: article.title,
                source: article.source,
                thumbnail: article.top_image || undefined,
                pub_date: article.pub_date,
                status: "indexed" as const, // Articles from API are already indexed
                timestamp: article.scraped_at || article.pub_date,
                importance_score: article.importance_score,
            }))

            setArticles(liveArticles)
            console.log(`[LiveFeed] Loaded ${liveArticles.length} initial articles`)
        } catch (err) {
            console.error("[LiveFeed] Failed to load initial articles:", err)
            setError("Failed to load recent articles")
        } finally {
            setInitialLoading(false)
        }
    }

    useEffect(() => {
        // First load initial articles, then connect WebSocket
        loadInitialArticles().then(() => {
            connect()
        })

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current)
            }
            if (wsRef.current) {
                wsRef.current.close()
            }
        }
    }, [])

    return (
        <div className="absolute right-4 top-14 bottom-20 w-64 z-10 hidden xl:flex flex-col gap-2 pointer-events-none">
            <div className="bg-black/60 border border-white/10 backdrop-blur-md rounded-xl p-3 pointer-events-auto shadow-lg shadow-black/50 h-full flex flex-col">
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-sky-400" />
                        <h2 className="text-xs font-semibold text-white uppercase tracking-widest">Live Feed</h2>
                        {articles.length > 0 && (
                            <span className="text-[9px] text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded-full">
                                {articles.length}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5">
                        {connected ? (
                            <>
                                <Wifi className="h-3 w-3 text-emerald-400" />
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            </>
                        ) : (
                            <>
                                <WifiOff className="h-3 w-3 text-red-400" />
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            </>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="mb-2 p-2 rounded bg-red-500/10 border border-red-500/20 flex items-start gap-2">
                        <AlertCircle className="h-3 w-3 text-red-400 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-red-400 leading-snug">{error}</p>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                    {initialLoading ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-sky-400 border-t-transparent mb-2" />
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                                Loading recent articles...
                            </p>
                        </div>
                    ) : articles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-4">
                            <Newspaper className="h-8 w-8 text-neutral-800 mb-2" />
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                                {connected ? "Waiting for new articles..." : "Connecting to live feed..."}
                            </p>
                        </div>
                    ) : (
                        articles.map((article, idx) => {
                            const statusColors = getStatusColor(article.status)
                            const isHighPriority = article.importance_score && article.importance_score >= 8.0

                            return (
                                <div
                                    key={`${article.url}-${idx}`}
                                    className={`flex gap-2 items-start p-2 rounded-lg border transition-all animate-in slide-in-from-right-2 duration-300 hover:bg-white/5 ${
                                        isHighPriority
                                            ? "bg-red-500/5 border-red-500/20 shadow-sm shadow-red-500/10"
                                            : "bg-white/[0.02] border-white/5"
                                    }`}
                                    style={{ animationDelay: `${idx * 50}ms` }}
                                >
                                    <div className={`p-1.5 rounded-md shrink-0 mt-0.5 ${statusColors.bg}`}>
                                        <Newspaper className={`h-3 w-3 ${statusColors.color}`} />
                                    </div>
                                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-1">
                                            <a
                                                href={article.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[11px] text-white leading-tight hover:text-sky-400 transition-colors line-clamp-2 flex-1 group"
                                            >
                                                {article.title}
                                                <ExternalLink className="inline h-2.5 w-2.5 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </a>
                                            {isHighPriority && (
                                                <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-red-400 mt-1 animate-pulse" />
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between text-[9px]">
                                            <span className="text-sky-400/80 truncate">{article.source}</span>
                                            <span className="text-muted-foreground shrink-0">{formatTimeAgo(article.timestamp)}</span>
                                        </div>
                                        {article.importance_score !== undefined && (
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <div className="flex-1 h-0.5 bg-white/10 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all ${
                                                            article.importance_score >= 8.0 ? 'bg-red-500' :
                                                            article.importance_score >= 6.0 ? 'bg-orange-500' :
                                                            article.importance_score >= 4.0 ? 'bg-yellow-500' : 'bg-emerald-500'
                                                        }`}
                                                        style={{ width: `${(article.importance_score / 10) * 100}%` }}
                                                    />
                                                </div>
                                                <span className="text-[8px] text-muted-foreground font-mono tabular-nums">
                                                    {article.importance_score.toFixed(1)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>
        </div>
    )
}
