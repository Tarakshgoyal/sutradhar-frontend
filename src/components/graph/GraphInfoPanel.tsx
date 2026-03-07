import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, ArrowRight, ArrowLeft, X, Clock, ChevronRight, Loader2 } from "lucide-react"
import type { GraphEdge } from "@/lib/api"
import { fetchEntityTimeline, type TimelineEvent } from "@/lib/api"

export interface SelectedNode {
    id: string | number
    fullLabel: string
    nodeLabel: string
    entityType: string
    degree: number
    props: Record<string, string>
    sources: {
        url: string
        title: string
        source: string
        pub_date?: string
    }[]
}

interface GraphInfoPanelProps {
    selectedNode: SelectedNode | null
    edges: GraphEdge[]
    nodesMap: Map<string | number, { fullLabel: string }>
    onClose?: () => void
}

type PanelTab = "info" | "timeline"

export function GraphInfoPanel({
    selectedNode,
    edges,
    nodesMap,
    onClose,
}: GraphInfoPanelProps) {
    const [panelTab, setPanelTab] = useState<PanelTab>("info")
    const [timeline, setTimeline] = useState<TimelineEvent[]>([])
    const [timelineTotal, setTimelineTotal] = useState(0)
    const [timelineLoading, setTimelineLoading] = useState(false)
    const [timelineOffset, setTimelineOffset] = useState(0)
    const PAGE = 20

    useEffect(() => {
        setPanelTab("info")
        setTimeline([])
        setTimelineOffset(0)
    }, [selectedNode?.id])

    useEffect(() => {
        if (panelTab !== "timeline" || !selectedNode || selectedNode.nodeLabel !== "Entity") return
        setTimelineLoading(true)
        fetchEntityTimeline(selectedNode.fullLabel, PAGE, timelineOffset)
            .then((d) => {
                setTimeline(d.timeline)
                setTimelineTotal(d.total)
            })
            .catch(() => setTimeline([]))
            .finally(() => setTimelineLoading(false))
    }, [panelTab, selectedNode?.fullLabel, timelineOffset]) // eslint-disable-line react-hooks/exhaustive-deps

    if (!selectedNode) return null

    const isEntity = selectedNode.nodeLabel === "Entity"
    const isEvent = selectedNode.nodeLabel === "Event"

    const relationships = edges.filter(
        (e) =>
            (e.from === selectedNode.id || e.to === selectedNode.id) &&
            e.type === "RELATES_TO" &&
            e.props?.type
    )

    const totalPages = Math.ceil(timelineTotal / PAGE)
    const currentPage = Math.floor(timelineOffset / PAGE) + 1

    return (
        <Card className="fixed top-[70px] left-4 z-[1000] w-[420px] max-h-[75vh] flex flex-col border-white/10 bg-black/95 backdrop-blur-xl overflow-hidden">
            <CardHeader className="pb-2 shrink-0">
                <div className="flex items-start justify-between">
                    <CardTitle className="text-sm text-sky-400 pr-2">
                        {selectedNode.fullLabel}
                    </CardTitle>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="-mt-1 -mr-1 rounded p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-white"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                    {isEntity && (
                        <>
                            <Badge variant="secondary" className="bg-sky-950/50 text-[11px] text-sky-400">
                                {selectedNode.entityType || "Entity"}
                            </Badge>
                            <Badge variant="secondary" className="bg-white/5 text-[11px] text-muted-foreground">
                                {selectedNode.degree} connections
                            </Badge>
                        </>
                    )}
                    {isEvent && (
                        <>
                            <Badge variant="secondary" className="bg-orange-950/50 text-[11px] text-orange-300">
                                Event
                            </Badge>
                            {selectedNode.props.status && (
                                <Badge variant="secondary" className="bg-white/5 text-[11px]">
                                    {selectedNode.props.status}
                                </Badge>
                            )}
                            {selectedNode.props.date && (
                                <Badge variant="secondary" className="bg-green-950/50 text-[11px] text-green-300">
                                    {selectedNode.props.date}
                                </Badge>
                            )}
                        </>
                    )}
                </div>

                {/* Tab switcher — only for entities */}
                {isEntity && (
                    <div className="flex gap-0.5 mt-2 border-b border-white/5 pb-0">
                        {(["info", "timeline"] as PanelTab[]).map((t) => (
                            <button
                                key={t}
                                onClick={() => setPanelTab(t)}
                                className={`px-3 py-1 text-[11px] font-medium rounded-t transition-colors capitalize ${
                                    panelTab === t
                                        ? "text-sky-400 border-b-2 border-sky-400"
                                        : "text-muted-foreground hover:text-white"
                                }`}
                            >
                                {t}
                                {t === "timeline" && timelineTotal > 0 && (
                                    <span className="ml-1 text-[10px] text-muted-foreground">{timelineTotal}</span>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto space-y-4 pb-4 pt-0">
                {panelTab === "info" ? (
                    <>
                        {/* Relationships */}
                        {isEntity && relationships.length > 0 && (
                            <div>
                                <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                                    Relationships
                                </h4>
                                <div className="space-y-1.5">
                                    {relationships.map((rel, i) => {
                                        const isSource = rel.from === selectedNode.id
                                        const otherId = isSource ? rel.to : rel.from
                                        const other = nodesMap.get(otherId)
                                        if (!other) return null
                                        return (
                                            <div key={i} className="flex items-center gap-1.5 text-xs text-gray-300">
                                                {rel.props?.causal && (
                                                    <Badge variant="secondary" className="bg-red-950/50 text-[10px] text-red-300">
                                                        causal
                                                    </Badge>
                                                )}
                                                {rel.props?.temporal && (
                                                    <Badge variant="secondary" className="bg-green-950/50 text-[10px] text-green-300">
                                                        {String(rel.props.temporal)}
                                                    </Badge>
                                                )}
                                                <span className="truncate">{selectedNode.fullLabel}</span>
                                                <span className="flex items-center gap-0.5 text-sky-400">
                                                    {isSource ? <ArrowRight className="h-3 w-3" /> : <ArrowLeft className="h-3 w-3" />}
                                                    <span className="text-[10px]">{String(rel.props?.type)}</span>
                                                </span>
                                                <span className="truncate">{other.fullLabel}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Source Articles */}
                        {selectedNode.sources && selectedNode.sources.length > 0 && (
                            <div>
                                <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                                    Source Articles ({selectedNode.sources.length})
                                </h4>
                                <div className="space-y-2">
                                    {selectedNode.sources.map((s, i) => (
                                        <div key={i} className="flex flex-col gap-0.5 border-b border-white/5 pb-2 last:border-0">
                                            <a
                                                href={s.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-start gap-1 text-xs text-sky-300 hover:underline"
                                            >
                                                <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" />
                                                {s.title}
                                            </a>
                                            <div className="flex gap-1.5">
                                                <Badge variant="outline" className="border-white/10 text-[10px] text-muted-foreground">
                                                    {s.source}
                                                </Badge>
                                                {s.pub_date && (
                                                    <Badge variant="outline" className="border-white/10 text-[10px] text-muted-foreground">
                                                        {s.pub_date}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    /* Timeline tab */
                    <div className="space-y-0">
                        {timelineLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-4 w-4 animate-spin text-sky-400" />
                                <span className="ml-2 text-xs text-muted-foreground">Loading timeline…</span>
                            </div>
                        ) : timeline.length === 0 ? (
                            <p className="py-6 text-center text-xs text-muted-foreground">No events found</p>
                        ) : (
                            <>
                                {timeline.map((ev, i) => (
                                    <TimelineEntry key={i} event={ev} />
                                ))}

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                        <button
                                            disabled={currentPage <= 1}
                                            onClick={() => setTimelineOffset(Math.max(0, timelineOffset - PAGE))}
                                            className="text-[10px] text-muted-foreground hover:text-white disabled:opacity-30"
                                        >
                                            ← Prev
                                        </button>
                                        <span className="text-[10px] text-muted-foreground">
                                            {currentPage} / {totalPages}
                                        </span>
                                        <button
                                            disabled={currentPage >= totalPages}
                                            onClick={() => setTimelineOffset(timelineOffset + PAGE)}
                                            className="text-[10px] text-muted-foreground hover:text-white disabled:opacity-30"
                                        >
                                            Next →
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

function TimelineEntry({ event }: { event: TimelineEvent }) {
    const [open, setOpen] = useState(false)
    return (
        <div className="border-l-2 border-white/10 pl-3 py-2 hover:border-sky-500/40 transition-colors">
            <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-start gap-2 w-full text-left group"
            >
                <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-white/90 group-hover:text-white leading-snug">
                        {event.event_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <Clock className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                        <span className="text-[10px] text-muted-foreground">{event.date}</span>
                        {event.co_entities.length > 0 && (
                            <span className="text-[10px] text-muted-foreground truncate">
                                w/ {event.co_entities.slice(0, 2).join(", ")}
                                {event.co_entities.length > 2 && ` +${event.co_entities.length - 2}`}
                            </span>
                        )}
                    </div>
                </div>
                <ChevronRight className={`h-3 w-3 shrink-0 mt-0.5 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
            </button>

            {open && (
                <div className="mt-2 space-y-1.5">
                    {event.description && (
                        <p className="text-[10px] text-gray-400 leading-relaxed">{event.description}</p>
                    )}
                    {event.co_entities.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {event.co_entities.map((e) => (
                                <Badge key={e} variant="secondary" className="bg-sky-950/30 text-[9px] text-sky-400">
                                    {e}
                                </Badge>
                            ))}
                        </div>
                    )}
                    {event.sources.length > 0 && (
                        <div className="space-y-1 pt-1">
                            {event.sources.map((s, i) => (
                                <a
                                    key={i}
                                    href={s.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-start gap-1 text-[10px] text-sky-400/80 hover:text-sky-300 hover:underline"
                                >
                                    <ExternalLink className="h-2.5 w-2.5 mt-0.5 shrink-0" />
                                    <span className="truncate">{s.title}</span>
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
