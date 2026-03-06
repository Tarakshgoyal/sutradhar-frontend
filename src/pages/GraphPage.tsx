import { useCallback, useEffect, useRef, useState } from "react"
import { Network, type Options } from "vis-network"
import { ChatPanel } from "@/components/graph/ChatPanel"
import { DataSet } from "vis-data"
import {
    GraphToolbar,
    type GraphFilters,
    type ViewMode,
} from "@/components/graph/GraphToolbar"
import { MapView } from "@/components/graph/MapView"
import {
    GraphInfoPanel,
    type SelectedNode,
} from "@/components/graph/GraphInfoPanel"
import { GraphLegend } from "@/components/graph/GraphLegend"
import { ReportsPanel } from "@/components/graph/ReportsPanel"
import { fetchGraph, type GraphEdge, type GraphNode } from "@/lib/api"
import { TYPE_COLORS } from "@/lib/constants"
import { Loader2 } from "lucide-react"

interface VisNode {
    id: string | number
    label: string
    fullLabel: string
    group: string
    color: { background: string; border: string; highlight: { background: string; border: string } }
    shape: string
    size: number
    font: { color: string; size: number }
    props: Record<string, string>
    nodeLabel: string
    degree: number
    sources: { url: string; title: string; source: string; pub_date?: string }[]
    entityType: string
}

export default function GraphPage() {
    const containerRef = useRef<HTMLDivElement>(null)
    const networkRef = useRef<Network | null>(null)
    const [loading, setLoading] = useState(true)
    const [chatOpen, setChatOpen] = useState(false)
    const [viewMode, setViewMode] = useState<ViewMode>("graph")
    const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null)
    const [edges, setEdges] = useState<GraphEdge[]>([])
    const [graphNodes, setGraphNodes] = useState<GraphNode[]>([])
    const [nodesMap, setNodesMap] = useState<
        Map<string | number, { fullLabel: string }>
    >(new Map())

    const [filters, setFilters] = useState<GraphFilters>({
        search: "",
        entityType: "",
        limit: 100,
        minConnections: 1,
        dateRange: "7d",
    })

    const loadGraph = useCallback(async () => {
        setLoading(true)
        try {
            const data = await fetchGraph({
                search: filters.search || undefined,
                entity_type: filters.entityType || undefined,
                limit: filters.limit,
                min_connections: filters.minConnections,
                date_range: filters.dateRange,
            })

            const maxDegree = Math.max(1, ...data.nodes.map((n) => n.degree || 0))

            const visNodes: VisNode[] = data.nodes.map((n) => {
                const label = n.labels[0]
                const name = n.props.name || n.props.title || "?"
                const degree = n.degree || 0
                const isEvent = label === "Event"
                const entityType = n.props.type || ""
                const color = isEvent
                    ? "#ff7043"
                    : TYPE_COLORS[entityType] || "#4fc3f7"
                const size = isEvent ? 12 : 10 + (degree / maxDegree) * 40

                return {
                    id: n.id,
                    label: name.length > 35 ? name.slice(0, 35) + "..." : name,
                    fullLabel: name,
                    group: label,
                    color: {
                        background: color,
                        border: color,
                        highlight: { background: "#fff", border: color },
                    },
                    shape: label === "Event" ? "diamond" : "dot",
                    size,
                    font: {
                        color: "#fff",
                        size: Math.max(10, 9 + (degree / maxDegree) * 9),
                    },
                    props: n.props,
                    nodeLabel: label,
                    degree,
                    sources: n.sources || [],
                    entityType,
                }
            })

            const visEdges = data.edges.map((e, i) => ({
                id: i,
                from: e.from,
                to: e.to,
                label: (e.props?.type as string) || e.type || "",
                color: {
                    color: e.props?.causal ? "#ef5350" : "#444",
                    highlight: "#4fc3f7",
                },
                font: { color: "#999", size: 10, strokeWidth: 0 },
                arrows: "to" as const,
                smooth: { type: "continuous" as const },
                width: e.props?.causal ? 2 : 1,
                dashes: e.type === "INVOLVED_IN" ? [5, 5] : false,
            }))

            // Store for info panel and map view
            setEdges(data.edges)
            setGraphNodes(data.nodes)
            const map = new Map<string | number, { fullLabel: string }>()
            visNodes.forEach((n) => map.set(n.id, { fullLabel: n.fullLabel }))
            setNodesMap(map)


            // Destroy old network
            if (networkRef.current) {
                networkRef.current.destroy()
                networkRef.current = null
            }

            if (!containerRef.current) return

            const options: Options = {
                physics: {
                    solver: "forceAtlas2Based",
                    forceAtlas2Based: {
                        gravitationalConstant: -120,
                        springLength: 150,
                        damping: 0.5,
                    },
                    stabilization: { iterations: 300 },
                },
                interaction: { hover: true, tooltipDelay: 100 },
            }

            const network = new Network(
                containerRef.current,
                {
                    nodes: new DataSet(visNodes),
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    edges: new DataSet(visEdges) as any,
                },
                options
            )

            network.on("click", (params: { nodes: (string | number)[] }) => {
                if (params.nodes.length === 0) {
                    setSelectedNode(null)
                    return
                }
                const node = visNodes.find((n) => n.id === params.nodes[0])
                if (node) {
                    setSelectedNode({
                        id: node.id,
                        fullLabel: node.fullLabel,
                        nodeLabel: node.nodeLabel,
                        entityType: node.entityType,
                        degree: node.degree,
                        props: node.props,
                        sources: node.sources,
                    })
                }
            })

            networkRef.current = network
        } catch (err) {
            console.error("Failed to load graph:", err)
        } finally {
            setLoading(false)
        }
    }, [filters])

    // Load graph on mount
    useEffect(() => {
        loadGraph()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="relative h-screen w-screen bg-[#0a0a0a]">
            <GraphToolbar
                filters={filters}
                onFiltersChange={setFilters}
                onApply={loadGraph}
                chatOpen={chatOpen}
                onChatToggle={() => setChatOpen((v) => !v)}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
            />

            <GraphInfoPanel
                selectedNode={selectedNode}
                edges={edges}
                nodesMap={nodesMap}
                onClose={() => setSelectedNode(null)}
            />

            <GraphLegend />

            {/* Graph container — always mounted so vis-network keeps its canvas */}
            <div
                ref={containerRef}
                className="h-full w-full"
                style={{ display: viewMode === "graph" ? "block" : "none" }}
            />

            {/* Map container */}
            {viewMode === "map" && (
                <div className="absolute inset-0 top-12 z-0">
                    <MapView
                        nodes={graphNodes}
                        edges={edges}
                        selectedNode={selectedNode}
                        onSelectNode={setSelectedNode}
                    />
                </div>
            )}

            {/* Chat side panel */}
            {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}

            <ReportsPanel />

            {/* Loading overlay */}
            {loading && (
                <div className="fixed inset-0 z-30 flex items-center justify-center">
                    <div className="flex items-center gap-2 rounded-lg bg-black/80 px-4 py-3 text-sm text-sky-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading graph…
                    </div>
                </div>
            )}
        </div>
    )
}
