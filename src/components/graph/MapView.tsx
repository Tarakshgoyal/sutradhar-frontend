import React, { useEffect, useState, useMemo, useCallback, useRef } from "react"
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Polyline,
  Tooltip,
  CircleMarker,
  useMapEvent,
  useMap,
} from "react-leaflet"
import L, { DomEvent } from "leaflet"
import type { Layer, LeafletMouseEvent } from "leaflet"
import "leaflet/dist/leaflet.css"
import type { GraphNode, GraphEdge } from "@/lib/api"
import type { SelectedNode } from "@/components/graph/GraphInfoPanel"
import { Loader2 } from "lucide-react"

interface MapViewProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  selectedNode: SelectedNode | null
  onSelectNode: (node: SelectedNode | null) => void
}

/* ── Entity type colors ─────────────────────────────────────────────────── */

const ENTITY_COLORS: Record<string, string> = {
  Country:            "#66bb6a",
  Person:             "#facc15",
  Organization:       "#a855f7",
  Location:           "#22c55e",
  Policy:             "#06b6d4",
  Technology:         "#3b82f6",
  Economic_Indicator: "#f97316",
  Military_Asset:     "#ef4444",
  Resource:           "#d97706",
  Event:              "#e879f9",
}
const DEFAULT_ENTITY_COLOR = "#94a3b8"

function entityColor(type: string | undefined): string {
  return ENTITY_COLORS[type ?? ""] ?? DEFAULT_ENTITY_COLOR
}

/* ── Arc color palette ──────────────────────────────────────────────────── */

const ARC_PALETTE = [
  "#4fc3f7", "#4ade80", "#c084fc", "#fb923c",
  "#f472b6", "#67e8f9", "#a3e635", "#facc15",
]

function stringHash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function arcColor(edgeType: string, isCausal: boolean): string {
  if (isCausal) return "#ef4444"
  if (!edgeType) return ARC_PALETTE[0]
  return ARC_PALETTE[stringHash(edgeType) % ARC_PALETTE.length]
}

/* ── Country name normalisation (graph node name → GeoJSON ADMIN name) ──── */

// Maps common name variants → exact ADMIN name in the geo-countries dataset
const NAME_OVERRIDES: Record<string, string> = {
  "usa":                        "United States of America",
  "united states":              "United States of America",
  "united states of america":   "United States of America",
  "u.s.":                       "United States of America",
  "u.s.a.":                     "United States of America",
  "uk":                         "United Kingdom",
  "u.k.":                       "United Kingdom",
  "uae":                        "United Arab Emirates",
  "dr congo":                   "Democratic Republic of the Congo",
  "democratic republic of the congo": "Democratic Republic of the Congo",
  "republic of the congo":      "Republic of the Congo",
  "ivory coast":                "Ivory Coast",
  "côte d'ivoire":              "Ivory Coast",
  "east timor":                 "East Timor",
  "timor-leste":                "East Timor",
  "north macedonia":            "Macedonia",
  "south korea":                "South Korea",
  "north korea":                "North Korea",
  "cape verde":                 "Cape Verde",
  "cabo verde":                 "Cape Verde",
  "eswatini":                   "Swaziland",
  "swaziland":                  "Swaziland",
  "czechia":                    "Czech Republic",
  "czech republic":             "Czech Republic",
}

function normalizeCountryName(name: string): string {
  const lower = name.toLowerCase().trim()
  return NAME_OVERRIDES[lower] ?? name
}

/* ── Centroid from GeoJSON feature ─────────────────────────────────────── */

function getCentroid(feature: GeoJSON.Feature): [number, number] | null {
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180, count = 0
  function walk(coords: unknown) {
    if (!Array.isArray(coords)) return
    if (typeof coords[0] === "number" && typeof coords[1] === "number") {
      const [lng, lat] = coords as [number, number]
      minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat)
      minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng)
      count++
    } else { (coords as unknown[]).forEach(walk) }
  }
  if (feature.geometry && "coordinates" in feature.geometry) walk(feature.geometry.coordinates)
  if (count === 0) return null
  return [(minLat + maxLat) / 2, (minLng + maxLng) / 2]
}

