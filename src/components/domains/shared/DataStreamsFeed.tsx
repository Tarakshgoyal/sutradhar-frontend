import { Database, Radio } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function DataStreamsFeed( ) {
    const streams = [
        { id: 1, source: "Global News Wire", status: "active", rate: "240 msgs/s" },
        { id: 2, source: "Satellite Telemetry", status: "active", rate: "12 mb/s" },
        { id: 3, source: "Financial FIX Feeds", status: "syncing", rate: "..." },
        { id: 4, source: "Social Media Firehose", status: "active", rate: "1.2k msgs/s" },
    ]

    return (
        <Card className="bg-black/40 border-white/10">
            <CardHeader className="py-3">
                <CardTitle className="text-sm text-sky-400 flex items-center gap-2">
                    <Radio className="h-4 w-4 animate-pulse" /> Live Data Streams
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {streams.map(s => (
                        <div key={s.id} className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5">
                            <div className="flex items-center gap-2">
                                <Database className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-white">{s.source}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                                <span className={s.status === 'active' ? 'text-emerald-400' : 'text-amber-400'}>{s.rate}</span>
                                <div className={`h-2 w-2 rounded-full ${s.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
