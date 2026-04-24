import { History, GitCompare } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TemporalViewToggleProps {
    view: 'timeline' | 'diff'
    onChange: (view: 'timeline' | 'diff') => void
}

export function TemporalViewToggle({ view, onChange }: TemporalViewToggleProps) {
    return (
        <div className="flex items-center p-1 bg-black/40 border border-white/10 rounded-lg w-fit">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange('timeline')}
                className={`h-8 px-3 text-xs gap-2 ${view === 'timeline' ? 'bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 hover:text-sky-300' : 'text-muted-foreground hover:text-white hover:bg-white/5'}`}
            >
                <History className="h-3.5 w-3.5" />
                Live Timeline
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange('diff')}
                className={`h-8 px-3 text-xs gap-2 ${view === 'diff' ? 'bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 hover:text-sky-300' : 'text-muted-foreground hover:text-white hover:bg-white/5'}`}
            >
                <GitCompare className="h-3.5 w-3.5" />
                Temporal Diff
            </Button>
        </div>
    )
}
