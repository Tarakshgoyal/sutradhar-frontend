import React, { useEffect, useState, useMemo, useCallback, useRef } from "react"
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Polyline,
  Tooltip,
  CircleMarker,
  useMap,
  useMapEvent,
} from "react-leaflet"
import { DomEvent } from "leaflet"
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

/* ── helpers ── */

/** Map common country display names to world-geojson file keys */
const NAME_ALIASES: Record<string, string> = {
  "united states": "usa",
  "united states of america": "usa",
  "u.s.a.": "usa",
  "u.s.": "usa",
  "czech republic": "czechia",
  "ivory coast": "ivory_coast",
  "côte d'ivoire": "ivory_coast",
  "democratic republic of the congo": "democratic_congo",
  "dr congo": "democratic_congo",
  "republic of the congo": "congo",
  "east timor": "east_timor",
  "timor-leste": "east_timor",
  "north macedonia": "north_macedonia",
  "south korea": "south_korea",
  "north korea": "north_korea",
  "cape verde": "cape_verde",
  "cabo verde": "cape_verde",
  "eswatini": "eswatini",
  "swaziland": "eswatini",
  "myanmar": "myanmar",
  "burma": "myanmar",
  "u.k.": "united_kingdom",
  "uk": "united_kingdom",
  "uae": "united_arab_emirates",
}

/** Convert country name to the filename key used by world-geojson */
function toFileKey(name: string): string {
  const lower = name.toLowerCase().trim()
  if (NAME_ALIASES[lower]) return NAME_ALIASES[lower]
  return lower
    .replace(/&/g, "and")
    .replace(/\./g, "")
    .replace(/ /g, "_")
}

/** Fix antimeridian crossing (e.g. Russia's Chukotka at ~-170° vs main body at ~100°E) */
function fixAntimeridian(data: GeoJSON.FeatureCollection): GeoJSON.FeatureCollection {
  const clone = JSON.parse(JSON.stringify(data)) as GeoJSON.FeatureCollection
  let sumLng = 0, cnt = 0
  function collectLngs(c: unknown) {
    if (!Array.isArray(c)) return
    if (typeof c[0] === "number") { sumLng += c[0] as number; cnt++ }
    else (c as unknown[]).forEach(collectLngs)
  }
  for (const f of clone.features) {
    const g = f.geometry as { coordinates?: unknown }
    if (g?.coordinates) collectLngs(g.coordinates)
  }
  if (cnt === 0) return clone
  const ref = sumLng / cnt
  function normLng(lng: number): number {
    while (lng - ref > 180) lng -= 360
    while (ref - lng > 180) lng += 360
    return lng
  }
  function fixCoords(c: unknown): unknown {
    if (!Array.isArray(c)) return c
    if (typeof c[0] === "number") return [normLng(c[0] as number), c[1]]
    return (c as unknown[]).map(fixCoords)
  }
  for (const f of clone.features) {
    const g = f.geometry as { coordinates?: unknown }
    if (g?.coordinates) g.coordinates = fixCoords(g.coordinates)
  }
  return clone
}

/** Dynamically import a country GeoJSON from world-geojson */
async function loadCountryGeo(
  name: string
): Promise<GeoJSON.FeatureCollection | null> {
  const key = toFileKey(name)
  try {
    const mod = await import(
      /* @vite-ignore */ `../../../node_modules/world-geojson/countries/${key}.json`
    )
    let data = mod.default || mod
    if (data?.features) {
      for (const f of data.features) {
        f.properties = { ...f.properties, name }
      }
      data = fixAntimeridian(data as GeoJSON.FeatureCollection)
    }
    return data as GeoJSON.FeatureCollection
  } catch {
    console.warn(`No GeoJSON found for "${name}" (key: "${key}")`)
    return null
  }
}

/** Get bounding-box centroid of a GeoJSON feature */
function getCentroid(feature: GeoJSON.Feature): [number, number] | null {
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180
  let count = 0
  function walk(coords: unknown) {
    if (!Array.isArray(coords)) return
    if (typeof coords[0] === "number" && typeof coords[1] === "number") {
      const [lng, lat] = coords as [number, number]
      minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat)
      minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng)
      count++
    } else { for (const c of coords) walk(c) }
  }
  if (feature.geometry && "coordinates" in feature.geometry) walk(feature.geometry.coordinates)
  if (count === 0) return null
  return [(minLat + maxLat) / 2, (minLng + maxLng) / 2]
}

