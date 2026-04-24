import { Sparkles, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ScenarioButtonProps {
    domain: string
    prompt: string
    onClick: (prompt: string) => void
}

export function ScenarioButton({ domain, prompt, onClick }: ScenarioButtonProps) {
    return (
        <Button 
            variant="outline" 
            className="w-full justify-between bg-black/40 border-fuchsia-500/20 hover:bg-fuchsia-500/10 hover:border-fuchsia-500/40 text-left h-auto py-3 px-4 group transition-all"
            onClick={() => onClick(prompt)}
        >
            <div className="flex items-start gap-3">
                <div className="bg-fuchsia-500/20 p-1.5 rounded-full shrink-0 group-hover:bg-fuchsia-500/30 transition-colors">
                    <Sparkles className="h-4 w-4 text-fuchsia-400" />
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-widest text-fuchsia-400 font-semibold">{domain} Scenario</span>
                    <span className="text-sm text-white/90 whitespace-normal line-clamp-2 leading-snug">"{prompt}"</span>
                </div>
            </div>
            <ArrowRight className="h-4 w-4 text-fuchsia-500/50 group-hover:text-fuchsia-400 group-hover:translate-x-1 transition-all shrink-0 ml-4" />
        </Button>
    )
}
