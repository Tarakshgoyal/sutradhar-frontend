
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Search, SlidersHorizontal, MessageSquare, MessageSquareOff, Map, Network } from "lucide-react"
import { ENTITY_TYPES, DATE_RANGES } from "@/lib/constants"

export interface GraphFilters {
    search: string
    entityType: string
    limit: number
    minConnections: number
    dateRange: string
}

export type ViewMode = "graph" | "map"

interface GraphToolbarProps {
    filters: GraphFilters
    onFiltersChange: (filters: GraphFilters) => void
    onApply: () => void
    chatOpen: boolean
    onChatToggle: () => void
    viewMode: ViewMode
    onViewModeChange: (mode: ViewMode) => void
}

export function GraphToolbar({
    filters,
    onFiltersChange,
    onApply,
    chatOpen,
    onChatToggle,
    viewMode,
    onViewModeChange,
}: GraphToolbarProps) {
    const update = (patch: Partial<GraphFilters>) =>
        onFiltersChange({ ...filters, ...patch })

    return (
        <div className="fixed inset-x-0 top-0 z-20 flex flex-wrap items-center gap-3 border-b border-white/10 bg-black/95 px-5 py-2.5 backdrop-blur-xl">
            {/* Search */}
            <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <Input
                    id="graph-search"
                    placeholder="Entity name..."
                    value={filters.search}
                    onChange={(e) => update({ search: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && onApply()}
                    className="h-8 w-44 border-white/10 bg-white/5 text-xs"
                />
            </div>

            <Separator orientation="vertical" className="h-6 bg-white/10" />

            {/* Entity Type */}
            <div className="flex items-center gap-2">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Type
                </label>
                <Select
                    value={filters.entityType}
                    onValueChange={(v) => update({ entityType: v === "_all" ? "" : v })}
                >
                    <SelectTrigger className="h-8 w-36 border-white/10 bg-white/5 text-xs">
                        <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="_all">All Types</SelectItem>
                        {ENTITY_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                                {t.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Separator orientation="vertical" className="h-6 bg-white/10" />

            {/* Node Limit Slider */}
            <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Nodes
                </label>
                <Slider
                    id="limit-slider"
                    min={20}
                    max={500}
                    step={10}
                    value={[filters.limit]}
                    onValueChange={([v]) => update({ limit: v })}
                    className="w-24"
                />
                <span className="min-w-[2rem] text-xs font-medium text-sky-400">
                    {filters.limit}
                </span>
            </div>

            <Separator orientation="vertical" className="h-6 bg-white/10" />

            {/* Min Connections Slider */}
            <div className="flex items-center gap-2">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Min Conn
                </label>
                <Slider
                    id="min-conn-slider"
                    min={0}
                    max={10}
                    step={1}
                    value={[filters.minConnections]}
                    onValueChange={([v]) => update({ minConnections: v })}
                    className="w-24"
                />
                <span className="min-w-[2rem] text-xs font-medium text-sky-400">
                    {filters.minConnections}
                </span>
            </div>

            <Separator orientation="vertical" className="h-6 bg-white/10" />

            {/* Date Range */}
            <div className="flex items-center gap-2">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Time
                </label>
                <Select
                    value={filters.dateRange}
                    onValueChange={(v) => update({ dateRange: v })}
                >
                    <SelectTrigger className="h-8 w-32 border-white/10 bg-white/5 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {DATE_RANGES.map((d) => (
                            <SelectItem key={d.value} value={d.value}>
                                {d.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Separator orientation="vertical" className="h-6 bg-white/10" />

            <Button size="sm" onClick={onApply} className="h-8 text-xs">
                Apply
            </Button>

            <Separator orientation="vertical" className="h-6 bg-white/10" />

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 p-0.5">
                <button
                    onClick={() => onViewModeChange("graph")}
                    className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] transition-colors ${
                        viewMode === "graph"
                            ? "bg-sky-500/20 text-sky-400"
                            : "text-muted-foreground hover:text-white"
                    }`}
                >
                    <Network className="h-3 w-3" />
                    Graph
                </button>
                <button
                    onClick={() => onViewModeChange("map")}
                    className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] transition-colors ${
                        viewMode === "map"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "text-muted-foreground hover:text-white"
                    }`}
                >
                    <Map className="h-3 w-3" />
                    Map
                </button>
            </div>

            <Button
                variant={chatOpen ? "secondary" : "ghost"}
                size="sm"
                onClick={onChatToggle}
                className="ml-auto flex h-8 items-center gap-1.5 text-xs"
            >
                {chatOpen ? (
                    <MessageSquareOff className="h-3.5 w-3.5" />
                ) : (
                    <MessageSquare className="h-3.5 w-3.5" />
                )}
                Chat
            </Button>
        </div>
    )
}
