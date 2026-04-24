import { useState, useEffect, useCallback } from "react"
import { FileText, Loader2, ArrowLeft, Calendar, Clock, RefreshCw } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { fetchBriefs, fetchBriefById, fetchDailySitrep, generateBrief, type PolicyBriefSummary, type PolicyBriefDetail } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function BriefsCard() {
    const [briefs, setBriefs] = useState<PolicyBriefSummary[]>([])
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)
    const [generatingLabel, setGeneratingLabel] = useState("")
    const [activeBrief, setActiveBrief] = useState<PolicyBriefDetail | null>(null)
    const [error, setError] = useState<string | null>(null)

    const loadBriefs = useCallback(() => {
        fetchBriefs()
            .then(setBriefs)
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [])

    useEffect(() => { loadBriefs() }, [loadBriefs])

    const viewBrief = async (id: number) => {
        try {
            const brief = await fetchBriefById(id)
            setActiveBrief(brief)
        } catch (e) {
            console.error(e)
        }
    }

    const getSitrep = async () => {
        setGenerating(true)
        setGeneratingLabel("Generating today's situation report…")
        setError(null)
        try {
            const brief = await fetchDailySitrep()
            setActiveBrief(brief)
            loadBriefs()
        } catch {
            setError("Failed to generate SitRep. Check that Ollama is running.")
        } finally {
            setGenerating(false)
            setGeneratingLabel("")
        }
    }



    const formatType = (type: string) => {
        return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    }

    const formatDate = (isoStr: string) => {
        const d = new Date(isoStr)
        return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
    }

    // Detail View
    if (activeBrief) {
        return (
            <div className="flex h-full flex-col min-w-0 bg-neutral-950">
                <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-3 py-2 bg-neutral-900/50">
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 rounded-full hover:bg-white/10"
                            onClick={() => setActiveBrief(null)}
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                        </Button>
                        <span className="text-xs font-semibold text-white/90 capitalize truncate">
                            {formatType(activeBrief.brief_type)} {activeBrief.domain ? `- ${activeBrief.domain}` : ''}
                        </span>
                    </div>
                </div>
                <ScrollArea className="flex-1 p-4 bg-white/[0.01]">
                    <div className="prose prose-sm prose-invert max-w-none prose-p:leading-relaxed prose-headings:mt-4 prose-headings:mb-2 prose-h1:text-lg prose-h2:text-base prose-h3:text-sm prose-a:text-sky-400">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {activeBrief.markdown_content || "*No content generated*"}
                        </ReactMarkdown>
                    </div>
                </ScrollArea>
            </div>
        )
    }

    // List View
    return (
        <div className="flex h-full flex-col min-w-0">
            <div className="flex shrink-0 items-center justify-between border-b border-white/5 px-3 py-1.5 gap-2">
                <div className="flex items-center gap-1.5">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20"
                        onClick={async () => {
                            setGenerating(true)
                            setGeneratingLabel("Generating intelligence brief…")
                            setError(null)
                            try {
                                const brief = await generateBrief("policy_brief", "geopolitics")
                                setActiveBrief(brief)
                                loadBriefs()
                            } catch {
                                setError("Failed to generate brief. Check that Ollama is running.")
                            } finally {
                                setGenerating(false)
                                setGeneratingLabel("")
                            }
                        }}
                        disabled={generating}
                    >
                        {generating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <FileText className="h-3 w-3 mr-1" />}
                        Generate Brief
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20"
                        onClick={getSitrep}
                        disabled={generating}
                    >
                        {generating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Calendar className="h-3 w-3 mr-1" />}
                        Today's SitRep
                    </Button>
                </div>
                <button onClick={loadBriefs} className="text-muted-foreground hover:text-white transition-colors" title="Refresh">
                    <RefreshCw className="h-3 w-3" />
                </button>
            </div>

            {/* Generating overlay */}
            {generating && (
                <div className="flex items-center gap-2 px-3 py-2 bg-indigo-500/5 border-b border-indigo-500/10">
                    <Loader2 className="h-3 w-3 animate-spin text-indigo-400 shrink-0" />
                    <span className="text-[10px] text-indigo-300">{generatingLabel}</span>
                    <span className="text-[9px] text-muted-foreground/60 ml-auto">~30s</span>
                </div>
            )}

            {/* Error state */}
            {error && (
                <div className="mx-3 mt-2 rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-[10px] text-red-400">
                    {error}
                </div>
            )}

            <ScrollArea className="flex-1 p-2">
                {loading ? (
                    <div className="flex py-8 items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                    </div>
                ) : briefs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center p-4 py-8 gap-2">
                        <FileText className="h-8 w-8 text-neutral-700 mb-1" />
                        <p className="text-xs text-muted-foreground">No briefs generated yet.</p>
                        <p className="text-[10px] text-muted-foreground/60 max-w-[180px]">
                            Click <strong className="text-indigo-400">Generate Brief</strong> for a policy analysis or <strong className="text-sky-400">Today's SitRep</strong> for a daily overview.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {briefs.map((b) => (
                            <div 
                                key={b.id} 
                                className="group flex flex-col gap-1.5 rounded-lg border border-white/5 bg-white/[0.02] p-2.5 hover:border-violet-500/30 hover:bg-white/[0.04] transition-all cursor-pointer"
                                onClick={() => viewBrief(b.id)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className={`text-[9px] uppercase tracking-wider px-1.5 py-0 border-white/10 ${
                                            b.brief_type === 'sitrep' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' : 
                                            b.brief_type === 'policy_brief' ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' : 
                                            'bg-neutral-800 text-neutral-300'
                                        }`}>
                                            {formatType(b.brief_type)}
                                        </Badge>
                                        {b.domain && <span className="text-[10px] text-white/70 capitalize">{b.domain}</span>}
                                    </div>
                                    <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                                        <Clock className="h-2.5 w-2.5" />
                                        {formatDate(b.created_at)}
                                    </div>
                                </div>
                                {b.topic && (
                                    <p className="text-[11px] text-white/90 font-medium line-clamp-1 mt-0.5">
                                        Topic: {b.topic}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    )
}
