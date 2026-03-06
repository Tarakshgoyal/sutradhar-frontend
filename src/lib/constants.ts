export const TYPE_COLORS: Record<string, string> = {
    Person: "#42a5f5",
    Organization: "#ab47bc",
    Country: "#66bb6a",
    Location: "#8d6e63",
    Event: "#ff7043",
    Policy: "#ffa726",
    Technology: "#26c6da",
    Economic_Indicator: "#ffee58",
    Military_Asset: "#ef5350",
    Resource: "#9ccc65",
}

export const ENTITY_TYPES = [
    { value: "Person", label: "Person" },
    { value: "Organization", label: "Organization" },
    { value: "Country", label: "Country" },
    { value: "Location", label: "Location" },
    { value: "Policy", label: "Policy" },
    { value: "Technology", label: "Technology" },
    { value: "Economic_Indicator", label: "Economic Indicator" },
    { value: "Military_Asset", label: "Military Asset" },
    { value: "Resource", label: "Resource" },
] as const

export const DATE_RANGES = [
    { value: "all", label: "All Time" },
    { value: "today", label: "Today" },
    { value: "7d", label: "Last 7 Days" },
    { value: "30d", label: "Last 30 Days" },
    { value: "90d", label: "Last 90 Days" },
] as const

export const LEGEND_ITEMS = [
    { color: "#42a5f5", label: "Person", shape: "circle" as const },
    { color: "#ab47bc", label: "Organization", shape: "circle" as const },
    { color: "#66bb6a", label: "Country", shape: "circle" as const },
    { color: "#8d6e63", label: "Location", shape: "circle" as const },
    { color: "#ff7043", label: "Event", shape: "diamond" as const },
] as const