/** Quadratic bezier arc between two [lat, lng] points on a 2D map */
function bezierArc(from: [number, number], to: [number, number], n = 60): [number, number][] {
  const midLat = (from[0] + to[0]) / 2
  const midLng = (from[1] + to[1]) / 2
  const dLat = to[0] - from[0]
  const dLng = to[1] - from[1]
  const dist = Math.sqrt(dLat * dLat + dLng * dLng)
  // Perpendicular offset for curvature (scale with distance)
  const bulge = dist * 0.25
  // Offset perpendicular to the line (rotate 90°: [-dLng, dLat] normalized)
  const len = dist || 1
  const cpLat = midLat + (-dLng / len) * bulge
  const cpLng = midLng + (dLat / len) * bulge
  const pts: [number, number][] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const u = 1 - t
    const lat = u * u * from[0] + 2 * u * t * cpLat + t * t * to[0]
    const lng = u * u * from[1] + 2 * u * t * cpLng + t * t * to[1]
    pts.push([lat, lng])
  }
  return pts
}

/* ── sub-components ── */

function DeselectHandler({ onDeselect, skipRef }: { onDeselect: () => void; skipRef: React.RefObject<boolean> }) {
  useMapEvent("click", () => {
    if (skipRef.current) { skipRef.current = false; return }
    onDeselect()
  })
  return null
}

function MapFlyHandler({ selectedCenter }: { selectedCenter: [number, number] | null }) {
  const map = useMap()
  const prevCenter = useRef<[number, number] | null>(null)
  useEffect(() => {
    if (selectedCenter) {
      prevCenter.current = selectedCenter
      map.flyTo(selectedCenter, 5, { duration: 1.2 })
    } else if (prevCenter.current) {
      // Was selected, now deselected → zoom back out
      prevCenter.current = null
      map.flyTo([20, 0], 2, { duration: 1.2 })
    }
  }, [selectedCenter, map])
  return null
}

/* ── main component ── */

