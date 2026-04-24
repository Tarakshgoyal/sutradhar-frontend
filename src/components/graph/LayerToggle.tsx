import { Link, useLocation } from "react-router-dom"
import { Layers, Globe2, Landmark, Shield, Cpu, CloudRain } from "lucide-react"

const DOMAINS = [
    { path: "/", label: "Global Graph", icon: Layers, color: "text-white" },
    { path: "/domains/geopolitics", label: "Geopolitics", icon: Globe2, color: "text-blue-400" },
    { path: "/domains/economy", label: "Economy", icon: Landmark, color: "text-emerald-400" },
    { path: "/domains/defense", label: "Defense", icon: Shield, color: "text-red-400" },
    { path: "/domains/technology", label: "Technology", icon: Cpu, color: "text-purple-400" },
    { path: "/domains/climate", label: "Climate", icon: CloudRain, color: "text-sky-400" },
]

export function LayerToggle() {
    const location = useLocation()
    
    return (
        <div className="absolute top-16 left-4 z-10 w-12 md:w-48 bg-black/80 backdrop-blur-md rounded-lg border border-white/10 shadow-xl overflow-hidden pointer-events-auto transition-all duration-300">
            <div className="flex items-center justify-center md:justify-start gap-2 p-3 bg-white/5 border-b border-white/10">
                <Layers className="h-4 w-4 text-sky-400 shrink-0" />
                <h3 className="text-xs font-semibold text-white tracking-widest uppercase hidden md:block">Global Layers</h3>
            </div>
            <div className="p-2 space-y-1">
                {DOMAINS.map((domain) => {
                    const active = location.pathname === domain.path
                    return (
                        <Link 
                            key={domain.path} 
                            to={domain.path}
                            className={`flex items-center justify-center md:justify-start gap-3 p-2 rounded-md transition-colors ${
                                active ? "bg-white/10 border border-white/10" : "opacity-70 hover:opacity-100 hover:bg-white/5"
                            }`}
                        >
                            <domain.icon className={`h-4 w-4 shrink-0 ${domain.color}`} />
                            <span className="text-xs font-medium text-white/90 hidden md:block">{domain.label}</span>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}

