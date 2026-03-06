const API_URL = import.meta.env.VITE_API_URL || "/api"

export interface GraphParams {
  search?: string
  entity_type?: string
  limit?: number
  min_connections?: number
  date_range?: string
}

export interface GraphNode {
  id: string | number
  labels: string[]
  props: Record<string, string>
  degree?: number
  sources?: SourceArticle[]
}

export interface GraphEdge {
  from: string | number
  to: string | number
  type: string
  props?: Record<string, string | boolean>
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface GraphStats {
  total_entities: number
  total_relationships: number
  total_events: number
  total_articles: number
}

export interface SourceArticle {
  url: string
  title: string
  source: string
  pub_date?: string
}

export interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
}

export interface ChatResponse {
  answer: string
  cypher?: string
}

export async function fetchGraph(params: GraphParams): Promise<GraphData> {
  const qs = new URLSearchParams()
  if (params.limit) qs.set("limit", String(params.limit))
  if (params.min_connections !== undefined)
    qs.set("min_connections", String(params.min_connections))
  if (params.search) qs.set("search", params.search)
  if (params.entity_type) qs.set("entity_type", params.entity_type)
  if (params.date_range && params.date_range !== "all")
    qs.set("date_range", params.date_range)

  const resp = await fetch(`${API_URL}/graph?${qs}`)
  if (!resp.ok) throw new Error(`Graph API error: ${resp.status}`)
  return resp.json()
}

export async function fetchGraphStats(): Promise<GraphStats> {
  const resp = await fetch(`${API_URL}/graph/stats`)
  if (!resp.ok) throw new Error(`Stats API error: ${resp.status}`)
  return resp.json()
}

export async function sendChatMessage(
  question: string,
  history: ChatMessage[]
): Promise<ChatResponse> {
  const resp = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, history }),
  })
  if (!resp.ok) throw new Error(`Chat API error: ${resp.status}`)
  return resp.json()
}

// --- Reports ---

export interface DomainInfo {
  domain: string
  generated_at: string
}

export interface ReportSource {
  title: string
  url: string
  source: string
}

export interface KeyDevelopment {
  title: string
  details: string
  entities: string[]
  date: string
}

export interface KeyActor {
  name: string
  type: string
  role: string
}

export interface CriticalRelationship {
  source: string
  target: string
  relation_type: string
  analysis: string
}

export interface CausalChainStep {
  entity: string
  entity_type: string
  relation: string
}

export interface CausalChain {
  chain: CausalChainStep[]
  final_entity: string
  score: number
  narrative: string
  source_articles: string[]
}

export interface ImpactPropagation {
  trigger_event: string
  event_date: string
  event_status: string
  affected: {
    name: string
    type: string
    hop_distance: number
    via_relation: string
  }[]
  narrative: string
}

export interface WeakLink {
  entity: string
  type: string
  domains_bridged: string[]
  connection_count: number
  risk_narrative: string
}

export interface ReportInference {
  executive_summary: string
  causal_chains: CausalChain[]
  impact_propagations: ImpactPropagation[]
  weak_links: WeakLink[]
}

export interface Report {
  executive_summary: string
  key_developments: KeyDevelopment[]
  key_actors: KeyActor[]
  critical_relationships: CriticalRelationship[]
  trends: string
  domain: string
  date_range: string
  generated_at: string
  sources: ReportSource[]
  india_impact: string | null
  inference: ReportInference
}

export interface ReportResponse {
  domain: string
  date_range: string
  generated_at: string
  report: Report
}

export async function fetchReportDomains(): Promise<{ domains: DomainInfo[] }> {
  const resp = await fetch(`${API_URL}/reports`)
  if (!resp.ok) throw new Error(`Reports API error: ${resp.status}`)
  return resp.json()
}

export async function fetchReport(domain: string): Promise<ReportResponse> {
  const resp = await fetch(`${API_URL}/reports/${domain}`)
  if (!resp.ok) throw new Error(`Report API error: ${resp.status}`)
  return resp.json()
}
