import { LEGEND_ITEMS } from "@/lib/constants"

export function GraphLegend() {
    return (
        <div className="fixed bottom-4 right-4 z-10 rounded-lg border border-white/10 bg-black/90 px-3.5 py-2.5 backdrop-blur-sm">
            <div className="space-y-1.5">
                {LEGEND_ITEMS.map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                        <div
                            className={`h-2.5 w-2.5 ${item.shape === "diamond" ? "rotate-45 rounded-sm" : "rounded-full"}`}
                            style={{ backgroundColor: item.color }}
                        />
                        <span className="text-[11px] text-muted-foreground">
                            {item.label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}
