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
  key_developments?: KeyDevelopment[]
  key_actors?: KeyActor[]
  critical_relationships?: CriticalRelationship[]
  trends?: string
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

// --- News ---

export interface NewsArticle {
  id: number
  url: string
  title: string
  source: string
  description: string
  pub_date: string
  top_image: string | null
  importance_score: number
  domain: string
  cluster_id: string | null
  cluster_label: string | null
  scraped_at: string
}

export interface NewsListResponse {
  total: number
  page: number
  per_page: number
  articles: NewsArticle[]
}

export interface NewsListParams {
  page?: number
  per_page?: number
  source?: string
  domain?: string
  min_score?: number
  from_date?: string
  to_date?: string
  q?: string
}

export interface TrendingTopic {
  cluster_id: string
  cluster_label: string
  domain: string
  importance_score: number
  article_count: number
  first_seen: string
  top_article: {
    id: number
    title: string
    source: string
    url: string
    top_image: string | null
    pub_date: string
  }
}

export interface NewsDomain {
  domain: string
  article_count: number
}

export async function fetchTopNews(limit = 10, hours = 24): Promise<NewsArticle[]> {
  const resp = await fetch(`${API_URL}/news/top?limit=${limit}&hours=${hours}`)
  if (!resp.ok) throw new Error(`News API error: ${resp.status}`)
  const data = await resp.json()
  return data.articles ?? data
}

export async function fetchNewsList(params: NewsListParams = {}): Promise<NewsListResponse> {
  const qs = new URLSearchParams()
  if (params.page) qs.set("page", String(params.page))
  if (params.per_page) qs.set("per_page", String(params.per_page))
  if (params.source) qs.set("source", params.source)
  if (params.domain) qs.set("domain", params.domain)
  if (params.min_score !== undefined) qs.set("min_score", String(params.min_score))
  if (params.from_date) qs.set("from_date", params.from_date)
  if (params.to_date) qs.set("to_date", params.to_date)
  if (params.q) qs.set("q", params.q)
  const resp = await fetch(`${API_URL}/news?${qs}`)
  if (!resp.ok) throw new Error(`News API error: ${resp.status}`)
  return resp.json()
}

export async function fetchTrendingTopics(hours = 24, limit = 50): Promise<TrendingTopic[]> {
  const resp = await fetch(`${API_URL}/news/topics?hours=${hours}&limit=${limit}`)
  if (!resp.ok) throw new Error(`Topics API error: ${resp.status}`)
  const data = await resp.json()
  return data.topics ?? data
}

export async function fetchNewsDomains(): Promise<NewsDomain[]> {
  const resp = await fetch(`${API_URL}/news/domains`)
  if (!resp.ok) throw new Error(`Domains API error: ${resp.status}`)
  const data = await resp.json()
  return data.domains ?? data
}

// --- Signals ---

export interface Signal {
  id: number
  type: "entity_spike" | "new_entity" | "topic_spike"
  severity: "high" | "medium"
  entity_name: string | null
  entity_type: string | null
  cluster_id: string | null
  cluster_label: string | null
  domain: string | null
  spike_ratio: number
  current_count: number
  baseline_count: number
  detected_at: string
  expires_at: string
}

export interface SignalsResponse {
  count: number
  signals: Signal[]
}

export async function fetchSignals(params: {
  signal_type?: string
  severity?: string
  limit?: number
} = {}): Promise<SignalsResponse> {
  const qs = new URLSearchParams()
  if (params.signal_type) qs.set("signal_type", params.signal_type)
  if (params.severity) qs.set("severity", params.severity)
  if (params.limit) qs.set("limit", String(params.limit))
  const resp = await fetch(`${API_URL}/signals?${qs}`)
  if (!resp.ok) throw new Error(`Signals API error: ${resp.status}`)
  return resp.json()
}

// --- Entity Timeline ---

export interface TimelineEvent {
  event_name: string
  event_type: string | null
  date: string
  description: string | null
  co_entities: string[]
  sources: {
    url: string
    title: string
    source: string
    pub_date: string
  }[]
}

export interface EntityTimelineResponse {
  entity: { name: string; type: string }
  total: number
  offset: number
  limit: number
  timeline: TimelineEvent[]
}

export async function fetchEntityTimeline(
  entityName: string,
  limit = 50,
  offset = 0
): Promise<EntityTimelineResponse> {
  const resp = await fetch(
    `${API_URL}/entities/${encodeURIComponent(entityName)}/timeline?limit=${limit}&offset=${offset}`
  )
  if (!resp.ok) throw new Error(`Timeline API error: ${resp.status}`)
  return resp.json()
}
