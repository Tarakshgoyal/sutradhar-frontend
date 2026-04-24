import { Link, useLocation } from "react-router-dom"
import { Globe, ShieldAlert, CloudRain, Shield, Coins, AlertTriangle } from "lucide-react"

// Hoist to module level to avoid recreating on every render
const DOMAINS = [
    { name: "Global Graph", path: "/", icon: Globe, color: "text-blue-400", bg: "bg-blue-500/20" },
    { name: "Geopolitics", path: "/domains/geopolitics", icon: ShieldAlert, color: "text-orange-400", bg: "bg-orange-500/20" },
    { name: "Economy", path: "/domains/economy", icon: Coins, color: "text-emerald-400", bg: "bg-emerald-500/20" },
    { name: "Defense", path: "/domains/defense", icon: Shield, color: "text-red-400", bg: "bg-red-500/20" },
    { name: "Climate", path: "/domains/climate", icon: CloudRain, color: "text-cyan-400", bg: "bg-cyan-500/20" },
    { name: "Alerts", path: "/domains/alerts", icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-500/20" },
] as const

export function NavigationSidebar() {
    const location = useLocation()

    return (
        <div className="absolute left-4 top-32 bottom-20 w-14 lg:w-48 z-10 flex flex-col gap-2 pointer-events-none transition-all duration-300">
            <div className="bg-black/60 border border-white/10 backdrop-blur-md rounded-xl p-2 pointer-events-auto shadow-lg shadow-black/50 h-full overflow-y-auto custom-scrollbar">
                <div className="px-2 pb-2 mb-2 border-b border-white/10 hidden lg:block pt-1">
                    <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Domains</h2>
                </div>
                <nav className="flex flex-col gap-1">
                    {DOMAINS.map((domain) => {
                        const active = location.pathname === domain.path
                        const Icon = domain.icon
                        return (
                            <Link
                                key={domain.name}
                                to={domain.path}
                                title={domain.name}
                                className={`flex items-center gap-3 px-2 py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black/80 ${active
                                        ? `${domain.bg} ${domain.color} border border-white/5`
                                        : "text-muted-foreground hover:bg-white/5 hover:text-white border border-transparent"
                                    }`}
                            >
                                <Icon className="h-4 w-4 shrink-0 mx-auto lg:mx-0" />
                                <span className="text-xs font-medium hidden lg:block">{domain.name}</span>
                            </Link>
                        )
                    })}
                </nav>
            </div>
        </div>
    )
}
