import { useState, useEffect } from "react"
import { Loader2, Send, BarChart2, Activity } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { analyzeLanguage, fetchLanguageStats, type LanguageAnalysisResponse } from "@/lib/api"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function LanguageCard() {
    const [stats, setStats] = useState<{ language_distribution: Record<string, number>, total_articles: number } | null>(null)
    const [loadingStats, setLoadingStats] = useState(true)
    
    const [text, setText] = useState("")
    const [transliterate, setTransliterate] = useState(false)
    const [analysis, setAnalysis] = useState<LanguageAnalysisResponse | null>(null)
    const [analyzing, setAnalyzing] = useState(false)
    const [activeTab, setActiveTab] = useState("stats")

    useEffect(() => {
        if (activeTab === "stats") {
            let isMounted = true
            setLoadingStats(true)
            fetchLanguageStats(24)
                .then(d => {
                    if (isMounted) setStats(d)
                })
                .catch(console.error)
                .finally(() => {
                    if (isMounted) setLoadingStats(false)
                })
            return () => { isMounted = false }
        }
    }, [activeTab])

    const handleAnalyze = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!text.trim()) return
        
        setAnalyzing(true)
        try {
            const res = await analyzeLanguage(text, transliterate)
            setAnalysis(res)
        } catch (err) {
            console.error(err)
        } finally {
            setAnalyzing(false)
        }
    }

    const langNameMap: Record<string, string> = {
        "en": "English", "hi": "Hindi", "bn": "Bengali", "ta": "Tamil", 
        "te": "Telugu", "mr": "Marathi", "gu": "Gujarati", "ur": "Urdu",
        "kn": "Kannada", "or": "Odia", "pa": "Punjabi", "ml": "Malayalam",
        "as": "Assamese"
    }

    return (
        <div className="flex h-full flex-col min-w-0">
            <div className="flex shrink-0 items-center justify-end border-b border-white/5 px-2 py-1">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-7">
                    <TabsList className="h-7 p-0.5 bg-neutral-900 border border-white/5">
                        <TabsTrigger value="stats" className="text-[10px] px-2 h-5 data-[state=active]:bg-white/10">Stats</TabsTrigger>
                        <TabsTrigger value="analyze" className="text-[10px] px-2 h-5 data-[state=active]:bg-white/10">Analyze</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <ScrollArea className="flex-1 p-2">
                {activeTab === "stats" ? (
                    loadingStats ? (
                        <div className="flex py-8 items-center justify-center">
                            <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                        </div>
                    ) : stats && stats.total_articles > 0 ? (
                        <div className="space-y-4">
                            <div className="p-3 bg-white/[0.02] border border-white/5 rounded text-center">
                                <div className="text-2xl font-light text-white tracking-widest">{stats.total_articles}</div>
                                <div className="text-[10px] text-muted-foreground uppercase pt-1">Articles Processed (24h)</div>
                            </div>
                            
                            <div className="space-y-2">
                                <h4 className="text-[10px] text-muted-foreground uppercase tracking-wide border-b border-white/10 pb-1">Language Distribution</h4>
                                {Object.entries(stats.language_distribution || {})
                                    .sort(([, a], [, b]) => b - a)
                                    .map(([lang, count]) => {
                                        const pct = (count / stats.total_articles) * 100
                                        return (
                                            <div key={lang} className="space-y-1">
                                                <div className="flex justify-between text-[11px]">
                                                    <span className="text-white/80">{langNameMap[lang] || lang.toUpperCase()}</span>
                                                    <span className="text-muted-foreground tabular-nums">{count} ({pct.toFixed(1)}%)</span>
                                                </div>
                                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-emerald-500/60 transition-all rounded-full" 
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center p-4 py-8">
                            <BarChart2 className="h-8 w-8 text-neutral-800 mb-2" />
                            <p className="text-xs text-muted-foreground">No NLP stats available.</p>
                        </div>
                    )
                ) : (
                    <div className="space-y-3">
                        <form onSubmit={handleAnalyze} className="space-y-2">
                            <Input
                                value={text}
                                onChange={e => setText(e.target.value)}
                                placeholder="Paste text in any Indian language..."
                                className="h-8 text-xs bg-black/40 border-white/10 focus-visible:ring-emerald-500/30"
                            />
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Switch 
                                        id="transliterate" 
                                        checked={transliterate} 
                                        onCheckedChange={setTransliterate}
                                        className="scale-75 data-[state=checked]:bg-emerald-500"
                                    />
                                    <Label htmlFor="transliterate" className="text-[10px] text-muted-foreground cursor-pointer">
                                        Auto-transliterate
                                    </Label>
                                </div>
                                <Button 
                                    type="submit" 
                                    size="sm" 
                                    disabled={analyzing || !text.trim()}
                                    className="h-6 px-3 text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                                >
                                    {analyzing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                                    Analyze
                                </Button>
                            </div>
                        </form>
                        
                        {analysis && (
                            <div className="space-y-3 pt-2 border-t border-white/5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-2 rounded bg-white/5 border border-white/5">
                                        <div className="text-[9px] text-muted-foreground uppercase tracking-wide mb-1">Detected Lang</div>
                                        <div className="text-xs text-white/90 font-medium">
                                            {langNameMap[analysis.language.code] || analysis.language.code} ({analysis.language.script})
                                        </div>
                                    </div>
                                    <div className="p-2 rounded bg-white/5 border border-white/5">
                                        <div className="text-[9px] text-muted-foreground uppercase tracking-wide mb-1">Sentiment</div>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${
                                                analysis.sentiment.score > 0.3 ? 'bg-emerald-500' : 
                                                analysis.sentiment.score < -0.3 ? 'bg-red-500' : 'bg-yellow-500'
                                            }`} />
                                            <span className="text-xs text-white/90 font-medium capitalize">
                                                {analysis.sentiment.label} {(Math.abs(analysis.sentiment.score) * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                {analysis.entities.length > 0 && (
                                    <div>
                                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                            <Activity className="h-3 w-3" /> Named Entities
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {analysis.entities.map((e, i) => (
                                                <div key={i} className="flex text-[10px] rounded overflow-hidden border border-white/10 group">
                                                    <span className="bg-white/5 px-1.5 py-0.5 text-white/80 max-w-[120px] truncate">{e.word}</span>
                                                    <span className="bg-emerald-500/10 px-1.5 py-0.5 text-emerald-400 font-mono border-l border-white/10">{e.entity_group}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                <div className="text-[9px] text-right text-muted-foreground/50">
                                    Processed in {analysis.processing_time_ms.toFixed(0)}ms {analysis.cached && '(cached)'}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </ScrollArea>
        </div>
    )
}
