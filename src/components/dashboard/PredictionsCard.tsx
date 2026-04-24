import { useState, useEffect, useCallback } from "react"
import { TrendingUp, Loader2, CheckCircle2, XCircle, AlertCircle, Layers, Activity, Sparkles, RefreshCw } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { fetchPredictions, fetchPredictionExplain, fetchCalibration, verifyPrediction, generatePredictions, type PredictionOut, type PredictionExplain, type CalibrationBucket } from "@/lib/api"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function PredictionsCard() {
    const [predictions, setPredictions] = useState<PredictionOut[]>([])
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState("active")
    const [calibration, setCalibration] = useState<CalibrationBucket[]>([])

    // Detail view state
    const [explainingId, setExplainingId] = useState<number | null>(null)
    const [explanation, setExplanation] = useState<PredictionExplain | null>(null)
    const [, setLoadingExplain] = useState(false)

    const loadPredictions = useCallback((quiet = false) => {
        if (!quiet) setLoading(true)
        fetchPredictions({ outcome: activeTab === "history" ? "verified" : undefined })
            .then(setPredictions)
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [activeTab])

    const loadCalibration = useCallback(() => {
        fetchCalibration().then(setCalibration).catch(() => {})
    }, [])

    useEffect(() => {
        if (activeTab === "calibration") {
            loadCalibration()
        } else {
            loadPredictions()
        }
    }, [activeTab, loadPredictions, loadCalibration])

    const handleGenerate = async () => {
        setGenerating(true)
        setError(null)
        try {
            await generatePredictions(6)
            loadPredictions(true)
        } catch {
            setError("Generation failed. Check that Ollama is running.")
        } finally {
            setGenerating(false)
        }
    }

    const viewExplanation = async (id: number) => {
        setExplainingId(id)
        setLoadingExplain(true)
        try {
            const exp = await fetchPredictionExplain(id)
            setExplanation(exp)
        } catch (e) {
            console.error(e)
            setExplainingId(null)
        } finally {
            setLoadingExplain(false)
        }
    }

    const handleVerify = async (id: number, outcome: string) => {
        try {
            await verifyPrediction(id, outcome)
            if (explainingId === id) setExplainingId(null)
            loadPredictions()
            if (activeTab === "calibration") loadCalibration()
        } catch (e) {
            console.error(e)
        }
    }

    const getConfidenceColor = (conf: number) => {
        if (conf >= 0.8) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
        if (conf >= 0.5) return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"
        return "text-orange-400 bg-orange-500/10 border-orange-500/20"
    }
    
    const getConfidenceBar = (conf: number) => {
        if (conf >= 0.8) return "bg-emerald-500"
        if (conf >= 0.5) return "bg-yellow-500"
        return "bg-orange-500"
    }

    // --- Explanation Detail View ---
    if (explainingId && explanation) {
        return (
            <div className="flex h-full flex-col min-w-0 bg-neutral-950">
                <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-3 py-2 bg-neutral-900/50">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-2 text-xs hover:bg-white/10"
                        onClick={() => setExplainingId(null)}
                    >
                        &larr; Back
                    </Button>
                    <span className="text-xs font-semibold text-white/90">Prediction Details</span>
                </div>
                
                <ScrollArea className="flex-1 p-3">
                    <div className="space-y-4">
                        {/* The Claim */}
                        <div className="p-3 bg-white/[0.02] border border-white/10 rounded-lg">
                            <p className="text-sm text-white/90 leading-snug">{explanation.prediction_text}</p>
                            <div className="flex items-center gap-3 mt-3">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getConfidenceColor(explanation.confidence)}`}>
                                    {Math.round(explanation.confidence * 100)}% CONFIDENCE
                                </span>
                                {explanation.domain && (
                                    <span className="text-[10px] text-muted-foreground uppercase">{explanation.domain}</span>
                                )}
                            </div>
                        </div>

                        {/* Confidence Components */}
                        {explanation.confidence_components && (
                            <div>
                                <h4 className="flex items-center gap-1.5 text-xs font-medium text-white/70 mb-2">
                                    <Activity className="h-3.5 w-3.5" /> Component Breakdown
                                </h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(explanation.confidence_components).map(([key, val]) => (
                                        <div key={key} className="bg-white/5 p-2 rounded flex justify-between items-center">
                                            <span className="text-[10px] text-muted-foreground capitalize">{key.replace('_', ' ')}</span>
                                            <span className="text-[10px] text-white/90 font-mono">{(val as number).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Reasoning Chain */}
                        {explanation.reasoning_chain && explanation.reasoning_chain.length > 0 && (
                            <div>
                                <h4 className="flex items-center gap-1.5 text-xs font-medium text-white/70 mb-2">
                                    <Layers className="h-3.5 w-3.5" /> Reasoning Chain
                                </h4>
                                <div className="space-y-1.5 border-l-2 border-white/10 pl-3 ml-2">
                                    {explanation.reasoning_chain.map((step, i) => (
                                        <div key={i} className="text-[11px] text-white/80 leading-snug relative">
                                            <div className="absolute w-2 h-2 rounded-full bg-cyan-500 -left-[17px] top-1" />
                                            {step}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Verify Section (if null) */}
                        {explanation.outcome === null && (
                            <div className="mt-4 pt-4 border-t border-white/10">
                                <h4 className="text-xs text-white/70 mb-2">Verify Outcome</h4>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                                        onClick={() => handleVerify(explanation.id, 'correct')}>
                                        Correct
                                    </Button>
                                    <Button size="sm" variant="outline" className="flex-1 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border-yellow-500/20"
                                        onClick={() => handleVerify(explanation.id, 'partial')}>
                                        Partial
                                    </Button>
                                    <Button size="sm" variant="outline" className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20"
                                        onClick={() => handleVerify(explanation.id, 'incorrect')}>
                                        Incorrect
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>
        )
    }

    // --- Main List View ---
    return (
        <div className="flex h-full flex-col min-w-0">
            <div className="flex shrink-0 items-center justify-between border-b border-white/5 px-2 py-1 gap-2">
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                    onClick={handleGenerate}
                    disabled={generating}
                >
                    {generating
                        ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        : <Sparkles className="h-3 w-3 mr-1" />}
                    {generating ? "Generating…" : "Generate"}
                </Button>

                <div className="flex items-center gap-1.5">
                    <button onClick={() => loadPredictions()} className="text-muted-foreground hover:text-white transition-colors" title="Refresh">
                        <RefreshCw className="h-3 w-3" />
                    </button>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-7">
                        <TabsList className="h-7 p-0.5 bg-neutral-900 border border-white/5">
                            <TabsTrigger value="active" className="text-[10px] px-2 h-5 data-[state=active]:bg-white/10">Active</TabsTrigger>
                            <TabsTrigger value="history" className="text-[10px] px-2 h-5 data-[state=active]:bg-white/10">History</TabsTrigger>
                            <TabsTrigger value="calibration" className="text-[10px] px-2 h-5 data-[state=active]:bg-white/10">Calib</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </div>

            {/* Generating progress banner */}
            {generating && (
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/5 border-b border-emerald-500/10">
                    <Loader2 className="h-3 w-3 animate-spin text-emerald-400 shrink-0" />
                    <span className="text-[10px] text-emerald-300">Analysing graph + news, generating predictions…</span>
                    <span className="text-[9px] text-muted-foreground/60 ml-auto">~30s</span>
                </div>
            )}

            {/* Error banner */}
            {error && (
                <div className="mx-3 mt-2 rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-[10px] text-red-400">
                    {error}
                </div>
            )}

            <ScrollArea className="flex-1 p-2">
                {loading ? (
                    <div className="flex py-8 items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                    </div>
                ) : activeTab === "calibration" ? (
                    // Calibration View
                    <div className="space-y-3 p-1">
                        <p className="text-[10px] text-muted-foreground mb-2 leading-relaxed">
                            Calibration tracking ensures our confidence scores are accurate. A well-calibrated engine should see ~80% accuracy in the 80% confidence bucket.
                        </p>
                        <div className="grid grid-cols-4 gap-1 text-[9px] font-semibold text-white/50 border-b border-white/10 pb-1 mb-1 px-1">
                            <div>Bucket</div>
                            <div className="text-right">Total</div>
                            <div className="text-right">Correct</div>
                            <div className="text-right">Accuracy</div>
                        </div>
                        {calibration.length === 0 ? (
                            <p className="text-xs text-center text-muted-foreground py-4">No verified predictions.</p>
                        ) : (
                            <div className="space-y-1">
                                {calibration.map((c, i) => (
                                    <div key={i} className="grid grid-cols-4 gap-1 text-[11px] items-center p-1 rounded hover:bg-white/5">
                                        <div className="text-white/80 tabular-nums">{c.confidence_min.toFixed(1)}-{c.confidence_max.toFixed(1)}</div>
                                        <div className="text-right text-muted-foreground">{c.total}</div>
                                        <div className="text-right text-emerald-400/80">{c.correct}</div>
                                        <div className="text-right font-mono">
                                            <span className={Math.abs(c.accuracy - ((c.confidence_min + c.confidence_max)/2)) < 0.15 ? "text-emerald-400" : "text-orange-400"}>
                                                {(c.accuracy * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : predictions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center p-4 py-8 gap-2">
                        <TrendingUp className="h-8 w-8 text-neutral-700 mb-1" />
                        <p className="text-xs text-muted-foreground">No predictions yet.</p>
                        <p className="text-[10px] text-muted-foreground/60 max-w-[180px]">
                            Click <strong className="text-emerald-400">Generate</strong> to run the
                            prediction engine on live graph + news data.
                        </p>
                        <button
                            onClick={handleGenerate}
                            disabled={generating}
                            className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                        >
                            {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                            {generating ? "Generating…" : "Generate Predictions"}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {predictions.map((p) => (
                            <div 
                                key={p.id} 
                                className="flex flex-col gap-1.5 rounded-lg border border-white/5 bg-white/[0.02] p-2.5 hover:border-cyan-500/30 hover:bg-white/[0.04] transition-all cursor-pointer"
                                onClick={() => viewExplanation(p.id)}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-[11px] text-white/90 leading-snug line-clamp-2 flex-1">
                                        {p.prediction_text}
                                    </p>
                                    
                                    {p.outcome && (
                                        <div className="shrink-0 mt-0.5">
                                            {p.outcome === 'correct' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> :
                                             p.outcome === 'incorrect' ? <XCircle className="h-3.5 w-3.5 text-red-400" /> :
                                             <AlertCircle className="h-3.5 w-3.5 text-yellow-400" />}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex items-center justify-between mt-1">
                                    <div className="flex items-center gap-1.5">
                                        <span className={`text-[9px] font-bold tabular-nums ${getConfidenceBar(p.confidence).replace('bg-', 'text-')}`}>
                                            {Math.round(p.confidence * 100)}%
                                        </span>
                                        <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                                            <div className={`h-full ${getConfidenceBar(p.confidence)}`} style={{ width: `${p.confidence * 100}%` }} />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {p.horizon && (
                                            <span className="text-[9px] text-fuchsia-400/70 font-mono">
                                                {p.horizon}
                                            </span>
                                        )}
                                        {p.domain && <span className="text-[9px] text-muted-foreground uppercase">{p.domain}</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    )
}
