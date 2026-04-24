import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Network, type Options } from "vis-network"
import { ChatPanel } from "@/components/graph/ChatPanel"
import { DataSet } from "vis-data"
import {
    GraphToolbar,
    type GraphFilters,
    type ViewMode,
    type MapViewMode,
} from "@/components/graph/GraphToolbar"
import { MapGlobeView } from "@/components/graph/MapGlobeView"
import {
    GraphInfoPanel,
    type SelectedNode,
} from "@/components/graph/GraphInfoPanel"
import { GraphLegend } from "@/components/graph/GraphLegend"
import { ReportsPanel } from "@/components/graph/ReportsPanel"
// import { TimeSlider } from "@/components/graph/TimeSlider"
import { LayerToggle } from "@/components/graph/LayerToggle"

import { fetchGraph, type GraphEdge, type GraphNode } from "@/lib/api"
import { TYPE_COLORS } from "@/lib/constants"
import { Loader2 } from "lucide-react"
import { LiveActivityFeed } from "@/components/dashboard/LiveActivityFeed"

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
    const [rendering, setRendering] = useState(false)
    const [chatOpen, setChatOpen] = useState(false)
    const [viewMode, setViewMode] = useState<ViewMode>("graph")
    const [mapViewMode, setMapViewMode] = useState<MapViewMode>("2d")
    const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null)
    const [edges, setEdges] = useState<GraphEdge[]>([])
    const [graphNodes, setGraphNodes] = useState<GraphNode[]>([])
    const [nodesMap, setNodesMap] = useState<
        Map<string | number, { fullLabel: string }>
    >(new Map())
    const [temporalTimestamp, setTemporalTimestamp] = useState<string | null>(null)

    const [filters, setFilters] = useState<GraphFilters>({
        search: "",
        entityType: "",
        limit: 50,
        minConnections: 1,
        dateRange: "7d",
    })
    // Ref so loadGraph is always stable (no stale closures)
    const filtersRef = useRef(filters)
    const viewModeRef = useRef(viewMode)
    const temporalRef = useRef(temporalTimestamp)
    useEffect(() => { filtersRef.current = filters }, [filters])
    useEffect(() => { viewModeRef.current = viewMode }, [viewMode])
    useEffect(() => { temporalRef.current = temporalTimestamp }, [temporalTimestamp])

    const [rawData, setRawData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] } | null>(null)
    // Eagerly initialized so data updates can always reach them, even before network mounts
    const nodesDataSetRef = useRef(new DataSet<VisNode>([]))
    const edgesDataSetRef = useRef(new DataSet<object>([]))
    const networkInitializedRef = useRef(false)

    // Memoize expensive transformations
    const { visNodes, visEdges, maxDegree } = useMemo(() => {
        if (!rawData) return { visNodes: [], visEdges: [], maxDegree: 1 }

        const maxDegree = Math.max(1, ...rawData.nodes.map((n) => n.degree || 0))

        const visNodes: VisNode[] = rawData.nodes.map((n) => {
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

        const visEdges = rawData.edges.map((e, i) => ({
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

        return { visNodes, visEdges, maxDegree }
    }, [rawData])

    // Stable loadGraph — reads everything from refs so it never goes stale
    const loadGraph = useCallback(async () => {
        const f = filtersRef.current
        const vm = viewModeRef.current
        const ts = temporalRef.current
        setLoading(true)
        try {
            const data = await fetchGraph({
                search: f.search || undefined,
                entity_type: vm === "map" ? undefined : (f.entityType || undefined),
                limit: vm === "map" ? 1000 : f.limit,
                min_connections: f.minConnections,
                until: ts ?? undefined,
                date_range: ts ? undefined : (f.dateRange !== "all" ? f.dateRange : undefined),
            })
            setRawData(data)
            setEdges(data.edges)
            setGraphNodes(data.nodes)
        } catch (err) {
            console.error("Failed to load graph:", err)
        } finally {
            setLoading(false)
        }
    }, []) // stable — never recreated

    // Update nodesMap when visNodes changes 50 50
    useEffect(() => {
        const map = new Map<string | number, { fullLabel: string }>()
        visNodes.forEach((n) => map.set(n.id, { fullLabel: n.fullLabel }))
        setNodesMap(map)
    }, [visNodes])

    // Initialize vis-network ONCE — DataSets are already created at ref level
    useEffect(() => {
        if (!containerRef.current) return
        if (networkInitializedRef.current) return

        const options: Options = {
            physics: {
                enabled: true,
                solver: "forceAtlas2Based",
                forceAtlas2Based: {
                    gravitationalConstant: -50,
                    springLength: 100,
                    springConstant: 0.08,
                    damping: 0.7,
                    avoidOverlap: 0.5,
                },
                stabilization: {
                    enabled: true,
                    iterations: 150,
                    updateInterval: 10,
                },
                adaptiveTimestep: true,
            },
            interaction: {
                hover: true,
                tooltipDelay: 100,
                navigationButtons: true,
                keyboard: true,
            },
            layout: {
                improvedLayout: false,
            },
        }

        const network = new Network(
            containerRef.current,
            {
                nodes: nodesDataSetRef.current,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                edges: edgesDataSetRef.current as any,
            },
            options
        )

        network.on("stabilizationIterationsDone", () => {
            network.setOptions({ physics: { enabled: false } })
            setRendering(false)
        })

        network.on("click", (params: { nodes: (string | number)[] }) => {
            if (params.nodes.length === 0) {
                setSelectedNode(null)
                return
            }
            // Read from the ref so we always have current nodes
            const node = nodesDataSetRef.current?.get(params.nodes[0]) as VisNode | null
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
        networkInitializedRef.current = true

        return () => {
            network.destroy()
            networkRef.current = null
            networkInitializedRef.current = false
            // Keep DataSets alive — they hold the data and can be re-attached
        }
    }, []) // only run once on mount

    // Update DataSets in-place whenever rawData changes — no network recreation needed
    useEffect(() => {
        if (!rawData) return
        const nodesDS = nodesDataSetRef.current
        const edgesDS = edgesDataSetRef.current

        // Remove stale items first
        const newNodeIds = new Set(visNodes.map(n => n.id))
        const newEdgeIds = new Set(visEdges.map(e => e.id))
        const staleNodes = (nodesDS.getIds() as (string | number)[]).filter(id => !newNodeIds.has(id))
        const staleEdges = (edgesDS.getIds() as (string | number)[]).filter(id => !newEdgeIds.has(id))
        if (staleNodes.length) nodesDS.remove(staleNodes)
        if (staleEdges.length) edgesDS.remove(staleEdges)

        // Upsert new data
        if (visNodes.length) nodesDS.update(visNodes)
        if (visEdges.length) edgesDS.update(visEdges)

        // Briefly re-enable physics to reposition after data change
        if (networkRef.current && visNodes.length > 0) {
            setRendering(true)
            networkRef.current.setOptions({ physics: { enabled: true, stabilization: { enabled: true, iterations: 100 } } })
        }
    }, [rawData, visNodes, visEdges])

    // Load on mount
    useEffect(() => { loadGraph() }, [loadGraph])

    // Reload when view mode changes (after ref is updated)
    useEffect(() => {
        viewModeRef.current = viewMode
        loadGraph()
    }, [viewMode, loadGraph])

    // Reload when temporal timestamp changes
    useEffect(() => {
        temporalRef.current = temporalTimestamp
        loadGraph()
    }, [temporalTimestamp, loadGraph])

    // Stable callback for TimeSlider
    const handleTimeChange = useCallback((isoDate: string | null) => {
        setTemporalTimestamp(isoDate)
    }, [])

    return (
        <div className="relative h-screen w-screen bg-[#0a0a0a]">
            <GraphToolbar
                filters={filters}
                onFiltersChange={(f) => {
                    filtersRef.current = f
                    setFilters(f)
                }}
                onApply={() => {
                    // Ensure filtersRef is current before fetching
                    filtersRef.current = filters
                    loadGraph()
                }}
                chatOpen={chatOpen}
                onChatToggle={() => setChatOpen((v) => !v)}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                mapViewMode={mapViewMode}
                onMapViewModeChange={setMapViewMode}
            />

            <GraphInfoPanel
                selectedNode={selectedNode}
                edges={edges}
                nodesMap={nodesMap}
                onClose={() => setSelectedNode(null)}
            />

            {/* Global Overlays */}
            <LiveActivityFeed />
            <LayerToggle />
            <GraphLegend />

            {/* Graph container — always mounted so vis-network keeps its canvas */}
            <div
                ref={containerRef}
                className="h-full w-full"
                style={{ display: viewMode === "graph" ? "block" : "none" }}
            />

            {/* Map/Globe container */}
            {viewMode === "map" && (
                <div className="absolute inset-0 top-12 z-0">
                    <MapGlobeView
                        nodes={graphNodes}
                        edges={edges}
                        selectedNode={selectedNode}
                        onSelectNode={setSelectedNode}
                        viewMode={mapViewMode}
                        onViewModeChange={setMapViewMode}
                    />
                </div>
            )}

            {/* Time Travel Slider Control */}
            {/* <TimeSlider
                onTimeChange={handleTimeChange}
                disabled={loading || rendering}
            /> */}

            {/* Chat side panel */}
            {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}



            <ReportsPanel />

            {/* Full overlay only on initial load; small badge for time-travel reloads */}
            {loading && !temporalTimestamp && graphNodes.length === 0 && (
                <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="flex items-center gap-2 rounded-lg bg-black/80 px-4 py-3 text-sm text-sky-400 border border-sky-500/20">
                        <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                        Loading knowledge graph…
                    </div>
                </div>
            )}
            {(loading && (temporalTimestamp !== null || graphNodes.length > 0)) && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30">
                    <div className="flex items-center gap-2 rounded-full bg-black/80 px-3 py-1.5 text-xs text-sky-400 border border-sky-500/20 shadow-lg">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {temporalTimestamp ? `Loading graph snapshot for ${temporalTimestamp}…` : "Updating…"}
                    </div>
                </div>
            )}
        </div>
    )
}
