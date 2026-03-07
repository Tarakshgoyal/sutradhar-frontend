
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
import { Search, SlidersHorizontal, MessageSquare, MessageSquareOff, Map, Network, Clock, Bell } from "lucide-react"
import { useEffect, useState } from "react"
import { ENTITY_TYPES, DATE_RANGES } from "@/lib/constants"
import { fetchSignals } from "@/lib/api"

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

function UtcClock() {
    const [time, setTime] = useState(() => new Date().toUTCString().slice(17, 25))
    useEffect(() => {
        const id = setInterval(() => setTime(new Date().toUTCString().slice(17, 25)), 1000)
        return () => clearInterval(id)
    }, [])
    return (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
            <Clock className="h-3 w-3" />
            <span className="text-white/70">{time}</span>
            <span className="text-[10px] text-muted-foreground/60">UTC</span>
        </div>
    )
}

function SignalsBadge() {
    const [count, setCount] = useState(0)
    useEffect(() => {
        fetchSignals({ severity: "high", limit: 200 })
            .then((d) => setCount(d.count))
            .catch(() => {})
        const id = setInterval(() => {
            fetchSignals({ severity: "high", limit: 200 })
                .then((d) => setCount(d.count))
                .catch(() => {})
        }, 60_000)
        return () => clearInterval(id)
    }, [])
    if (count === 0) return null
    return (
        <div className="flex items-center gap-1 text-[11px]">
            <Bell className="h-3 w-3 text-red-400" />
            <span className="rounded-full bg-red-500/80 px-1.5 text-[9px] font-bold text-white tabular-nums">
                {count}
            </span>
        </div>
    )
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
        <div className="fixed inset-x-0 top-0 z-20 flex items-center gap-2 border-b border-white/10 bg-black/95 px-3 py-2 backdrop-blur-xl overflow-x-auto">
            {/* Search */}
            <div className="flex items-center gap-1.5">
                <Search className="h-3 w-3 shrink-0 text-muted-foreground" />
                <Input
                    id="graph-search"
                    placeholder="Entity..."
                    value={filters.search}
                    onChange={(e) => update({ search: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && onApply()}
                    className="h-7 w-28 border-white/10 bg-white/5 text-xs"
                />
            </div>

            <Separator orientation="vertical" className="h-5 bg-white/10" />

            {/* Entity Type */}
            <Select
                value={filters.entityType}
                onValueChange={(v) => update({ entityType: v === "_all" ? "" : v })}
            >
                <SelectTrigger className="h-7 w-28 border-white/10 bg-white/5 text-xs">
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

            <Separator orientation="vertical" className="h-5 bg-white/10" />

            {/* Node Limit Slider */}
            <div className="flex items-center gap-1.5">
                <SlidersHorizontal className="h-3 w-3 shrink-0 text-muted-foreground" />
                <Slider
                    id="limit-slider"
                    min={20}
                    max={500}
                    step={10}
                    value={[filters.limit]}
                    onValueChange={([v]) => update({ limit: v })}
                    className="w-16"
                />
                <span className="w-7 text-right text-[11px] font-medium text-sky-400 tabular-nums">
                    {filters.limit}
                </span>
            </div>

            <Separator orientation="vertical" className="h-5 bg-white/10" />

            {/* Min Connections Slider */}
            <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Conn</span>
                <Slider
                    id="min-conn-slider"
                    min={0}
                    max={10}
                    step={1}
                    value={[filters.minConnections]}
                    onValueChange={([v]) => update({ minConnections: v })}
                    className="w-16"
                />
                <span className="w-4 text-right text-[11px] font-medium text-sky-400 tabular-nums">
                    {filters.minConnections}
                </span>
            </div>

            <Separator orientation="vertical" className="h-5 bg-white/10" />

            {/* Date Range */}
            <Select
                value={filters.dateRange}
                onValueChange={(v) => update({ dateRange: v })}
            >
                <SelectTrigger className="h-7 w-24 border-white/10 bg-white/5 text-xs">
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

            <Separator orientation="vertical" className="h-5 bg-white/10" />

            <Button size="sm" onClick={onApply} className="h-7 px-2.5 text-xs">
                Apply
            </Button>

            <Separator orientation="vertical" className="h-6 bg-white/10" />

            {/* View Mode Toggle */}
            <div className="flex items-center gap-0.5 rounded-md border border-white/10 bg-white/5 p-0.5">
                <button
                    onClick={() => onViewModeChange("graph")}
                    className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] transition-colors ${
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
                    className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] transition-colors ${
                        viewMode === "map"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "text-muted-foreground hover:text-white"
                    }`}
                >
                    <Map className="h-3 w-3" />
                    Map
                </button>
            </div>

            <div className="ml-auto flex items-center gap-2">
                <SignalsBadge />
                <Separator orientation="vertical" className="h-5 bg-white/10" />
                <UtcClock />
                <Separator orientation="vertical" className="h-5 bg-white/10" />
                <Button
                    variant={chatOpen ? "secondary" : "ghost"}
                    size="sm"
                    onClick={onChatToggle}
                    className="flex h-7 items-center gap-1.5 px-2.5 text-xs"
                >
                    {chatOpen ? (
                        <MessageSquareOff className="h-3 w-3" />
                    ) : (
                        <MessageSquare className="h-3 w-3" />
                    )}
                    Chat
                </Button>
            </div>
        </div>
    )
}
