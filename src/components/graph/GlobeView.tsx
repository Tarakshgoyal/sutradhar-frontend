import { useEffect, useState, useMemo, useRef, useCallback } from "react"
import Globe from "react-globe.gl"
import type { GraphNode, GraphEdge } from "@/lib/api"
import type { SelectedNode } from "@/components/graph/GraphInfoPanel"
import { Loader2 } from "lucide-react"

interface GlobeViewProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  selectedNode: SelectedNode | null
  onSelectNode: (node: SelectedNode | null) => void
}

interface CountryData {
  lat: number
  lng: number
  name: string
  node: GraphNode
  connectionCount: number
}

interface ArcData {
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  from: string
  to: string
}

/** Map common country names to ISO Alpha-2 codes for positioning */
const COUNTRY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  "india": { lat: 20.5937, lng: 78.9629 },
  "china": { lat: 35.8617, lng: 104.1954 },
  "united states": { lat: 37.0902, lng: -95.7129 },
  "usa": { lat: 37.0902, lng: -95.7129 },
  "russia": { lat: 61.5240, lng: 105.3188 },
  "pakistan": { lat: 30.3753, lng: 69.3451 },
  "iran": { lat: 32.4279, lng: 53.6880 },
  "israel": { lat: 31.0461, lng: 34.8516 },
  "ukraine": { lat: 48.3794, lng: 31.1656 },
  "turkey": { lat: 38.9637, lng: 35.2433 },
  "saudi arabia": { lat: 23.8859, lng: 45.0792 },
  "japan": { lat: 36.2048, lng: 138.2529 },
  "south korea": { lat: 35.9078, lng: 127.7669 },
  "north korea": { lat: 40.3399, lng: 127.5101 },
  "united kingdom": { lat: 55.3781, lng: -3.4360 },
  "uk": { lat: 55.3781, lng: -3.4360 },
  "france": { lat: 46.2276, lng: 2.2137 },
  "germany": { lat: 51.1657, lng: 10.4515 },
  "brazil": { lat: -14.2350, lng: -51.9253 },
  "canada": { lat: 56.1304, lng: -106.3468 },
  "australia": { lat: -25.2744, lng: 133.7751 },
  "south africa": { lat: -30.5595, lng: 22.9375 },
  "egypt": { lat: 26.8206, lng: 30.8025 },
  "mexico": { lat: 23.6345, lng: -102.5528 },
  "argentina": { lat: -38.4161, lng: -63.6167 },
  "indonesia": { lat: -0.7893, lng: 113.9213 },
  "thailand": { lat: 15.8700, lng: 100.9925 },
  "vietnam": { lat: 14.0583, lng: 108.2772 },
  "italy": { lat: 41.8719, lng: 12.5674 },
  "spain": { lat: 40.4637, lng: -3.7492 },
  "poland": { lat: 51.9194, lng: 19.1451 },
  "bangladesh": { lat: 23.6850, lng: 90.3563 },
  "nepal": { lat: 28.3949, lng: 84.1240 },
  "sri lanka": { lat: 7.8731, lng: 80.7718 },
  "afghanistan": { lat: 33.9391, lng: 67.7100 },
  "myanmar": { lat: 21.9162, lng: 95.9560 },
  "taiwan": { lat: 23.6978, lng: 120.9605 },
  "philippines": { lat: 12.8797, lng: 121.7740 },
  "malaysia": { lat: 4.2105, lng: 101.9758 },
  "singapore": { lat: 1.3521, lng: 103.8198 },
}

/** Get coordinates for a country name */
function getCountryCoordinates(name: string): { lat: number; lng: number } | null {
  const key = name.toLowerCase().trim()
  return COUNTRY_COORDINATES[key] || null
}