export function MapView({ nodes, edges, selectedNode, onSelectNode }: MapViewProps) {
  const [geoByCountry, setGeoByCountry] = useState<Map<string, GeoJSON.FeatureCollection>>(new Map())
  const [loading, setLoading] = useState(true)
  const skipDeselectRef = useRef(false)

  const countryNodes = useMemo(() => nodes.filter((n) => n.props.type === "Country"), [nodes])
  const countryNames = useMemo(() => countryNodes.map((n) => n.props.name || "").filter(Boolean), [countryNodes])

  const nodeIdToName = useMemo(() => {
    const m = new Map<string | number, string>()
    countryNodes.forEach((n) => { if (n.props.name) m.set(n.id, n.props.name) })
    return m
  }, [countryNodes])

  const countryEdges = useMemo(() => {
    const ids = new Set(countryNodes.map((n) => n.id))
    return edges.filter((e) => ids.has(e.from) && ids.has(e.to))
  }, [countryNodes, edges])

  // Load GeoJSON from world-geojson package (local, no API call)
  useEffect(() => {
    if (countryNames.length === 0) { setLoading(false); return }
    setLoading(true)
    Promise.all(
      countryNames.map(async (name) => [name, await loadCountryGeo(name)] as const)
    ).then((results) => {
      const m = new Map<string, GeoJSON.FeatureCollection>()
      for (const [name, geo] of results) { if (geo) m.set(name.toLowerCase(), geo) }
      setGeoByCountry(m)
      setLoading(false)
    })
  }, [countryNames])

  // Centroids
  const countryCentroids = useMemo(() => {
    const m = new Map<string, [number, number]>()
    for (const [name, fc] of geoByCountry) {
      if (fc.features.length > 0) {
        const c = getCentroid(fc.features[0])
        if (c) m.set(name, c)
      }
    }
    return m
  }, [geoByCountry])

  // Arc lines
  const connectionArcs = useMemo(() => {
    const arcs: { points: [number, number][]; label: string; fromName: string; toName: string }[] = []
    for (const edge of countryEdges) {
      const fromName = nodeIdToName.get(edge.from)
      const toName = nodeIdToName.get(edge.to)
      if (!fromName || !toName) continue
      const fromC = countryCentroids.get(fromName.toLowerCase())
      const toC = countryCentroids.get(toName.toLowerCase())
      if (fromC && toC) {
        arcs.push({
          points: bezierArc(fromC, toC, 60),
          label: (edge.props?.type as string) || edge.type || "",
          fromName, toName,
        })
      }
    }
    return arcs
  }, [countryEdges, nodeIdToName, countryCentroids])

  const selectedCountryName = selectedNode?.entityType === "Country"
    ? selectedNode.fullLabel.toLowerCase()
    : null

  const handleCountryClick = useCallback((countryName: string) => {
    skipDeselectRef.current = true
    const gn = countryNodes.find((n) => (n.props.name || "").toLowerCase() === countryName.toLowerCase())
    if (!gn) return
    onSelectNode({
      id: gn.id,
      fullLabel: gn.props.name || countryName,
      nodeLabel: gn.labels[0] || "Entity",
      entityType: gn.props.type || "Country",
      degree: gn.degree || 0,
      props: gn.props,
      sources: gn.sources || [],
    })
    const c = countryCentroids.get(countryName.toLowerCase())
    if (c) { /* MapFlyHandler will pick up the change via selectedNode */ }
  }, [countryNodes, countryCentroids, onSelectNode])

  const handleDeselect = useCallback(() => {
    onSelectNode(null)
  }, [onSelectNode])

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex items-center gap-2 rounded-lg bg-black/80 px-4 py-3 text-sm text-sky-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading map…
        </div>
      </div>
    )
  }

  if (countryNames.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
        No country entities in current graph data.
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
      scrollWheelZoom={true}
      dragging={true}
      className="h-full w-full"
      style={{ background: "#0a0a0a" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <DeselectHandler onDeselect={handleDeselect} skipRef={skipDeselectRef} />
      <MapFlyHandler selectedCenter={selectedCountryName ? (countryCentroids.get(selectedCountryName) ?? null) : null} />

      {/* Country boundaries — dim by default, highlighted when selected */}
      {countryNames.map((name) => {
        const key = name.toLowerCase()
        const geo = geoByCountry.get(key)
        if (!geo) return null
        const isSelected = selectedCountryName === key
        return (
          <GeoJSON
            key={key + (isSelected ? "-sel" : "")}
            data={geo}
            style={() => isSelected
              ? { fillColor: "#66bb6a", fillOpacity: 0.4, color: "#66bb6a", weight: 3, opacity: 1 }
              : { fillColor: "#4fc3f7", fillOpacity: 0.08, color: "#4fc3f7", weight: 1, opacity: 0.35 }
            }
            eventHandlers={{
              click: (e: LeafletMouseEvent) => {
                DomEvent.stopPropagation(e.originalEvent)
                handleCountryClick(name)
              },
            }}
            onEachFeature={(_feature: GeoJSON.Feature, layer: Layer) => {
              layer.bindTooltip(name, { sticky: true, className: "map-country-tooltip" })
            }}
          />
        )
      })}

      {/* Connection arcs */}
      {connectionArcs.map((arc, i) => (
        <React.Fragment key={i}>
          <Polyline
            positions={arc.points}
            pathOptions={{ color: "#ff6f61", weight: 5, opacity: 0.15, lineCap: "round", lineJoin: "round" }}
          />
          <Polyline
            positions={arc.points}
            pathOptions={{ color: "#ff6f61", weight: 2, opacity: 0.85, dashArray: "8, 6", lineCap: "round", lineJoin: "round", className: "animated-arc" }}
          >
            <Tooltip sticky>
              {arc.fromName} → {arc.toName}
              {arc.label ? ` (${arc.label})` : ""}
            </Tooltip>
          </Polyline>
          <CircleMarker center={arc.points[0]} radius={4}
            pathOptions={{ color: "#ff6f61", fillColor: "#ff6f61", fillOpacity: 0.9, weight: 1 }} />
          <CircleMarker center={arc.points[arc.points.length - 1]} radius={4}
            pathOptions={{ color: "#ff6f61", fillColor: "#ff6f61", fillOpacity: 0.9, weight: 1 }} />
        </React.Fragment>
      ))}
    </MapContainer>
  )
}