/* ── Bezier arc ─────────────────────────────────────────────────────────── */

const bezierCache = new Map<string, [number, number][]>()

function bezierArc(from: [number, number], to: [number, number], n = 60): [number, number][] {
  const key = `${from[0]},${from[1]}-${to[0]},${to[1]}`
  const cached = bezierCache.get(key)
  if (cached) return cached
  const midLat = (from[0] + to[0]) / 2, midLng = (from[1] + to[1]) / 2
  const dLat = to[0] - from[0], dLng = to[1] - from[1]
  const dist = Math.sqrt(dLat * dLat + dLng * dLng) || 1
  const bulge = dist * 0.28
  const cpLat = midLat + (-dLng / dist) * bulge
  const cpLng = midLng + (dLat / dist) * bulge
  const pts: [number, number][] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t
    pts.push([u*u*from[0] + 2*u*t*cpLat + t*t*to[0], u*u*from[1] + 2*u*t*cpLng + t*t*to[1]])
  }
  if (bezierCache.size > 500) bezierCache.delete(bezierCache.keys().next().value!)
  bezierCache.set(key, pts)
  return pts
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

function DeselectHandler({ onDeselect, skipRef }: {
  onDeselect: () => void
  skipRef: React.RefObject<boolean>
}) {
  useMapEvent("click", () => {
    if (skipRef.current) { skipRef.current = false; return }
    onDeselect()
  })
  return null
}

function CountryLabels({ centroids, connectionCount }: {
  centroids: Map<string, [number, number]>    // key = lower-case ADMIN name
  connectionCount: Map<string, number>
}) {
  const leafletMap = useMap()
  const markersRef = useRef<L.Marker[]>([])

  useEffect(() => {
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    for (const [name, center] of centroids) {
      if (!connectionCount.get(name)) continue
      const icon = L.divIcon({
        className: "country-label",
        html: `<span class="country-label-text">${name}</span>`,
        iconAnchor: [0, 0],
      })
      const marker = L.marker(center, { icon, interactive: false })
      marker.addTo(leafletMap)
      markersRef.current.push(marker)
    }
    return () => { markersRef.current.forEach(m => m.remove()); markersRef.current = [] }
  }, [centroids, connectionCount, leafletMap])

  return null
}

/* ── World GeoJSON loader (cached, one fetch ever) ─────────────────────── */

// Natural Earth via unpkg — all 241 countries/territories, ~3 MB, stable CDN
const WORLD_GEO_URL =
  "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson"

let _worldGeoPromise: Promise<GeoJSON.FeatureCollection> | null = null

function loadWorldGeo(): Promise<GeoJSON.FeatureCollection> {
  if (!_worldGeoPromise) {
    _worldGeoPromise = fetch(WORLD_GEO_URL)
      .then(r => {
        if (!r.ok) throw new Error(`Failed to load world GeoJSON: ${r.status}`)
        return r.json() as Promise<GeoJSON.FeatureCollection>
      })
      .catch(err => {
        _worldGeoPromise = null   // allow retry on next mount
        throw err
      })
  }
  return _worldGeoPromise
}

/* ── Main component ─────────────────────────────────────────────────────── */