export function GlobeView({ nodes, edges, selectedNode, onSelectNode }: GlobeViewProps) {
  const globeRef = useRef<any>(null)
  const [loading, setLoading] = useState(true)

  const countryNodes = useMemo(() => nodes.filter((n) => n.props.type === "Country"), [nodes])

  const nodeIdToName = useMemo(() => {
    const m = new Map<string | number, string>()
    countryNodes.forEach((n) => { if (n.props.name) m.set(n.id, n.props.name) })
    return m
  }, [countryNodes])

  const countryEdges = useMemo(() => {
    const ids = new Set(countryNodes.map((n) => n.id))
    return edges.filter((e) => ids.has(e.from) && ids.has(e.to))
  }, [countryNodes, edges])

  // Calculate connection counts
  const connectionCounts = useMemo(() => {
    const counts = new Map<string | number, number>()
    countryEdges.forEach((edge) => {
      counts.set(edge.from, (counts.get(edge.from) || 0) + 1)
      counts.set(edge.to, (counts.get(edge.to) || 0) + 1)
    })
    return counts
  }, [countryEdges])

  // Transform country nodes to globe points
  const countryData = useMemo(() => {
    const data: CountryData[] = []
    for (const node of countryNodes) {
      const name = node.props.name || ""
      const coords = getCountryCoordinates(name)
      if (coords) {
        data.push({
          lat: coords.lat,
          lng: coords.lng,
          name,
          node,
          connectionCount: connectionCounts.get(node.id) || 0,
        })
      }
    }
    return data
  }, [countryNodes, connectionCounts])

  // Transform edges to arcs
  const arcData = useMemo(() => {
    const arcs: ArcData[] = []
    for (const edge of countryEdges) {
      const fromName = nodeIdToName.get(edge.from)
      const toName = nodeIdToName.get(edge.to)
      if (!fromName || !toName) continue

      const fromCoords = getCountryCoordinates(fromName)
      const toCoords = getCountryCoordinates(toName)

      if (fromCoords && toCoords) {
        arcs.push({
          startLat: fromCoords.lat,
          startLng: fromCoords.lng,
          endLat: toCoords.lat,
          endLng: toCoords.lng,
          from: fromName,
          to: toName,
        })
      }
    }
    return arcs
  }, [countryEdges, nodeIdToName])

  // Point click handler
  const handlePointClick = useCallback((point: CountryData) => {
    const node = point.node
    onSelectNode({
      id: node.id,
      fullLabel: node.props.name || "",
      nodeLabel: "Country",
      entityType: "Country",
      degree: point.connectionCount,
      props: node.props,
      sources: node.sources || [],
    })
  }, [onSelectNode])

  // Initialize globe
  useEffect(() => {
    setLoading(false)
    if (globeRef.current) {
      // Point camera at India by default
      globeRef.current.pointOfView({ lat: 20, lng: 78, altitude: 2.5 }, 1000)
    }
  }, [])

  // Update globe when selected node changes
  useEffect(() => {
    if (globeRef.current && selectedNode && selectedNode.nodeLabel === "Country") {
      const countryName = selectedNode.fullLabel
      const coords = getCountryCoordinates(countryName)
      if (coords) {
        globeRef.current.pointOfView({
          lat: coords.lat,
          lng: coords.lng,
          altitude: 1.5
        }, 1000)
      }
    }
  }, [selectedNode])

  // Get color based on connection count
  const getPointColor = useCallback((point: CountryData) => {
    const count = point.connectionCount
    if (count === 0) return "#666"
    if (count < 3) return "#4fc3f7"
    if (count < 7) return "#29b6f6"
    if (count < 12) return "#03a9f4"
    if (count < 20) return "#0288d1"
    return "#01579b"
  }, [])

  // Get point size based on connection count
  const getPointSize = useCallback((point: CountryData) => {
    const count = point.connectionCount
    return Math.max(0.3, Math.min(1.5, 0.3 + count * 0.08))
  }, [])

  return (
    <div className="relative h-full w-full bg-[#0a0a0a]">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="flex items-center gap-2 rounded-lg bg-black/80 px-4 py-3 text-sm text-sky-400">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
            Loading globe...
          </div>
        </div>
      )}

      <Globe
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"

        // Points for countries
        pointsData={countryData}
        pointLat={(d: any) => d.lat}
        pointLng={(d: any) => d.lng}
        pointColor={(d: any) => {
          const point = d as CountryData
          // Highlight selected country
          if (selectedNode?.fullLabel.toLowerCase() === point.name.toLowerCase()) {
            return "#ff0"
          }
          return getPointColor(point)
        }}
        pointAltitude={(d: any) => {
          const point = d as CountryData
          // Elevate selected country
          if (selectedNode?.fullLabel.toLowerCase() === point.name.toLowerCase()) {
            return 0.05
          }
          return 0.01
        }}
        pointRadius={(d: any) => getPointSize(d as CountryData)}
        pointLabel={(d: any) => {
          const point = d as CountryData
          return `<div style="color: #fff; background: rgba(0,0,0,0.8); padding: 4px 8px; border-radius: 4px; font-size: 12px;">
            <strong>${point.name}</strong><br/>
            Connections: ${point.connectionCount}
          </div>`
        }}
        onPointClick={(point: any) => handlePointClick(point as CountryData)}

        // Arcs for connections
        arcsData={arcData}
        arcStartLat={(d: any) => d.startLat}
        arcStartLng={(d: any) => d.startLng}
        arcEndLat={(d: any) => d.endLat}
        arcEndLng={(d: any) => d.endLng}
        arcColor={() => "#4fc3f780"}
        arcStroke={0.5}
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={3000}
        arcLabel={(d: any) => {
          const arc = d as ArcData
          return `<div style="color: #fff; background: rgba(0,0,0,0.8); padding: 4px 8px; border-radius: 4px; font-size: 11px;">
            ${arc.from} ↔ ${arc.to}
          </div>`
        }}

        // Atmosphere
        atmosphereColor="#4fc3f7"
        atmosphereAltitude={0.15}

        // Controls
        enablePointerInteraction={true}
      />

      {/* Info overlay */}
      <div className="absolute top-4 left-4 bg-black/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-sky-400"></div>
          <span>Countries: {countryData.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-sky-400/50"></div>
          <span>Connections: {arcData.length}</span>
        </div>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-4 left-4 bg-black/80 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-muted-foreground">
        <div>🖱️ Drag to rotate</div>
        <div>🔍 Scroll to zoom</div>
        <div>📍 Click country to select</div>
      </div>
    </div>
  )
}
