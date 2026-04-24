import { useState, useEffect } from "react"
import {
    Zap, Loader2, RefreshCw, X, GitBranch, ShieldAlert, Globe,
    TrendingUp, TrendingDown, Minus, AlertTriangle, Lightbulb, Database,
    ChevronDown, ChevronUp
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { simulateScenario, type ScenarioResult } from "@/lib/api"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ScenarioModalProps {
    isOpen: boolean
    onClose: () => void
    initialScenario?: string
    domainFilter?: string
}

function ImpactBadge({ direction }: { direction: string }) {
    if (direction === "risk")
        return (
            <span className="flex items-center gap-0.5 text-[9px] font-bold uppercase text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-full">
                <TrendingDown className="h-2.5 w-2.5" /> Risk
            </span>
        )
    if (direction === "opportunity")
        return (
            <span className="flex items-center gap-0.5 text-[9px] font-bold uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                <TrendingUp className="h-2.5 w-2.5" /> Opp
            </span>
        )
    return (
        <span className="flex items-center gap-0.5 text-[9px] font-bold uppercase text-slate-400 bg-slate-500/10 border border-slate-500/20 px-1.5 py-0.5 rounded-full">
            <Minus className="h-2.5 w-2.5" /> Neutral
        </span>
    )
}

function EntityCard({ n }: { n: ScenarioResult["affected_nodes"][0] }) {
    const [expanded, setExpanded] = useState(false)
    return (
        <div
            className={`border rounded-lg p-2 transition-colors cursor-pointer ${
                n.impact_direction === "risk"
                    ? "border-red-500/20 bg-red-500/5 hover:bg-red-500/10"
                    : n.impact_direction === "opportunity"
                    ? "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10"
                    : "border-white/10 bg-white/5 hover:bg-white/8"
            }`}
            onClick={() => n.reasoning && setExpanded(e => !e)}//3.3
        >
            <div className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[11px] font-medium text-white/90 truncate">{n.name}</span>
                    <span className="text-[9px] text-muted-foreground uppercase shrink-0">{n.type}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <ImpactBadge direction={n.impact_direction} />
                    <span className="text-[10px] font-mono text-fuchsia-300">{(n.confidence * 100).toFixed(0)}%</span>
                    {n.reasoning && (expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />)}
                </div>
            </div>
            {expanded && n.reasoning && (
                <p className="mt-2 text-[11px] text-white/60 leading-relaxed border-t border-white/5 pt-2">
                    {n.reasoning}
                </p>
            )}
        </div>
    )
}

function extractSeedEntitiesFromText(text: string): string[] {
    const stopWords = new Set([
        "simulate", "model", "analyze", "evaluate", "impact", "impacts", "effect", "effects",
        "of", "on", "in", "for", "to", "the", "a", "an", "if", "and", "or", "during", "given",
        "major", "global", "sudden", "concurrent", "formal", "new", "supply", "chain", "chains",
    ])

    const candidates = new Set<string>()

    const phraseRegex = /\b(?:[A-Z][a-z]+(?:[-\s](?:of|the|and|[A-Z][a-z]+))*)\b|(?:[A-Z]{2,}(?:-[A-Z]{2,})*)/g
    const matches = text.match(phraseRegex) ?? []
    for (const m of matches) {
        const trimmed = m.trim()
        if (trimmed.length >= 3) candidates.add(trimmed)
    }

    for (const token of text.split(/[^A-Za-z0-9-]+/)) {
        const t = token.trim()
        if (!t || t.length < 3) continue
        const lower = t.toLowerCase()
        if (stopWords.has(lower)) continue
        if (/^[A-Z]/.test(t) || t.includes("-") || /^[A-Z0-9]{3,}$/.test(t)) {
            candidates.add(t)
        }
    }

    return Array.from(candidates).slice(0, 8)
}

export function ScenarioModal({ isOpen, onClose, initialScenario, domainFilter }: ScenarioModalProps) {
    const [scenario, setScenario] = useState(initialScenario ?? "")
    const [result, setResult] = useState<ScenarioResult | null>(null)
    const [simulating, setSimulating] = useState(false)
    const [maxHops] = useState(3)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen && initialScenario) setScenario(initialScenario)
    }, [isOpen, initialScenario])

    if (!isOpen) return null

    const handleSimulate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!scenario.trim()) return
        setSimulating(true)
        setError(null)
        setResult(null)
        try {
            const res = await simulateScenario(scenario, maxHops, undefined, domainFilter)
            setResult(res)
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Simulation failed"
            // Preset prompts can fail entity auto-discovery; retry with local seed extraction.
            if (msg.includes("422")) {
                try {
                    const fallbackEntities = extractSeedEntitiesFromText(scenario)
                    const retryRes = await simulateScenario(
                        scenario,
                        maxHops,
                        fallbackEntities.length > 0 ? fallbackEntities : [scenario.trim()],
                        domainFilter
                    )
                    setResult(retryRes)
                    setError(null)
                    return
                } catch (retryErr) {
                    const retryMsg = retryErr instanceof Error ? retryErr.message : "Simulation failed"
                    setError(retryMsg)
                    return
                }
            }
            setError(msg)
        } finally {
            setSimulating(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
            <div className="bg-neutral-950 border border-white/10 rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-neutral-900/50">
                    <div className="flex items-center gap-2 text-fuchsia-400">
                        <Zap className="h-4 w-4" />
                        <h2 className="text-sm font-semibold text-white tracking-wide">GraphRAG What-If Simulator</h2>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/10 text-muted-foreground" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Body */}
                <div className="flex-1 flex flex-col px-5 py-4 min-h-0 gap-4">
                    <form onSubmit={handleSimulate} className="flex gap-2">
                        <Input
                            className="flex-1 bg-black/50 border-white/10 text-sm h-10 px-4 focus-visible:ring-fuchsia-500/30"
                            placeholder="e.g. China blockades Taiwan Strait, disrupting semiconductor supply..."
                            value={scenario}
                            onChange={(e) => setScenario(e.target.value)}
                            disabled={simulating}
                            autoFocus
                        />
                        <Button
                            type="submit"
                            disabled={simulating || !scenario.trim()}
                            className="bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/20 h-10 px-6 transition-colors shadow-[0_0_15px_rgba(217,70,239,0.1)]"
                        >
                            {simulating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                            Simulate
                        </Button>
                    </form>

                    <div className="flex-1 bg-black/40 border border-white/5 rounded-lg overflow-hidden flex flex-col min-h-0">
                        {simulating ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
                                <Zap className="h-12 w-12 text-fuchsia-500/20 animate-pulse mb-4" />
                                <p className="text-sm animate-pulse">Extracting entities → querying knowledge graph → reasoning impacts…</p>
                                <p className="text-xs text-white/30 mt-2 text-center max-w-xs">
                                    LLM is tracing causal chains through the Neo4j knowledge graph. This may take 10–30 seconds.
                                </p>
                            </div>
                        ) : error ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                                <AlertTriangle className="h-8 w-8 text-red-400/40 mb-3" />
                                <p className="text-sm text-red-300">{error}</p>
                                <p className="text-xs text-muted-foreground mt-1">Check backend logs for details.</p>
                            </div>
                        ) : result ? (
                            <ScrollArea className="flex-1 p-4 md:p-5">
                                <div className="space-y-5">

                                    {/* Top bar: stats + graph evidence */}
                                    <div className="flex flex-wrap items-start justify-between gap-3 p-4 rounded-lg bg-fuchsia-500/5 border border-fuchsia-500/10">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] text-fuchsia-400 uppercase tracking-widest font-semibold mb-1">Scenario</p>
                                            <p className="text-sm text-white/90 font-medium">"{result.scenario}"</p>
                                        </div>
                                        <div className="flex items-center gap-4 text-center shrink-0">
                                            <div>
                                                <p className="text-[9px] text-muted-foreground uppercase">Seeds</p>
                                                <p className="text-sm text-fuchsia-300 font-mono">{result.seed_entities.length}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] text-muted-foreground uppercase">Affected</p>
                                                <p className="text-sm text-fuchsia-300 font-mono">{result.affected_nodes.length}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] text-muted-foreground uppercase">Confidence</p>
                                                <p className="text-sm font-bold tabular-nums text-fuchsia-400">{(result.confidence_overall * 100).toFixed(0)}%</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Graph evidence badge */}
                                    {result.graph_evidence && (
                                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground px-1">
                                            <Database className="h-3 w-3 text-sky-400/60" />
                                            <span className="text-sky-400">{result.graph_evidence.seed_nodes_found} graph nodes matched</span>
                                            <span>·</span>
                                            <span>{result.graph_evidence.relationships_used} relationships used</span>
                                            <span>·</span>
                                            <span>{result.graph_evidence.articles_referenced} news articles as evidence</span>
                                        </div>
                                    )}

                                    {/* Executive Summary */}
                                    {result.summary && (
                                        <div className="p-4 rounded-lg bg-sky-500/5 border border-sky-500/15">
                                            <p className="text-[10px] text-sky-400 uppercase tracking-widest font-semibold mb-2">Executive Summary</p>
                                            <p className="text-sm text-white/80 leading-relaxed">{result.summary}</p>
                                        </div>
                                    )}

                                    {/* Seed Entities */}
                                    {result.seed_entities.length > 0 && (
                                        <div>
                                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Seed Entities Identified</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {result.seed_entities.map((e, i) => (
                                                    <span key={i} className="text-[11px] bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-300 px-2.5 py-1 rounded-full">
                                                        {e}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid md:grid-cols-2 gap-5">
                                        {/* India Implications */}
                                        <div className="space-y-2">
                                            <h3 className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-emerald-400 font-semibold border-b border-emerald-500/20 pb-2">
                                                <Globe className="h-3.5 w-3.5" /> India Impact Assessment
                                            </h3>
                                            {result.india_implications.length === 0 ? (
                                                <p className="text-xs text-muted-foreground italic">No direct impact detected within analysis window.</p>
                                            ) : (
                                                <div className="space-y-1.5">
                                                    {result.india_implications.map((imp, i) => (
                                                        <div key={i} className="flex items-start gap-2 p-2.5 rounded-md bg-emerald-500/5 border border-emerald-500/10 text-xs text-emerald-100 leading-relaxed">
                                                            <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-emerald-500 mt-0.5" />
                                                            <span>{imp}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Affected Entities */}
                                        <div className="space-y-2">
                                            <h3 className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-orange-400 font-semibold border-b border-orange-500/20 pb-2">
                                                <GitBranch className="h-3.5 w-3.5" /> Affected Entities
                                                <span className="text-muted-foreground font-normal normal-case tracking-normal text-[9px]">(click to expand reasoning)</span>
                                            </h3>
                                            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10">
                                                {result.affected_nodes.length === 0 ? (
                                                    <p className="text-xs text-muted-foreground italic">No downstream entities identified.</p>
                                                ) : (
                                                    result.affected_nodes.slice(0, 20).map((n, i) => (
                                                        <EntityCard key={i} n={n} />
                                                    ))
                                                )}
                                                {result.affected_nodes.length > 20 && (
                                                    <p className="text-[10px] text-muted-foreground text-center pt-1">+{result.affected_nodes.length - 20} more entities</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Risk & Opportunity factors */}
                                    {(result.risk_factors?.length || result.opportunity_factors?.length) && (
                                        <div className="grid md:grid-cols-2 gap-4 pt-1">
                                            {result.risk_factors && result.risk_factors.length > 0 && (
                                                <div>
                                                    <h3 className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-red-400 font-semibold mb-2">
                                                        <AlertTriangle className="h-3 w-3" /> Risk Factors
                                                    </h3>
                                                    <ul className="space-y-1">
                                                        {result.risk_factors.map((r, i) => (
                                                            <li key={i} className="flex items-start gap-2 text-xs text-red-200/70">
                                                                <span className="text-red-500 mt-1 shrink-0">•</span>
                                                                {r}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            {result.opportunity_factors && result.opportunity_factors.length > 0 && (
                                                <div>
                                                    <h3 className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-emerald-400 font-semibold mb-2">
                                                        <Lightbulb className="h-3 w-3" /> Opportunity Factors
                                                    </h3>
                                                    <ul className="space-y-1">
                                                        {result.opportunity_factors.map((o, i) => (
                                                            <li key={i} className="flex items-start gap-2 text-xs text-emerald-200/70">
                                                                <span className="text-emerald-500 mt-1 shrink-0">•</span>
                                                                {o}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Causal Chains */}
                                    {result.graph_paths.length > 0 && (
                                        <div className="pt-3 border-t border-white/5">
                                            <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Causal Chain Visualization</h3>
                                            <div className="space-y-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10">
                                                {result.graph_paths.map((path, pi) => {
                                                    // Support both " → " and " -> " separators
                                                    const nodes = path.split(/ →|->| because /i)
                                                    // Handle "A → B → C because <reason>" — last split is the reason
                                                    const hasReason = / because /i.test(path)
                                                    const chainNodes = hasReason ? nodes.slice(0, -1) : nodes
                                                    const reason = hasReason ? nodes[nodes.length - 1] : null
                                                    return (
                                                        <div key={pi} className="space-y-1">
                                                            <div className="flex items-center gap-2 flex-wrap min-w-max">
                                                                {chainNodes.map((node, j) => (
                                                                    <div key={j} className="flex items-center gap-2">
                                                                        <div className="bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-300 px-3 py-1.5 rounded-full text-[10px] whitespace-nowrap">
                                                                            {node.trim()}
                                                                        </div>
                                                                        {j < chainNodes.length - 1 && (
                                                                            <div className="flex flex-col items-center text-muted-foreground">
                                                                                <span className="text-[8px] uppercase tracking-wider mb-0.5">→</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            {reason && (
                                                                <p className="text-[10px] text-white/40 pl-2 italic">{reason.trim()}</p>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground max-w-sm mx-auto">
                                <GitBranch className="h-10 w-10 text-white/5 mb-4" />
                                <p className="text-sm text-balance">Enter a what-if scenario. The GraphRAG engine extracts entities, queries the Neo4j knowledge graph, and uses an LLM to trace systemic cascades with India-specific implications.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
