import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Filter, Calendar, Zap, Database } from "lucide-react"

export function DomainFilters() {
    return (
        <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-lg p-2 px-4 shadow-sm xl:col-span-3 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="flex items-center gap-2 text-muted-foreground border-r border-white/10 pr-4">
                <Filter className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-widest">Filters</span>
            </div>
            
            <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <Select defaultValue="30d">
                    <SelectTrigger className="h-7 w-28 bg-transparent border-none text-xs focus:ring-0">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="7d">Last 7 Days</SelectItem>
                        <SelectItem value="30d">Last 30 Days</SelectItem>
                        <SelectItem value="90d">Last 90 Days</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex items-center gap-2 border-l border-white/10 pl-4 shrink-0">
                <Database className="h-3 w-3 text-muted-foreground" />
                <Select defaultValue="all">
                    <SelectTrigger className="h-7 w-32 bg-transparent border-none text-xs focus:ring-0">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Sources</SelectItem>
                        <SelectItem value="osint">OSINT</SelectItem>
                        <SelectItem value="sat">Satellite Imagery</SelectItem>
                        <SelectItem value="gov">Official Data</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex items-center gap-2 border-l border-white/10 pl-4 shrink-0">
                <Zap className="h-3 w-3 text-muted-foreground" />
                <Select defaultValue="all">
                    <SelectTrigger className="h-7 w-32 bg-transparent border-none text-xs focus:ring-0">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Entities</SelectItem>
                        <SelectItem value="org">Organizations</SelectItem>
                        <SelectItem value="person">Key Individuals</SelectItem>
                        <SelectItem value="event">Critical Events</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    )
}
