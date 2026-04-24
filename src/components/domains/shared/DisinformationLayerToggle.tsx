import { ShieldAlert } from "lucide-react"
import { Switch } from "@/components/ui/switch"

interface DisinformationLayerToggleProps {
    enabled: boolean
    onToggle: (enabled: boolean) => void
    count: number
}

export function DisinformationLayerToggle({ enabled, onToggle, count }: DisinformationLayerToggleProps) {
    return (
        <div className="flex items-center justify-between p-3 bg-red-950/20 border border-red-500/20 rounded-lg">
            <div className="flex items-center gap-3">
                <div className="bg-red-500/20 p-1.5 rounded-md">
                    <ShieldAlert className="h-4 w-4 text-red-500" />
                </div>
                <div className="flex flex-col">
                    <span className="text-xs font-semibold text-red-400">Disinformation Layer</span>
                    <span className="text-[10px] text-muted-foreground">{count} suspicious clusters detected</span>
                </div>
            </div>
            <Switch 
                checked={enabled} 
                onCheckedChange={onToggle} 
                className="data-[state=checked]:bg-red-500"
            />
        </div>
    )
}
