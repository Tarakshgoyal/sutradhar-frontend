import { useState, useEffect, useRef, useCallback } from "react"
import { Play, Pause, FastForward, Rewind, Calendar as CalendarIcon, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"

const PRESETS = [
    { label: "1H", hours: 1 },
    { label: "6H", hours: 6 },
    { label: "24H", hours: 24 },
    { label: "7D", hours: 168 },
]

interface TimeSliderProps {
    onTimeChange?: (isoDate: string | null) => void
    disabled?: boolean
}

function progressToDate(progress: number, windowHours: number): Date {
    const msAgo = ((100 - progress) / 100) * windowHours * 3_600_000
    return new Date(Date.now() - msAgo)
}

function formatLabel(progress: number, windowHours: number): string {
    if (progress >= 100) return "LIVE"
    const date = progressToDate(progress, windowHours)
    const diffMs = Date.now() - date.getTime()
    const diffMin = Math.floor(diffMs / 60_000)
    const diffH = Math.floor(diffMin / 60)
    const diffD = Math.floor(diffH / 24)
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffH < 24) return `${diffH}h ago`
    return `${diffD}d ago`
}

function formatDateLabel(progress: number, windowHours: number): string {
    if (progress >= 100) return "NOW"
    const d = progressToDate(progress, windowHours)
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

export function TimeSlider({ onTimeChange, disabled = false }: TimeSliderProps) {
    const [windowHours, setWindowHours] = useState(24)
    const [progress, setProgress] = useState(100)
    const [committedProgress, setCommittedProgress] = useState(100)
    const [isPlaying, setIsPlaying] = useState(false)
    const [customDate, setCustomDate] = useState("")

    const playRef = useRef<NodeJS.Timeout | null>(null)
    const onTimeChangeRef = useRef(onTimeChange)
    useEffect(() => { onTimeChangeRef.current = onTimeChange }, [onTimeChange])

    // Fire API only when committedProgress changes (slider released)
    useEffect(() => {
        if (disabled) return
        if (committedProgress >= 100) {
            onTimeChangeRef.current?.(null)
        } else {
            const date = progressToDate(committedProgress, windowHours)
            const iso = date.toISOString().split("T")[0]
            onTimeChangeRef.current?.(iso)
        }
    }, [committedProgress, windowHours, disabled])

    // Playback: advance 1% every 600ms — no API call during play
    useEffect(() => {
        if (!isPlaying) {
            if (playRef.current) clearInterval(playRef.current)
            return
        }
        if (progress >= 100) { setIsPlaying(false); return }

        playRef.current = setInterval(() => {
            setProgress(prev => {
                const next = Math.min(100, prev + 1)
                if (next >= 100) {
                    setIsPlaying(false)
                    setCommittedProgress(100)
                }
                return next
            })
        }, 600)

        return () => { if (playRef.current) clearInterval(playRef.current) }
    }, [isPlaying, progress])

    const commit = useCallback((value: number) => {
        setCommittedProgress(value)
    }, [])

    const handlePreset = (hours: number) => {
        setWindowHours(hours)
        setProgress(0)
        setCommittedProgress(0)
        setCustomDate("")
        setIsPlaying(false)
    }

    const handleCustomDate = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setCustomDate(val)
        if (!val) return
        const target = new Date(val).getTime()
        const now = Date.now()
        const windowMs = windowHours * 3_600_000
        const raw = ((now - target) / windowMs) * 100
        const clamped = Math.max(0, Math.min(99, 100 - raw))
        setProgress(clamped)
        setCommittedProgress(clamped)
        setIsPlaying(false)
        onTimeChangeRef.current?.(val)
    }

    const handleRewind = () => {
        setIsPlaying(false)
        const next = Math.max(0, progress - 10)
        setProgress(next)
        commit(next)
    }

    const handleFastForward = () => {
        setIsPlaying(false)
        const next = Math.min(100, progress + 10)
        setProgress(next)
        commit(next)
    }

    const isLive = progress >= 100
    const label = formatLabel(progress, windowHours)
    const dateLabel = formatDateLabel(progress, windowHours)

    return (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
            {/* Time travel badge */}
            {!isLive && (
                <div className="bg-fuchsia-500/20 border border-fuchsia-500/30 rounded-full px-3 py-1 flex items-center gap-2">
                    <Clock className="h-3 w-3 text-fuchsia-400 animate-pulse" />
                    <span className="text-[10px] font-bold text-fuchsia-400 uppercase tracking-wider">
                        Time Machine — {dateLabel}
                    </span>
                </div>
            )}

            {/* Control bar */}
            <div className="w-[95vw] md:w-[720px] h-14 bg-black/85 border border-white/10 rounded-full backdrop-blur-md px-3 md:px-5 flex items-center gap-3 shadow-xl">

                {/* Playback controls */}
                <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 rounded-full hover:bg-white/10 text-muted-foreground hover:text-white"
                        onClick={handleRewind}
                        disabled={disabled || progress === 0}
                        title="Step back 10%"
                    >
                        <Rewind className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                        variant="secondary" size="icon"
                        className={`h-9 w-9 rounded-full transition-colors ${
                            isLive
                                ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                : "bg-fuchsia-500/20 text-fuchsia-400 hover:bg-fuchsia-500/30"
                        }`}
                        onClick={() => {
                            if (isLive) return
                            if (isPlaying) {
                                setIsPlaying(false)
                                commit(progress)
                            } else {
                                setIsPlaying(true)
                            }
                        }}
                        disabled={disabled || isLive}
                        title={isPlaying ? "Pause" : "Play time forward"}
                    >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                    </Button>

                    <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 rounded-full hover:bg-white/10 text-muted-foreground hover:text-white"
                        onClick={handleFastForward}
                        disabled={disabled || isLive}
                        title="Step forward 10%"
                    >
                        <FastForward className="h-3.5 w-3.5" />
                    </Button>
                </div>

                {/* Slider — native range input for reliable dragging */}
                <div className="flex-1 flex items-center gap-2 min-w-0">
                    <span className={`text-[11px] font-mono w-14 text-right shrink-0 ${isLive ? "text-emerald-400 font-bold" : "text-fuchsia-300"}`}>
                        {label}
                    </span>

                    <div className="flex-1 relative flex items-center">
                        {/* Track background */}
                        <div className="absolute inset-0 flex items-center pointer-events-none">
                            <div className="h-1 w-full rounded-full bg-white/10" />
                            <div
                                className={`absolute h-1 rounded-full ${isLive ? "bg-emerald-500" : "bg-fuchsia-500"}`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        {/* Native range input */}
                        <input
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            value={progress}
                            disabled={disabled}
                            onChange={e => {
                                setProgress(Number(e.target.value))
                                setIsPlaying(false)
                            }}
                            onMouseUp={e => commit(Number((e.target as HTMLInputElement).value))}
                            onTouchEnd={e => commit(Number((e.target as HTMLInputElement).value))}
                            onKeyUp={e => commit(Number((e.target as HTMLInputElement).value))}
                            className="relative w-full h-4 cursor-pointer appearance-none bg-transparent disabled:opacity-40 disabled:cursor-not-allowed
                                [&::-webkit-slider-thumb]:appearance-none
                                [&::-webkit-slider-thumb]:w-3
                                [&::-webkit-slider-thumb]:h-3
                                [&::-webkit-slider-thumb]:rounded-full
                                [&::-webkit-slider-thumb]:bg-white
                                [&::-webkit-slider-thumb]:border
                                [&::-webkit-slider-thumb]:border-white/40
                                [&::-webkit-slider-thumb]:shadow-md
                                [&::-webkit-slider-thumb]:cursor-grab
                                [&::-webkit-slider-thumb]:active:cursor-grabbing
                                [&::-webkit-slider-runnable-track]:bg-transparent
                                [&::-moz-range-thumb]:w-3
                                [&::-moz-range-thumb]:h-3
                                [&::-moz-range-thumb]:rounded-full
                                [&::-moz-range-thumb]:bg-white
                                [&::-moz-range-thumb]:border-0
                                [&::-moz-range-thumb]:cursor-grab
                                [&::-moz-range-track]:bg-transparent"
                        />
                    </div>

                    <span className={`text-[11px] font-mono w-10 shrink-0 font-bold ${isLive ? "text-emerald-400" : "text-muted-foreground"}`}>
                        LIVE
                    </span>
                </div>

                {/* Preset window buttons */}
                <div className="flex items-center gap-0.5 border-l border-white/10 pl-3 shrink-0">
                    {PRESETS.map(p => (
                        <button
                            key={p.label}
                            onClick={() => handlePreset(p.hours)}
                            disabled={disabled}
                            className={`h-7 px-2 text-[10px] uppercase font-bold tracking-wider rounded transition-colors ${
                                windowHours === p.hours && !customDate
                                    ? "bg-fuchsia-500/20 text-fuchsia-400"
                                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}

                    {/* Custom date picker */}
                    <div className="relative ml-1 flex items-center">
                        <CalendarIcon className="h-3 w-3 text-muted-foreground absolute left-2 pointer-events-none z-10" />
                        <input
                            type="date"
                            value={customDate}
                            onChange={handleCustomDate}
                            max={new Date().toISOString().split("T")[0]}
                            disabled={disabled}
                            className="h-7 w-28 bg-white/5 border border-white/10 rounded-md text-[10px] text-white pl-7 pr-1 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50 disabled:opacity-40 cursor-pointer"
                            title="Jump to specific date"
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
