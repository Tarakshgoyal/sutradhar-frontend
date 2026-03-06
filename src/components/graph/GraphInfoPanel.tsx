import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ExternalLink, ArrowRight, ArrowLeft } from "lucide-react"
import type { GraphEdge } from "@/lib/api"

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
}

export function GraphInfoPanel({
    selectedNode,
    edges,
    nodesMap,
}: GraphInfoPanelProps) {
    if (!selectedNode) {
        return (
            <Card className="fixed top-[70px] left-4 z-10 w-[420px] border-white/10 bg-black/95 backdrop-blur-xl">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-sky-400">
                        Global Ontology Engine
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-xs text-muted-foreground">
                        Click any entity to see relationships and source articles
                    </p>
                </CardContent>
            </Card>
        )
    }

    const isEntity = selectedNode.nodeLabel === "Entity"
    const isEvent = selectedNode.nodeLabel === "Event"

    // Find relationships for this node
    const relationships = edges.filter(
        (e) =>
            (e.from === selectedNode.id || e.to === selectedNode.id) &&
            e.type === "RELATES_TO" &&
            e.props?.type
    )

    return (
        <Card className="fixed top-[70px] left-4 z-10 w-[420px] border-white/10 bg-black/95 backdrop-blur-xl">
            <ScrollArea className="max-h-[75vh]">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-sky-400">
                        {selectedNode.fullLabel}
                    </CardTitle>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                        {isEntity && (
                            <>
                                <Badge
                                    variant="secondary"
                                    className="bg-sky-950/50 text-[11px] text-sky-400"
                                >
                                    {selectedNode.entityType || "Entity"}
                                </Badge>
                                <Badge
                                    variant="secondary"
                                    className="bg-white/5 text-[11px] text-muted-foreground"
                                >
                                    {selectedNode.degree} connections
                                </Badge>
                            </>
                        )}
                        {isEvent && (
                            <>
                                <Badge
                                    variant="secondary"
                                    className="bg-orange-950/50 text-[11px] text-orange-300"
                                >
                                    Event
                                </Badge>
                                {selectedNode.props.status && (
                                    <Badge
                                        variant="secondary"
                                        className="bg-white/5 text-[11px]"
                                    >
                                        {selectedNode.props.status}
                                    </Badge>
                                )}
                                {selectedNode.props.date && (
                                    <Badge
                                        variant="secondary"
                                        className="bg-green-950/50 text-[11px] text-green-300"
                                    >
                                        {selectedNode.props.date}
                                    </Badge>
                                )}
                            </>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 pb-4">
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
                                        <div
                                            key={i}
                                            className="flex items-center gap-1.5 text-xs text-gray-300"
                                        >
                                            {rel.props?.causal && (
                                                <Badge
                                                    variant="secondary"
                                                    className="bg-red-950/50 text-[10px] text-red-300"
                                                >
                                                    causal
                                                </Badge>
                                            )}
                                            {rel.props?.temporal && (
                                                <Badge
                                                    variant="secondary"
                                                    className="bg-green-950/50 text-[10px] text-green-300"
                                                >
                                                    {String(rel.props.temporal)}
                                                </Badge>
                                            )}
                                            <span className="truncate">{selectedNode.fullLabel}</span>
                                            <span className="flex items-center gap-0.5 text-sky-400">
                                                {isSource ? (
                                                    <ArrowRight className="h-3 w-3" />
                                                ) : (
                                                    <ArrowLeft className="h-3 w-3" />
                                                )}
                                                <span className="text-[10px]">
                                                    {String(rel.props?.type)}
                                                </span>
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
                                    <div
                                        key={i}
                                        className="flex flex-col gap-0.5 border-b border-white/5 pb-2 last:border-0"
                                    >
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
                                            <Badge
                                                variant="outline"
                                                className="border-white/10 text-[10px] text-muted-foreground"
                                            >
                                                {s.source}
                                            </Badge>
                                            {s.pub_date && (
                                                <Badge
                                                    variant="outline"
                                                    className="border-white/10 text-[10px] text-muted-foreground"
                                                >
                                                    {s.pub_date}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </ScrollArea>
        </Card>
    )
}
