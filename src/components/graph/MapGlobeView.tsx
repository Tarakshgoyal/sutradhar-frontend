import { MapView } from "./MapView"
import { GlobeView } from "./GlobeView"
import type { GraphNode, GraphEdge } from "@/lib/api"
import type { SelectedNode } from "./GraphInfoPanel"

interface MapGlobeViewProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  selectedNode: SelectedNode | null
  onSelectNode: (node: SelectedNode | null) => void
  viewMode: "2d" | "3d"
  onViewModeChange: (mode: "2d" | "3d") => void
}

export function MapGlobeView({ nodes, edges, selectedNode, onSelectNode, viewMode, onViewModeChange }: MapGlobeViewProps) {

  return (
    <div className="relative h-full w-full">
      {/* Toggle button - Hidden since it's now in main toolbar */}
      {/* Keeping component structure for potential future use */}

      {/* 2D Map View */}
      {viewMode === "2d" && (
        <MapView
          nodes={nodes}
          edges={edges}
          selectedNode={selectedNode}
          onSelectNode={onSelectNode}
        />
      )}

      {/* 3D Globe View */}
      {viewMode === "3d" && (
        <GlobeView
          nodes={nodes}
          edges={edges}
          selectedNode={selectedNode}
          onSelectNode={onSelectNode}
        />
      )}
    </div>
  )
}