export function MapView({ nodes, edges, selectedNode, onSelectNode }: MapViewProps) {
  const [worldGeo, setWorldGeo] = useState<GeoJSON.FeatureCollection | null>(null)
  const [geoError, setGeoError] = useState(false)
  const [loading, setLoading] = useState(true)
  const skipDeselectRef = useRef(false)

  // Load full world GeoJSON once
  useEffect(() => {
    loadWorldGeo()
      .then(geo => { setWorldGeo(geo); setLoading(false) })
      .catch(() => { setGeoError(true); setLoading(false) })
  }, [])

  /* ── Derived data from graph nodes ── */

  const countryNodes = useMemo(
    () => nodes.filter(n => n.props.type === "Country"),
    [nodes]
  )
  const nonCountryNodes = useMemo(
    () => nodes.filter(n => n.props.type !== "Country"),
    [nodes]
  )

  // nodeId → node map
  const nodeById = useMemo(() => {
    const m = new Map<string | number, GraphNode>()
    nodes.forEach(n => m.set(n.id, n))
    return m
  }, [nodes])

  // Graph country name (normalised lower) → node
  const graphCountryMap = useMemo(() => {
    const m = new Map<string, GraphNode>()
    countryNodes.forEach(n => {
      if (n.props.name) m.set(normalizeCountryName(n.props.name).toLowerCase(), n)
    })
    return m
  }, [countryNodes])

  /* ── Centroids from world GeoJSON ── */

  // Maps lower-case ADMIN name → centroid [lat, lng]
  const worldCentroids = useMemo(() => {
    const m = new Map<string, [number, number]>()
    if (!worldGeo) return m
    for (const feature of worldGeo.features) {
      const admin: string = feature.properties?.ADMIN ?? feature.properties?.name ?? ""
      if (!admin) continue
      const c = getCentroid(feature)
      if (c) m.set(admin.toLowerCase(), c)
    }
    return m
  }, [worldGeo])

  /* ── Adjacency list for BFS positioning ── */

  const adjacency = useMemo(() => {
    const adj = new Map<string | number, (string | number)[]>()
    for (const e of edges) {
      ;(adj.get(e.from) ?? (adj.set(e.from, []), adj.get(e.from)!)).push(e.to)
      ;(adj.get(e.to)   ?? (adj.set(e.to,   []), adj.get(e.to)!)).push(e.from)
    }
    return adj
  }, [edges])

  /* ── BFS: assign lat/lng to every graph node ── */

  const nodePositions = useMemo(() => {
    const pos = new Map<string | number, [number, number]>()

    // Seed with country centroids from world GeoJSON
    for (const cn of countryNodes) {
      if (!cn.props.name) continue
      const key = normalizeCountryName(cn.props.name).toLowerCase()
      const c = worldCentroids.get(key)
      if (c) pos.set(cn.id, c)
    }

    // BFS outward from seeded nodes
    const queue: (string | number)[] = [...pos.keys()]
    const visited = new Set<string | number>(pos.keys())

    while (queue.length > 0) {
      const cur = queue.shift()!
      const curPos = pos.get(cur)!
      for (const nb of adjacency.get(cur) ?? []) {
        if (visited.has(nb)) continue
        visited.add(nb)
        const h = stringHash(String(nb))
        const latOff = (((h * 7)  % 40) - 20) * 0.5
        const lngOff = (((h * 13) % 50) - 25) * 0.7
        pos.set(nb, [
          Math.max(-80, Math.min(80, curPos[0] + latOff)),
          curPos[1] + lngOff,
        ])
        queue.push(nb)
      }
    }

    return pos
  }, [countryNodes, worldCentroids, adjacency])

  /* ── Country connection count (for polygon colour) ── */

  const countryConnCount = useMemo(() => {
    const m = new Map<string, number>()          // key = lower ADMIN name
    for (const e of edges) {
      const fn = nodeById.get(e.from)
      const tn = nodeById.get(e.to)
      for (const n of [fn, tn]) {
        if (n?.props.type === "Country" && n.props.name) {
          const k = normalizeCountryName(n.props.name).toLowerCase()
          m.set(k, (m.get(k) ?? 0) + 1)
        }
      }
    }
    return m
  }, [edges, nodeById])

  const getCountryFill = useCallback((adminLower: string, isGraphNode: boolean, isSelected: boolean) => {
    if (isSelected)    return { fill: "#60a5fa", opacity: 0.65, stroke: "#60a5fa", weight: 2.5 }
    if (!isGraphNode)  return { fill: "#1e293b", opacity: 0.45, stroke: "#334155", weight: 0.4 }
    const cnt = countryConnCount.get(adminLower) ?? 0
    const fill = cnt >= 10 ? "#ef4444" : cnt >= 6 ? "#f97316" : cnt >= 3 ? "#eab308" : "#66bb6a"
    return { fill, opacity: 0.3, stroke: fill, weight: 1.2 }
  }, [countryConnCount])

  /* ── Selected node arcs ONLY ── */

  const selectedId = selectedNode?.id ?? null

  const selectedArcs = useMemo(() => {
    if (selectedId === null) return []
    type Arc = {
      points: [number, number][]
      label: string; fromId: string | number; toId: string | number
      fromName: string; toName: string; color: string
    }
    const arcs: Arc[] = []
    for (const e of edges) {
      if (e.from !== selectedId && e.to !== selectedId) continue
      const fp = nodePositions.get(e.from)
      const tp = nodePositions.get(e.to)
      if (!fp || !tp) continue
      const fn = nodeById.get(e.from)
      const tn = nodeById.get(e.to)
      const etype = (e.props?.type as string) || e.type || ""
      arcs.push({
        points: bezierArc(fp, tp, 60),
        label: etype,
        fromId: e.from, toId: e.to,
        fromName: fn?.props.name ?? String(e.from),
        toName:   tn?.props.name ?? String(e.to),
        color: arcColor(etype, !!e.props?.causal),
      })
    }
    return arcs
  }, [edges, selectedId, nodePositions, nodeById])

  /* ── Handlers ── */

  const handleNodeClick = useCallback((node: GraphNode) => {
    skipDeselectRef.current = true
    onSelectNode({
      id: node.id,
      fullLabel: node.props.name ?? String(node.id),
      nodeLabel: node.labels[0] ?? "Entity",
      entityType: node.props.type ?? "Entity",
      degree: node.degree ?? 0,
      props: node.props,
      sources: node.sources ?? [],
    })
  }, [onSelectNode])

  const handleDeselect = useCallback(() => onSelectNode(null), [onSelectNode])

  /* ── Render ── */

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex items-center gap-2 rounded-lg bg-black/80 px-4 py-3 text-sm text-sky-400">
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
          Loading world map…
        </div>
      </div>
    )
  }

  if (geoError || !worldGeo) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
        Failed to load world map. Check your internet connection.
      </div>
    )
  }

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      minZoom={2}
      maxBounds={[[-85, -270], [85, 270]]}
      maxBoundsViscosity={1.0}
      scrollWheelZoom
      dragging
      className="h-full w-full"
      style={{ background: "#0a0a0a" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <DeselectHandler onDeselect={handleDeselect} skipRef={skipDeselectRef} />

      {/* ── All world countries (base layer) ── */}
      <GeoJSON
        key={`world-base-${selectedId ?? "none"}`}
        data={worldGeo}
        style={(feature) => {
          const admin: string = (feature?.properties?.ADMIN ?? feature?.properties?.name ?? "").toLowerCase()
          const graphNode = graphCountryMap.get(admin)
          const isGraphNode = !!graphNode
          const isSelected = isGraphNode && graphNode!.id === selectedId
          const s = getCountryFill(admin, isGraphNode, isSelected)
          return {
            fillColor: s.fill,
            fillOpacity: s.opacity,
            color: s.stroke,
            weight: s.weight,
            opacity: 1,
          }
        }}
        onEachFeature={(feature: GeoJSON.Feature, layer: Layer) => {
          const admin: string = feature.properties?.ADMIN ?? feature.properties?.name ?? "Unknown"
          const adminLower = admin.toLowerCase()
          const graphNode = graphCountryMap.get(adminLower)
          const cnt = countryConnCount.get(adminLower) ?? 0

          layer.bindTooltip(
            graphNode
              ? `<b>${admin}</b><br/><span style="font-size:11px;opacity:0.7">${cnt} connection${cnt !== 1 ? "s" : ""} in graph</span>`
              : admin,
            { sticky: true, className: "map-country-tooltip" }
          )

          layer.on("click", (e: LeafletMouseEvent) => {
            DomEvent.stopPropagation(e.originalEvent)
            if (graphNode) {
              handleNodeClick(graphNode)
            }
          })
        }}
      />

      {/* ── Country name labels (only for graph countries with connections) ── */}
      <CountryLabels centroids={worldCentroids} connectionCount={countryConnCount} />

      {/* ── Graph country centroid markers (pulse ring on top of polygon) ── */}
      {countryNodes.map(node => {
        const pos = nodePositions.get(node.id)
        if (!pos) return null
        const isSelected = node.id === selectedId
        const col = entityColor("Country")
        return (
          <CircleMarker
            key={`cn-${node.id}`}
            center={pos}
            radius={isSelected ? 10 : 6}
            pathOptions={{
              color: col, fillColor: col,
              fillOpacity: isSelected ? 1 : 0.55,
              weight: isSelected ? 3 : 1.5, opacity: 1,
            }}
            eventHandlers={{
              click: (e: LeafletMouseEvent) => {
                DomEvent.stopPropagation(e.originalEvent)
                handleNodeClick(node)
              },
            }}
          >
            <Tooltip sticky className="map-country-tooltip">
              <span className="font-semibold">{node.props.name}</span><br />
              <span className="text-xs opacity-70">Country · {node.degree ?? 0} connections</span>
            </Tooltip>
          </CircleMarker>
        )
      })}

      {/* ── Non-country entity markers ── */}
      {nonCountryNodes.map(node => {
        const pos = nodePositions.get(node.id)
        if (!pos) return null
        const isSelected = node.id === selectedId
        const isConnected = selectedId !== null &&
          edges.some(e => (e.from === selectedId && e.to === node.id) || (e.to === selectedId && e.from === node.id))
        const col = entityColor(node.props.type)
        const radius = isSelected ? 8 : isConnected ? 6 : 4
        const fillOp = isSelected ? 1 : isConnected ? 0.9 : selectedId !== null ? 0.25 : 0.7
        return (
          <CircleMarker
            key={`nc-${node.id}`}
            center={pos}
            radius={radius}
            pathOptions={{
              color: col, fillColor: col,
              fillOpacity: fillOp,
              weight: isSelected ? 2 : 1, opacity: 1,
            }}
            eventHandlers={{
              click: (e: LeafletMouseEvent) => {
                DomEvent.stopPropagation(e.originalEvent)
                handleNodeClick(node)
              },
            }}
          >
            <Tooltip sticky className="map-country-tooltip">
              <span className="font-semibold">{node.props.name ?? "Unknown"}</span><br />
              <span className="text-xs opacity-70">{node.props.type ?? "Entity"} · {node.degree ?? 0} connections</span>
            </Tooltip>
          </CircleMarker>
        )
      })}

      {/* ── Selected node arcs ONLY ── */}
      {selectedArcs.map((arc, i) => (
        <React.Fragment key={`arc-${i}`}>
          {/* Glow */}
          <Polyline
            positions={arc.points}
            pathOptions={{ color: arc.color, weight: 12, opacity: 0.15, lineCap: "round" }}
            className="arc-glow"
          />
          {/* Animated dash */}
          <Polyline
            positions={arc.points}
            pathOptions={{ color: arc.color, weight: 2.5, opacity: 0.9, dashArray: "8, 6", lineCap: "round" }}
            className="arc-animated"
          >
            <Tooltip sticky>
              <span className="font-semibold">{arc.fromName} → {arc.toName}</span>
              {arc.label ? <><br /><span style={{ color: arc.color }}>{arc.label}</span></> : ""}
            </Tooltip>
          </Polyline>
          {/* Endpoint dots */}
          <CircleMarker center={arc.points[0]} radius={4}
            pathOptions={{ color: arc.color, fillColor: arc.color, fillOpacity: 1, weight: 0 }} />
          <CircleMarker center={arc.points[arc.points.length - 1]} radius={4}
            pathOptions={{ color: arc.color, fillColor: arc.color, fillOpacity: 1, weight: 0 }} />
        </React.Fragment>
      ))}
    </MapContainer>
  )
}
