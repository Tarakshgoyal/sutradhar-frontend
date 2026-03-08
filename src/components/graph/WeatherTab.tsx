import { useEffect, useState, useCallback, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import {
    fetchCurrentWeather,
    fetchWeatherAnomalies,
    fetchWeatherTrends,
    fetchClimateTrends,
    type WeatherObservation,
    type WeatherAnomaly,
    type WeatherTrendPoint,
    type ClimateTrendsResponse,
} from "@/lib/api"
import {
    Loader2,
    CloudRain,
    ThermometerSun,
    Wind,
    AlertTriangle,
    Droplets,
    ArrowLeft,
    TrendingUp,
    Sun,
    Cloud,
    CloudSnow,
    CloudLightning,
    CloudDrizzle,
    CloudFog,
    Snowflake,
    Eye,
    MapPin,
} from "lucide-react"

/* ── Weather code to icon/label mapping ── */

function getWeatherInfo(code: number): { icon: React.ElementType; label: string; color: string } {
    if (code === 0) return { icon: Sun, label: "Clear", color: "text-yellow-400" }
    if (code <= 3) return { icon: Cloud, label: "Cloudy", color: "text-gray-400" }
    if (code <= 49) return { icon: CloudFog, label: "Fog", color: "text-gray-500" }
    if (code <= 59) return { icon: CloudDrizzle, label: "Drizzle", color: "text-blue-300" }
    if (code <= 69) return { icon: CloudRain, label: "Rain", color: "text-blue-400" }
    if (code <= 79) return { icon: Snowflake, label: "Snow", color: "text-cyan-300" }
    if (code <= 84) return { icon: CloudRain, label: "Showers", color: "text-blue-500" }
    if (code <= 86) return { icon: CloudSnow, label: "Snow Showers", color: "text-cyan-400" }
    if (code <= 99) return { icon: CloudLightning, label: "Thunderstorm", color: "text-purple-400" }
    return { icon: Cloud, label: "Unknown", color: "text-gray-400" }
}

function tempColor(temp: number): string {
    if (temp >= 40) return "text-red-500"
    if (temp >= 35) return "text-orange-400"
    if (temp >= 30) return "text-amber-400"
    if (temp >= 25) return "text-yellow-400"
    if (temp >= 15) return "text-emerald-400"
    if (temp >= 5) return "text-cyan-400"
    return "text-blue-400"
}

function tempBg(temp: number): string {
    if (temp >= 40) return "from-red-500/15 to-orange-500/5"
    if (temp >= 35) return "from-orange-500/12 to-amber-500/5"
    if (temp >= 30) return "from-amber-500/10 to-yellow-500/5"
    if (temp >= 25) return "from-yellow-500/8 to-green-500/5"
    if (temp >= 15) return "from-emerald-500/8 to-cyan-500/5"
    return "from-blue-500/10 to-cyan-500/5"
}

function severityColor(severity: string): string {
    switch (severity) {
        case "extreme": return "border-red-500/50 text-red-400 bg-red-500/10"
        case "severe": return "border-orange-500/50 text-orange-400 bg-orange-500/10"
        case "moderate": return "border-yellow-500/50 text-yellow-400 bg-yellow-500/10"
        default: return "border-amber-500/50 text-amber-400 bg-amber-500/10"
    }
}

function anomalyTypeLabel(type: string): string {
    return type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

/* ── Sparkline SVG ── */

function Sparkline({ data, width = 180, height = 40, color = "#60a5fa" }: {
    data: number[]
    width?: number
    height?: number
    color?: string
}) {
    if (data.length < 2) return null
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const padding = 2

    const points = data.map((v, i) => {
        const x = padding + (i / (data.length - 1)) * (width - padding * 2)
        const y = height - padding - ((v - min) / range) * (height - padding * 2)
        return `${x},${y}`
    })

    const areaPoints = [
        `${padding},${height - padding}`,
        ...points,
        `${width - padding},${height - padding}`,
    ].join(" ")

    return (
        <svg width={width} height={height} className="block">
            <defs>
                <linearGradient id={`spark-grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                </linearGradient>
            </defs>
            <polygon
                points={areaPoints}
                fill={`url(#spark-grad-${color.replace("#", "")})`}
            />
            <polyline
                points={points.join(" ")}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            {/* Last point dot */}
            {points.length > 0 && (
                <circle
                    cx={Number(points[points.length - 1].split(",")[0])}
                    cy={Number(points[points.length - 1].split(",")[1])}
                    r="2.5"
                    fill={color}
                />
            )}
        </svg>
    )
}

/* ── Main Component ── */

type SortMode = "temp" | "rain" | "wind" | "name"

export function WeatherTab() {
    const [observations, setObservations] = useState<WeatherObservation[]>([])
    const [anomalies, setAnomalies] = useState<WeatherAnomaly[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedCity, setSelectedCity] = useState<string | null>(null)
    const [sortMode, setSortMode] = useState<SortMode>("temp")
    const [zoneFilter, setZoneFilter] = useState<string>("")

    useEffect(() => {
        let mounted = true
        Promise.all([
            fetchCurrentWeather(),
            fetchWeatherAnomalies({ days: 30 }),
        ])
            .then(([weatherData, anomalyData]) => {
                if (mounted) {
                    setObservations(weatherData.observations)
                    setAnomalies(anomalyData.anomalies)
                    setLoading(false)
                }
            })
            .catch(err => {
                console.error("Failed to load weather:", err)
                if (mounted) setLoading(false)
            })
        return () => { mounted = false }
    }, [])

    const zones = useMemo(() => {
        const s = new Set<string>()
        observations.forEach(o => {
            // Infer zone from lat/lon
            if (o.lat > 30) s.add("north")
            else if (o.lat > 20) s.add("central")
            else s.add("south")
        })
        return Array.from(s).sort()
    }, [observations])

    const filteredAndSorted = useMemo(() => {
        let list = [...observations]
        if (zoneFilter) {
            list = list.filter(o => {
                if (zoneFilter === "north") return o.lat > 30
                if (zoneFilter === "central") return o.lat > 20 && o.lat <= 30
                if (zoneFilter === "south") return o.lat <= 20
                return true
            })
        }
        switch (sortMode) {
            case "temp": list.sort((a, b) => b.temperature_max - a.temperature_max); break
            case "rain": list.sort((a, b) => b.precipitation_sum - a.precipitation_sum); break
            case "wind": list.sort((a, b) => b.wind_speed_max - a.wind_speed_max); break
            case "name": list.sort((a, b) => a.city.localeCompare(b.city)); break
        }
        return list
    }, [observations, sortMode, zoneFilter])

    const stats = useMemo(() => {
        if (observations.length === 0) return null
        const hottest = observations.reduce((a, b) => a.temperature_max > b.temperature_max ? a : b)
        const coolest = observations.reduce((a, b) => a.temperature_min < b.temperature_min ? a : b)
        const wettest = observations.reduce((a, b) => a.precipitation_sum > b.precipitation_sum ? a : b)
        const avgTemp = observations.reduce((s, o) => s + o.temperature_mean, 0) / observations.length
        return { hottest, coolest, wettest, avgTemp }
    }, [observations])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-yellow-400" />
                <span className="ml-2 text-xs text-muted-foreground">Loading weather data...</span>
            </div>
        )
    }

    if (observations.length === 0) {
        return <p className="py-8 text-center text-xs text-muted-foreground">No weather observations available</p>
    }

    // Detail view for a selected city
    if (selectedCity) {
        const obs = observations.find(o => o.city === selectedCity)
        if (!obs) { setSelectedCity(null); return null }
        return (
            <CityDetailView
                obs={obs}
                anomalies={anomalies.filter(a => a.city === selectedCity)}
                onBack={() => setSelectedCity(null)}
            />
        )
    }

    return (
        <div className="flex flex-1 flex-col min-w-0">
            {/* Anomaly Alert Banner */}
            {anomalies.length > 0 && (
                <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 bg-red-950/30 border-b border-red-500/20">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                    <div className="flex items-center gap-2 overflow-x-auto min-w-0">
                        {anomalies.map(a => (
                            <button
                                key={a.id}
                                onClick={() => setSelectedCity(a.city)}
                                className="flex items-center gap-1 shrink-0 hover:bg-red-500/10 rounded px-1.5 py-0.5 transition-colors"
                            >
                                <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 ${severityColor(a.severity)}`}>
                                    {a.severity}
                                </Badge>
                                <span className="text-[10px] font-medium text-red-300">{a.city}</span>
                                <span className="text-[10px] text-red-400/70">{anomalyTypeLabel(a.type)}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Summary Stats Bar */}
            {stats && (
                <div className="shrink-0 flex items-center gap-3 px-3 py-1.5 border-b border-white/5 bg-white/[0.01]">
                    <div className="flex items-center gap-1">
                        <ThermometerSun className="h-3 w-3 text-orange-400" />
                        <span className="text-[10px] text-muted-foreground">Hottest:</span>
                        <button onClick={() => setSelectedCity(stats.hottest.city)} className="text-[10px] font-semibold text-orange-400 hover:underline">
                            {stats.hottest.city} {Math.round(stats.hottest.temperature_max)}°
                        </button>
                    </div>
                    <div className="h-3 w-px bg-white/10" />
                    <div className="flex items-center gap-1">
                        <Snowflake className="h-3 w-3 text-cyan-400" />
                        <span className="text-[10px] text-muted-foreground">Coolest:</span>
                        <button onClick={() => setSelectedCity(stats.coolest.city)} className="text-[10px] font-semibold text-cyan-400 hover:underline">
                            {stats.coolest.city} {Math.round(stats.coolest.temperature_min)}°
                        </button>
                    </div>
                    {stats.wettest.precipitation_sum > 0 && (
                        <>
                            <div className="h-3 w-px bg-white/10" />
                            <div className="flex items-center gap-1">
                                <CloudRain className="h-3 w-3 text-blue-400" />
                                <span className="text-[10px] text-muted-foreground">Wettest:</span>
                                <button onClick={() => setSelectedCity(stats.wettest.city)} className="text-[10px] font-semibold text-blue-400 hover:underline">
                                    {stats.wettest.city} {stats.wettest.precipitation_sum.toFixed(1)}mm
                                </button>
                            </div>
                        </>
                    )}
                    <span className="ml-auto text-[10px] text-muted-foreground">
                        Avg: {Math.round(stats.avgTemp)}° across {observations.length} cities
                    </span>
                </div>
            )}

            {/* Filter/Sort Bar */}
            <div className="shrink-0 flex items-center gap-2 px-3 py-1 border-b border-white/5">
                <span className="text-[10px] text-muted-foreground">Sort:</span>
                {([
                    { key: "temp", label: "Temp", icon: ThermometerSun },
                    { key: "rain", label: "Rain", icon: CloudRain },
                    { key: "wind", label: "Wind", icon: Wind },
                    { key: "name", label: "A-Z", icon: MapPin },
                ] as const).map(s => (
                    <button
                        key={s.key}
                        onClick={() => setSortMode(s.key)}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${sortMode === s.key ? "bg-yellow-500/15 text-yellow-400" : "text-muted-foreground hover:text-white hover:bg-white/5"}`}
                    >
                        <s.icon className="h-2.5 w-2.5" />
                        {s.label}
                    </button>
                ))}
                {zones.length > 1 && (
                    <>
                        <div className="h-3 w-px bg-white/10 ml-1" />
                        <span className="text-[10px] text-muted-foreground ml-1">Zone:</span>
                        <button
                            onClick={() => setZoneFilter("")}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${!zoneFilter ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white hover:bg-white/5"}`}
                        >All</button>
                        {zones.map(z => (
                            <button
                                key={z}
                                onClick={() => setZoneFilter(zoneFilter === z ? "" : z)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors capitalize ${zoneFilter === z ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white hover:bg-white/5"}`}
                            >{z}</button>
                        ))}
                    </>
                )}
            </div>

            {/* City Grid */}
            <div className="flex-1 overflow-y-auto p-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                    {filteredAndSorted.map(obs => (
                        <CityWeatherCard
                            key={obs.city}
                            obs={obs}
                            hasAnomaly={anomalies.some(a => a.city === obs.city)}
                            onClick={() => setSelectedCity(obs.city)}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}

/* ── City Card ── */

function CityWeatherCard({ obs, hasAnomaly, onClick }: {
    obs: WeatherObservation
    hasAnomaly: boolean
    onClick: () => void
}) {
    const weather = getWeatherInfo(obs.weather_code)
    const WeatherIcon = weather.icon

    return (
        <button
            onClick={onClick}
            className={`relative flex flex-col gap-1.5 rounded-lg border text-left transition-all hover:scale-[1.01] active:scale-[0.99] overflow-hidden ${hasAnomaly
                    ? "border-red-500/30 bg-gradient-to-br from-red-950/20 to-transparent hover:border-red-500/50"
                    : `border-white/[0.06] bg-gradient-to-br ${tempBg(obs.temperature_max)} hover:border-white/15`
                } p-2.5`}
        >
            {/* City + Weather Icon Row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                    <h4 className="text-[12px] font-bold text-white leading-none truncate">{obs.city}</h4>
                    {hasAnomaly && <AlertTriangle className="h-2.5 w-2.5 text-red-400 shrink-0" />}
                </div>
                <div className="flex items-center gap-1">
                    <WeatherIcon className={`h-4 w-4 ${weather.color}`} />
                    <span className={`text-[9px] ${weather.color}`}>{weather.label}</span>
                </div>
            </div>

            {/* Temperature + Stats */}
            <div className="flex items-end justify-between">
                <div className="flex items-baseline gap-1">
                    <span className={`text-xl font-black tracking-tighter leading-none ${tempColor(obs.temperature_max)}`}>
                        {Math.round(obs.temperature_max)}°
                    </span>
                    <span className="text-[10px] text-muted-foreground leading-none">
                        /{Math.round(obs.temperature_min)}°
                    </span>
                </div>
                <div className="flex items-center gap-2.5 text-[9px] text-muted-foreground">
                    <div className="flex items-center gap-0.5">
                        <Droplets className="h-2.5 w-2.5 text-blue-400" />
                        <span>{Math.round(obs.humidity_mean)}%</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                        <Wind className="h-2.5 w-2.5 text-emerald-400" />
                        <span>{obs.wind_speed_max.toFixed(0)}kph</span>
                    </div>
                    {obs.precipitation_sum > 0 && (
                        <div className="flex items-center gap-0.5">
                            <CloudRain className="h-2.5 w-2.5 text-blue-400" />
                            <span>{obs.precipitation_sum.toFixed(1)}mm</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Z-score indicators (compact) */}
            {(obs.temp_max_zscore !== null || obs.precip_zscore !== null) && (
                <div className="flex items-center gap-2 mt-0.5">
                    {obs.temp_max_zscore !== null && (
                        <ZScorePill label="T" zscore={obs.temp_max_zscore} type="temp" />
                    )}
                    {obs.precip_zscore !== null && (
                        <ZScorePill label="P" zscore={obs.precip_zscore} type="precip" />
                    )}
                </div>
            )}
        </button>
    )
}

/* ── Z-Score Pill (compact inline indicator) ── */

function ZScorePill({ label, zscore, type }: { label: string; zscore: number; type: "temp" | "precip" }) {
    const abs = Math.abs(zscore)
    let color = "text-gray-500 bg-gray-500/10"
    if (abs > 2) color = type === "temp"
        ? (zscore > 0 ? "text-red-400 bg-red-500/15" : "text-blue-400 bg-blue-500/15")
        : (zscore > 0 ? "text-blue-400 bg-blue-500/15" : "text-orange-400 bg-orange-500/15")
    else if (abs > 1) color = "text-amber-400 bg-amber-500/10"

    return (
        <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0 text-[9px] font-medium ${color}`}>
            {label}:{zscore > 0 ? "+" : ""}{zscore.toFixed(1)}σ
        </span>
    )
}

/* ── City Detail View ── */

function CityDetailView({ obs, anomalies, onBack }: {
    obs: WeatherObservation
    anomalies: WeatherAnomaly[]
    onBack: () => void
}) {
    const [trends, setTrends] = useState<WeatherTrendPoint[] | null>(null)
    const [precipTrends, setPrecipTrends] = useState<WeatherTrendPoint[] | null>(null)
    const [climateTrends, setClimateTrends] = useState<ClimateTrendsResponse | null>(null)
    const [loadingTrends, setLoadingTrends] = useState(true)

    useEffect(() => {
        let mounted = true
        setLoadingTrends(true)
        Promise.all([
            fetchWeatherTrends(obs.city, "temperature_max", "30d").catch(() => null),
            fetchWeatherTrends(obs.city, "precipitation_sum", "30d").catch(() => null),
            fetchClimateTrends(obs.city, "temperature_max").catch(() => null),
        ]).then(([tempData, precipData, climateData]) => {
            if (!mounted) return
            if (tempData) setTrends(tempData.data)
            if (precipData) setPrecipTrends(precipData.data)
            if (climateData) setClimateTrends(climateData)
            setLoadingTrends(false)
        })
        return () => { mounted = false }
    }, [obs.city])

    const weather = getWeatherInfo(obs.weather_code)
    const WeatherIcon = weather.icon

    return (
        <div className="flex flex-1 flex-col min-w-0">
            {/* Header */}
            <div className={`shrink-0 px-3 py-2.5 border-b border-white/[0.06] bg-gradient-to-r ${tempBg(obs.temperature_max)}`}>
                <div className="flex items-center gap-2 mb-2">
                    <button onClick={onBack} className="p-0.5 rounded hover:bg-white/10 transition-colors">
                        <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <h3 className="text-sm font-bold text-white">{obs.city}</h3>
                    <WeatherIcon className={`h-4 w-4 ${weather.color}`} />
                    <span className={`text-xs ${weather.color}`}>{weather.label}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                        {new Date(obs.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                </div>

                {/* Main stats grid */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    <StatBox icon={ThermometerSun} label="High" value={`${Math.round(obs.temperature_max)}°`} color="text-orange-400" />
                    <StatBox icon={ThermometerSun} label="Low" value={`${Math.round(obs.temperature_min)}°`} color="text-cyan-400" />
                    <StatBox icon={ThermometerSun} label="Mean" value={`${Math.round(obs.temperature_mean)}°`} color="text-yellow-400" />
                    <StatBox icon={Droplets} label="Humidity" value={`${Math.round(obs.humidity_mean)}%`} color="text-blue-400" />
                    <StatBox icon={Wind} label="Max Wind" value={`${obs.wind_speed_max.toFixed(1)}kph`} color="text-emerald-400" />
                    <StatBox icon={CloudRain} label="Precip" value={`${obs.precipitation_sum.toFixed(1)}mm`} color="text-blue-300" />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
                {/* Anomaly Alerts */}
                {anomalies.length > 0 && (
                    <div className="space-y-1.5">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                            <AlertTriangle className="h-3 w-3" />
                            Active Anomalies
                        </h4>
                        {anomalies.map(a => (
                            <div key={a.id} className="flex items-start gap-2 p-2 rounded-md bg-red-950/20 border border-red-500/15">
                                <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 shrink-0 ${severityColor(a.severity)}`}>
                                    {a.severity}
                                </Badge>
                                <div className="flex-1 min-w-0">
                                    <span className="text-[11px] font-semibold text-white">{anomalyTypeLabel(a.type)}</span>
                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                        <span>{new Date(a.start_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })} – {new Date(a.end_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                                        <span>Peak: {a.peak_value.toFixed(1)}°</span>
                                        {a.z_score !== null && <span>Z: {a.z_score.toFixed(1)}</span>}
                                    </div>
                                    {a.description && <p className="text-[10px] text-muted-foreground mt-0.5">{a.description}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Trends Charts */}
                {loadingTrends ? (
                    <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-yellow-400" />
                        <span className="ml-2 text-[11px] text-muted-foreground">Loading trends...</span>
                    </div>
                ) : (
                    <>
                        {/* Temperature Trend */}
                        {trends && trends.length > 1 && (
                            <div>
                                <h4 className="text-[11px] font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5 mb-1.5">
                                    <TrendingUp className="h-3 w-3" />
                                    Temperature Trend (30d)
                                </h4>
                                <div className="p-2 rounded-md bg-white/[0.02] border border-white/[0.06]">
                                    <Sparkline
                                        data={trends.map(d => d.value)}
                                        width={320}
                                        height={50}
                                        color="#fb923c"
                                    />
                                    <div className="flex items-center justify-between mt-1.5 text-[9px] text-muted-foreground">
                                        <span>{new Date(trends[0].date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                                        <div className="flex items-center gap-3">
                                            <span>Low: {Math.round(Math.min(...trends.map(d => d.value)))}°</span>
                                            <span>High: {Math.round(Math.max(...trends.map(d => d.value)))}°</span>
                                        </div>
                                        <span>{new Date(trends[trends.length - 1].date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Precipitation Trend */}
                        {precipTrends && precipTrends.length > 1 && precipTrends.some(d => d.value > 0) && (
                            <div>
                                <h4 className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5 mb-1.5">
                                    <CloudRain className="h-3 w-3" />
                                    Precipitation (30d)
                                </h4>
                                <div className="p-2 rounded-md bg-white/[0.02] border border-white/[0.06]">
                                    <Sparkline
                                        data={precipTrends.map(d => d.value)}
                                        width={320}
                                        height={40}
                                        color="#60a5fa"
                                    />
                                    <div className="flex items-center justify-between mt-1.5 text-[9px] text-muted-foreground">
                                        <span>{new Date(precipTrends[0].date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                                        <span>Total: {precipTrends.reduce((s, d) => s + d.value, 0).toFixed(1)}mm</span>
                                        <span>{new Date(precipTrends[precipTrends.length - 1].date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Climate Trends */}
                        {climateTrends && climateTrends.annual_means.length > 0 && (
                            <div>
                                <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-1.5">
                                    <Eye className="h-3 w-3" />
                                    Climate Overview
                                </h4>
                                <div className="p-2 rounded-md bg-white/[0.02] border border-white/[0.06]">
                                    <div className="grid grid-cols-2 gap-2">
                                        {climateTrends.annual_means.map(m => (
                                            <div key={m.year} className="flex items-center justify-between text-[10px]">
                                                <span className="text-muted-foreground">{m.year} Avg Max Temp</span>
                                                <span className="font-semibold text-amber-400">{m.mean.toFixed(1)}°</span>
                                            </div>
                                        ))}
                                        {climateTrends.extreme_days.map(e => (
                                            <div key={e.year} className="flex items-center justify-between text-[10px]">
                                                <span className="text-muted-foreground">{e.year} Extreme Days</span>
                                                <span className={`font-semibold ${e.count > 0 ? "text-red-400" : "text-green-400"}`}>{e.count}</span>
                                            </div>
                                        ))}
                                        {climateTrends.trend !== null && (
                                            <div className="flex items-center justify-between text-[10px] col-span-2">
                                                <span className="text-muted-foreground">Long-term Trend</span>
                                                <span className={`font-semibold ${climateTrends.trend > 0 ? "text-red-400" : "text-blue-400"}`}>
                                                    {climateTrends.trend > 0 ? "+" : ""}{climateTrends.trend.toFixed(3)}°/year
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Z-Score Analysis */}
                        {(obs.temp_max_zscore !== null || obs.precip_zscore !== null) && (
                            <div>
                                <h4 className="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5 mb-1.5">
                                    <TrendingUp className="h-3 w-3" />
                                    Anomaly Scores
                                </h4>
                                <div className="p-2 rounded-md bg-white/[0.02] border border-white/[0.06] space-y-2">
                                    {obs.temp_max_zscore !== null && (
                                        <ZScoreBar label="Temperature" zscore={obs.temp_max_zscore} colorScale="temp" />
                                    )}
                                    {obs.precip_zscore !== null && (
                                        <ZScoreBar label="Precipitation" zscore={obs.precip_zscore} colorScale="precip" />
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

/* ── Stat Box ── */

function StatBox({ icon: Icon, label, value, color }: {
    icon: React.ElementType; label: string; value: string; color: string
}) {
    return (
        <div className="flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-md bg-black/20">
            <Icon className={`h-3 w-3 ${color}`} />
            <span className={`text-sm font-bold leading-none ${color}`}>{value}</span>
            <span className="text-[9px] text-muted-foreground">{label}</span>
        </div>
    )
}

/* ── Z-Score Bar (for detail view) ── */

function ZScoreBar({ label, zscore, colorScale }: { label: string; zscore: number; colorScale: "temp" | "precip" }) {
    const clampedZ = Math.max(-3, Math.min(3, zscore))
    const position = ((clampedZ + 3) / 6) * 100

    let dotColor = "bg-gray-400"
    if (Math.abs(zscore) > 2) {
        dotColor = colorScale === "temp" ? (zscore > 0 ? "bg-red-500" : "bg-blue-500") : (zscore > 0 ? "bg-blue-500" : "bg-orange-500")
    } else if (Math.abs(zscore) > 1) {
        dotColor = colorScale === "temp" ? (zscore > 0 ? "bg-orange-500" : "bg-cyan-500") : (zscore > 0 ? "bg-cyan-500" : "bg-yellow-500")
    }

    return (
        <div className="flex items-center gap-2 w-full">
            <span className="text-[10px] text-muted-foreground whitespace-nowrap w-20">{label}</span>
            <div className="relative flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20" />
                {/* Colored zones */}
                <div className="absolute left-0 top-0 bottom-0 w-1/6 bg-blue-500/10 rounded-l-full" />
                <div className="absolute right-0 top-0 bottom-0 w-1/6 bg-red-500/10 rounded-r-full" />
                {/* Dot */}
                <div
                    className={`absolute top-0 bottom-0 w-2 -ml-1 rounded-full ${dotColor} shadow-sm`}
                    style={{ left: `${position}%` }}
                />
            </div>
            <span className={`text-[10px] font-bold tabular-nums w-8 text-right ${Math.abs(zscore) > 2 ? "text-amber-400" : "text-muted-foreground"}`}>
                {zscore > 0 ? "+" : ""}{zscore.toFixed(1)}
            </span>
        </div>
    )
}
