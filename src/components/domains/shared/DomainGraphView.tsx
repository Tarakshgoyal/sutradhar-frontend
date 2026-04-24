import { Network, ZoomIn } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function DomainGraphView({ title = "Domain Knowledge Graph" }: { title?: string }) {
    return (
        <Card className="bg-black/40 border-white/10 h-full flex flex-col min-h-[350px]">
            <CardHeader className="py-3 flex flex-row items-center justify-between z-10">
                <CardTitle className="text-sm text-indigo-400 flex items-center gap-2">
                    <Network className="h-4 w-4" /> {title}
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-white">
                    <ZoomIn className="h-3 w-3" />
                </Button>
            </CardHeader>
            <CardContent className="flex-1 relative overflow-hidden rounded-b-lg p-0">
                <div className="absolute inset-0 opacity-10" />
                
                {/* Mock Nodes */}
                <div className="absolute top-1/4 left-1/4 w-16 h-16 bg-blue-500/20 border border-blue-500 rounded-full flex flex-col items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)] z-10 backdrop-blur-sm animate-pulse">
                    <span className="text-[10px] font-bold text-blue-100">Core</span>
                </div>
                <div className="absolute top-1/2 left-2/3 w-12 h-12 bg-emerald-500/20 border border-emerald-500 rounded-full flex flex-col items-center justify-center z-10 backdrop-blur-sm">
                    <span className="text-[9px] text-emerald-100">Node A</span>
                </div>
                <div className="absolute bottom-1/4 left-1/3 w-14 h-14 bg-orange-500/20 border border-orange-500 rounded-full flex flex-col items-center justify-center z-10 mt-4 backdrop-blur-sm">
                    <span className="text-[9px] text-orange-100">Node B</span>
                </div>
                <div className="absolute top-1/6 right-1/4 w-10 h-10 bg-fuchsia-500/20 border border-fuchsia-500 rounded-full flex flex-col items-center justify-center z-10 mt-4 backdrop-blur-sm">
                    <span className="text-[8px] text-fuchsia-100">Event</span>
                </div>

                {/* SVG Lines between nodes */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <line x1="30%" y1="30%" x2="65%" y2="50%" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="4 2" />
                    <line x1="30%" y1="30%" x2="35%" y2="70%" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                    <line x1="68%" y1="52%" x2="74%" y2="22%" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                    <line x1="38%" y1="72%" x2="65%" y2="55%" stroke="rgba(255,0,0,0.3)" strokeWidth="2" />
                </svg>

                <div className="absolute bottom-3 left-3 text-[10px] text-muted-foreground bg-black/50 px-2 py-1 rounded backdrop-blur">
                    Interactive view restricted in global mode.
                </div>
            </CardContent>
        </Card>
    )
}
