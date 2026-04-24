import { Activity, Database, Server, Zap } from "lucide-react"

export function GlobalMetricsPanel() {
    return (
        <div className="absolute top-[170px] md:top-14 left-4 right-4 md:right-auto z-10 hidden md:flex flex-wrap gap-4 pointer-events-none">
            <div className="flex bg-black/60 border border-white/10 backdrop-blur-md rounded-xl p-3 items-center pointer-events-auto shadow-lg shadow-black/50">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-indigo-500/20 rounded-md">
                        <Database className="h-4 w-4 text-indigo-400" />
                    </div>
                    <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Active Entities</p>
                        <p className="text-sm font-bold text-white">142,593</p>
                    </div>
                </div>
                <div className="h-6 w-px bg-white/10 mx-3" />
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-emerald-500/20 rounded-md">
                        <Activity className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">System Health</p>
                        <div className="flex items-baseline gap-1">
                            <p className="text-sm font-bold text-white">99.9%</p>
                            <span className="text-[10px] font-normal text-emerald-400">Optimal</span>
                        </div>
                    </div>
                </div>
                <div className="h-6 w-px bg-white/10 mx-3" />
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-amber-500/20 rounded-md">
                        <Zap className="h-4 w-4 text-amber-400" />
                    </div>
                    <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Processing Rate</p>
                        <div className="flex items-baseline gap-1">
                            <p className="text-sm font-bold text-white">4.2k</p>
                            <span className="text-[10px] font-normal text-muted-foreground">ev/s</span>
                        </div>
                    </div>
                </div>
                <div className="h-6 w-px bg-white/10 mx-3" />
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-sky-500/20 rounded-md">
                        <Server className="h-4 w-4 text-sky-400" />
                    </div>
                    <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Connected Sources</p>
                        <p className="text-sm font-bold text-white">847</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
