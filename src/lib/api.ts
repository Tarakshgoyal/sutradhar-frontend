const API_URL = import.meta.env.VITE_API_URL || "/api"

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthTokenResponse {
  access_token: string
  token_type: string
}

export interface AuthUser {
  id: number
  email: string
  name: string
  is_verified: boolean
  created_at: string
}

export async function authRegister(
  name: string,
  email: string,
  password: string
): Promise<{ message: string }> {
  const resp = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new Error(err.detail || `Register failed: ${resp.status}`)
  }
  return resp.json()
}

export async function authLogin(
  email: string,
  password: string
): Promise<AuthTokenResponse> {
  const resp = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new Error(err.detail || `Login failed: ${resp.status}`)
  }
  return resp.json()
}

export async function authMe(): Promise<AuthUser> {
  const token = localStorage.getItem("auth_token")
  const resp = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!resp.ok) throw new Error(`Auth check failed: ${resp.status}`)
  return resp.json()
}

// ── Graph ─────────────────────────────────────────────────────────────────────

export interface GraphParams {
  search?: string
  entity_type?: string
  limit?: number
  min_connections?: number
  date_range?: string
  until?: string   // ISO date YYYY-MM-DD — time-machine mode
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
  if (params.until)
    qs.set("until", params.until)
  else if (params.date_range && params.date_range !== "all")
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

export interface IndiaImpactRiskObject {
  risk?: string
  summary?: string
  implications?: string
  [key: string]: unknown
}

export interface IndiaImpactDetails {
  strategic_assessment?: string
  national_advantages?: string[]
  risks?: Array<string | IndiaImpactRiskObject>
  [key: string]: unknown
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
  india_impact: string | IndiaImpactDetails | null
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

export async function fetchTopNews(limit = 10, hours = 24, domain?: string): Promise<NewsArticle[]> {
  const qs = new URLSearchParams({
    limit: String(limit),
    hours: String(hours),
  })
  if (domain) qs.set("domain", domain)
  const resp = await fetch(`${API_URL}/news/top?${qs}`)
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
  domain?: string
  limit?: number
} = {}): Promise<SignalsResponse> {
  const qs = new URLSearchParams()
  if (params.signal_type) qs.set("signal_type", params.signal_type)
  if (params.severity) qs.set("severity", params.severity)
  if (params.domain) qs.set("domain", params.domain)
  if (params.limit) qs.set("limit", String(params.limit))
  const resp = await fetch(`${API_URL}/signals?${qs}`)
  if (!resp.ok) throw new Error(`Signals API error: ${resp.status}`)
  return resp.json()
}

// --- Scenarios & Stability ---

export interface AffectedNode {
  name: string
  type: string
  hop_distance: number
  via_relation: string
  impact_direction: string
  confidence: number
  reasoning?: string
}

export interface GraphEvidence {
  seed_nodes_found: number
  relationships_used: number
  articles_referenced: number
}

export interface ScenarioResult {
  scenario: string
  seed_entities: string[]
  affected_nodes: AffectedNode[]
  india_implications: string[]
  confidence_overall: number
  graph_paths: string[]
  summary?: string
  risk_factors?: string[]
  opportunity_factors?: string[]
  graph_evidence?: GraphEvidence
  generated_at: string
}

export interface StabilityScore {
  domain: string
  score: number
  components: Record<string, number>
  staleness_penalty: number
  data_age_hours: number
  computed_at: string
  trend?: string
}

export async function simulateScenario(scenario: string, max_hops: number = 3, entities?: string[], domain_filter?: string): Promise<ScenarioResult> {
  const resp = await fetch(`${API_URL}/scenarios/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario, max_hops, entities, domain_filter }),
  })
  if (!resp.ok) throw new Error(`Scenarios API error: ${resp.status}`)
  return resp.json()
}

export async function fetchStabilityScores(domains?: string): Promise<StabilityScore[]> {
  const qs = domains ? `?domains=${domains}` : ""
  const resp = await fetch(`${API_URL}/stability${qs}`)
  if (!resp.ok) throw new Error(`Stability API error: ${resp.status}`)
  return resp.json()
}

export async function fetchDomainStability(domain: string): Promise<StabilityScore> {
  const resp = await fetch(`${API_URL}/stability/${domain}`)
  if (!resp.ok) throw new Error(`Stability API error: ${resp.status}`)
  return resp.json()
}

// --- Disinformation ---

export interface DisinfoSignal {
  id: number
  signal_type: string
  severity: string
  confidence: number
  actor_attribution?: string | null
  target_entity?: string | null
  target_domain?: string | null
  cluster_id?: string | null
  narrative_summary: string
  coordination_score?: number
  evidence_articles?: string[]
  flagged_sources?: string[]
  detected_at: string
}

export async function fetchDisinfoSignals(params?: { hours?: number; severity?: string; domain?: string; limit?: number }): Promise<DisinfoSignal[]> {
  const qs = new URLSearchParams()
  if (params?.hours) qs.set("hours", String(params.hours))
  if (params?.severity) qs.set("severity", params.severity)
  if (params?.domain) qs.set("domain", params.domain)
  if (params?.limit) qs.set("limit", String(params.limit))
  
  const resp = await fetch(`${API_URL}/disinfo/signals?${qs}`)
  if (!resp.ok) throw new Error(`Disinfo signals API error: ${resp.status}`)
  return resp.json()
}

export async function fetchDisinfoNarratives(limit: number = 20): Promise<any[]> {
  const resp = await fetch(`${API_URL}/disinfo/narratives?limit=${limit}`)
  if (!resp.ok) throw new Error(`Disinfo narratives API error: ${resp.status}`)
  const data = await resp.json()
  return Array.isArray(data) ? data : (data.narratives || [])
}

export interface SourceCredibility {
  source_name: string
  credibility_score: number | null
  disinfo_flag_count: number
  is_flagged: boolean
}

export async function fetchSourceCredibilityList(flaggedOnly: boolean = false, limit: number = 50): Promise<SourceCredibility[]> {
  const qs = new URLSearchParams()
  if (flaggedOnly) qs.set("flagged_only", "true")
  qs.set("limit", String(limit))
  const resp = await fetch(`${API_URL}/disinfo/sources?${qs}`)
  if (!resp.ok) throw new Error(`Source credibility API error: ${resp.status}`)
  const data = await resp.json()
  return Array.isArray(data) ? data : []
}

// --- Policy Briefs ---

export interface PolicyBriefDetail {
  id: number
  brief_type: string
  domain?: string
  topic?: string
  markdown_content?: string
  entities?: string[]
  created_at: string
}

export interface PolicyBriefSummary {
  id: number
  brief_type: string
  domain?: string
  topic?: string
  created_at: string
}

export async function generateBrief(brief_type: string, domain?: string, topic?: string): Promise<PolicyBriefDetail> {
  const resp = await fetch(`${API_URL}/briefs/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ brief_type, domain, topic }),
  })
  if (!resp.ok) throw new Error(`Briefs API error: ${resp.status}`)
  return resp.json()
}

export async function fetchDailySitrep(hours: number = 24): Promise<PolicyBriefDetail> {
  const resp = await fetch(`${API_URL}/briefs/sitrep?hours=${hours}`)
  if (!resp.ok) throw new Error(`Briefs API error: ${resp.status}`)
  return resp.json()
}

export async function fetchBriefs(brief_type?: string, domain?: string, limit: number = 20): Promise<PolicyBriefSummary[]> {
  const qs = new URLSearchParams()
  if (brief_type) qs.set("brief_type", brief_type)
  if (domain) qs.set("domain", domain)
  if (limit) qs.set("limit", String(limit))
  
  const resp = await fetch(`${API_URL}/briefs?${qs}`)
  if (!resp.ok) throw new Error(`Briefs API error: ${resp.status}`)
  return resp.json()
}

export async function fetchBriefById(id: number): Promise<PolicyBriefDetail> {
  const resp = await fetch(`${API_URL}/briefs/${id}`)
  if (!resp.ok) throw new Error(`Briefs API error: ${resp.status}`)
  return resp.json()
}

// --- Predictions ---

export interface PredictionOut {
  id: number
  prediction_text: string
  domain?: string
  horizon?: string
  confidence: number
  confidence_components?: Record<string, number>
  entities?: string[]
  created_at: string
  expires_at?: string
  outcome?: string
}

export interface PredictionExplain extends PredictionOut {
  source_articles?: any[]
  reasoning_chain?: string[]
  graph_path?: string
}

export interface CalibrationBucket {
  confidence_min: number
  confidence_max: number
  total: number
  correct: number
  accuracy: number
}

export async function fetchPredictions(params?: { domain?: string; min_confidence?: number; outcome?: string; limit?: number }): Promise<PredictionOut[]> {
  const qs = new URLSearchParams()
  if (params?.domain) qs.set("domain", params.domain)
  if (params?.min_confidence !== undefined) qs.set("min_confidence", String(params.min_confidence))
  if (params?.outcome) qs.set("outcome", params.outcome)
  if (params?.limit) qs.set("limit", String(params.limit))
  
  const resp = await fetch(`${API_URL}/predictions?${qs}`)
  if (!resp.ok) throw new Error(`Predictions API error: ${resp.status}`)
  return resp.json()
}

export async function fetchPredictionExplain(id: number): Promise<PredictionExplain> {
  const resp = await fetch(`${API_URL}/predictions/${id}/explain`)
  if (!resp.ok) throw new Error(`Predictions API error: ${resp.status}`)
  return resp.json()
}

export async function fetchCalibration(): Promise<CalibrationBucket[]> {
  const resp = await fetch(`${API_URL}/predictions/calibration`)
  if (!resp.ok) throw new Error(`Predictions API error: ${resp.status}`)
  return resp.json()
}

export async function verifyPrediction(prediction_id: number, outcome: string, notes?: string): Promise<{ status: string }> {
  const resp = await fetch(`${API_URL}/predictions/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prediction_id, outcome, notes }),
  })
  if (!resp.ok) throw new Error(`Predictions verify error: ${resp.status}`)
  return resp.json()
}

export async function generatePredictions(n: number = 6): Promise<{ generated: number; predictions: PredictionOut[] }> {
  const resp = await fetch(`${API_URL}/predictions/generate?n=${n}`, { method: "POST" })
  if (!resp.ok) throw new Error(`Predictions generate error: ${resp.status}`)
  return resp.json()
}

// --- Language Analysis ---

export interface LanguageAnalysisResponse {
    language: { code: string; script: string }
    sentiment: { label: string; score: number }
    entities: { word: string; entity_group: string; score: number; start: number; end: number }[]
    processing_time_ms: number
    cached: boolean
}

export async function analyzeLanguage(text: string, enable_transliteration: boolean = false): Promise<LanguageAnalysisResponse> {
    const resp = await fetch(`${API_URL}/language/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, enable_transliteration }),
    })
    if (!resp.ok) throw new Error(`Language API error: ${resp.status}`)
    return resp.json()
}

export async function fetchLanguageStats(hours: number = 24): Promise<{ language_distribution: Record<string, number>, total_articles: number }> {
    const resp = await fetch(`${API_URL}/language/stats?hours=${hours}`)
    if (!resp.ok) throw new Error(`Language API error: ${resp.status}`)
    return resp.json()
}

export async function fetchEntitySentiment(entity_name: string, hours: number = 72): Promise<{ entity: string, average_sentiment: number, sample_size: number, dominant_sentiment: string }> {
    const resp = await fetch(`${API_URL}/language/sentiment/${encodeURIComponent(entity_name)}?hours=${hours}`)
    if (!resp.ok) throw new Error(`Language API error: ${resp.status}`)
    return resp.json()
}

// --- News Details ---

export async function fetchNewsSources(): Promise<{ source: string, count: number }[]> {
   const resp = await fetch(`${API_URL}/news/sources`)
   if (!resp.ok) throw new Error(`News API error: ${resp.status}`)
   const data = await resp.json()
   const sources = data.sources || data
   // Map backend field article_count → count
   return sources.map((s: { source: string; article_count?: number; count?: number }) => ({
     source: s.source,
     count: s.article_count ?? s.count ?? 0,
   }))
}

export async function fetchArticleById(id: number): Promise<NewsArticle> {
   const resp = await fetch(`${API_URL}/news/${id}`)
   if (!resp.ok) throw new Error(`News API error: ${resp.status}`)
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

export interface TemporalState {
  id: number
  entity_name: string
  entity_type: string
  attribute: string
  value: string
  temporal_marker?: string
  confidence: number
  valid_from?: string
  valid_to?: string
  is_current: boolean
  source_article_url?: string
  source_article_title?: string
}

export async function fetchTemporalStates(entity_name: string, from_date?: string, to_date?: string): Promise<{ entity_name: string, total: number, states: TemporalState[] }> {
    const qs = new URLSearchParams()
    if (from_date) qs.set("from_date", from_date)
    if (to_date) qs.set("to_date", to_date)
    
    const resp = await fetch(`${API_URL}/timeline/${encodeURIComponent(entity_name)}?${qs}`)
    if (!resp.ok) throw new Error(`Timeline API error: ${resp.status}`)
    return resp.json()
}

export async function fetchStateDiff(entity_name: string, from_date: string, to_date: string): Promise<{ new_states: any[], retired_states: any[] }> {
    const qs = new URLSearchParams({ from_date, to_date })
    const resp = await fetch(`${API_URL}/timeline/${encodeURIComponent(entity_name)}/diff?${qs}`)
    if (!resp.ok) throw new Error(`Timeline API error: ${resp.status}`)
    return resp.json()
}

export async function fetchGraphSnapshot(at?: string, entity_name?: string): Promise<{ at: string, total_entities: number, states: any[] }> {
    const qs = new URLSearchParams()
    if (at) qs.set("at", at)
    if (entity_name) qs.set("entity_name", entity_name)
    
    const resp = await fetch(`${API_URL}/snapshot?${qs}`)
    if (!resp.ok) throw new Error(`Snapshot API error: ${resp.status}`)
    return resp.json()
}

// --- Weather ---

export interface WeatherCity {
  name: string
  lat: number
  lon: number
  zone: string
}

export interface WeatherObservation {
  city: string
  lat: number
  lon: number
  date: string
  temperature_max: number
  temperature_min: number
  temperature_mean: number
  precipitation_sum: number
  humidity_mean: number
  wind_speed_max: number
  weather_code: number
  temp_max_zscore: number | null
  precip_zscore: number | null
  active_anomalies: any[]
}

export async function fetchWeatherCities(): Promise<{ cities: WeatherCity[] }> {
  const resp = await fetch(`${API_URL}/weather/cities`)
  if (!resp.ok) throw new Error(`Weather cities API error: ${resp.status}`)
  return resp.json()
}

export async function fetchCurrentWeather(): Promise<{ observations: WeatherObservation[] }> {
  const resp = await fetch(`${API_URL}/weather/current`)
  if (!resp.ok) throw new Error(`Current weather API error: ${resp.status}`)
  return resp.json()
}

export interface WeatherTrendPoint {
  date: string
  value: number
  normal: number | null
  z_score: number | null
}

export interface WeatherTrendsResponse {
  city: string
  variable: string
  period: string
  data: WeatherTrendPoint[]
  trend: number | null
}

export interface WeatherAnomaly {
  id: number
  city: string
  type: string
  severity: string
  start_date: string
  end_date: string
  peak_value: number
  z_score: number | null
  description: string | null
  detected_at: string
}

export interface WeatherAnomaliesResponse {
  anomalies: WeatherAnomaly[]
  count: number
}

export interface ClimateTrendsResponse {
  city: string
  variable: string
  trend: number | null
  annual_means: { year: number; mean: number }[]
  extreme_days: { year: number; count: number }[]
}

export async function fetchWeatherTrends(city: string, variable = "temperature_max", period = "30d"): Promise<WeatherTrendsResponse> {
  const qs = new URLSearchParams({ city, variable, period })
  const resp = await fetch(`${API_URL}/weather/trends?${qs}`)
  if (!resp.ok) throw new Error(`Weather trends API error: ${resp.status}`)
  return resp.json()
}

export async function fetchWeatherAnomalies(params?: { anomaly_type?: string; severity?: string; city?: string; days?: number }): Promise<WeatherAnomaliesResponse> {
  const qs = new URLSearchParams()
  if (params?.anomaly_type) qs.set("anomaly_type", params.anomaly_type)
  if (params?.severity) qs.set("severity", params.severity)
  if (params?.city) qs.set("city", params.city)
  if (params?.days !== undefined) qs.set("days", String(params.days))

  const resp = await fetch(`${API_URL}/weather/anomalies?${qs}`)
  if (!resp.ok) throw new Error(`Weather anomalies API error: ${resp.status}`)
  return resp.json()
}

export async function fetchWeatherMonsoon(year?: number, city?: string): Promise<{ year: number; analyses: unknown[]; count: number }> {
  const qs = new URLSearchParams()
  if (year !== undefined) qs.set("year", String(year))
  if (city) qs.set("city", city)

  const resp = await fetch(`${API_URL}/weather/monsoon?${qs}`)
  if (!resp.ok) throw new Error(`Weather monsoon API error: ${resp.status}`)
  return resp.json()
}

export async function fetchClimateTrends(city: string, variable = "temperature_max"): Promise<ClimateTrendsResponse> {
  const qs = new URLSearchParams({ city, variable })
  const resp = await fetch(`${API_URL}/weather/climate-trends?${qs}`)
  if (!resp.ok) throw new Error(`Climate trends API error: ${resp.status}`)
  return resp.json()
}

// ── Live weather (OpenWeatherMap) ────────────────────────────────────────────

export interface LiveWeatherObservation {
  city: string
  lat: number
  lon: number
  temperature: number | null
  feels_like: number | null
  temperature_min: number | null
  temperature_max: number | null
  humidity: number | null
  pressure: number | null
  visibility: number | null
  wind_speed: number | null
  wind_deg: number | null
  wind_gust: number | null
  rain_1h: number | null
  snow_1h: number | null
  cloudiness: number | null
  weather_id: number | null
  weather_main: string | null
  weather_description: string | null
  weather_icon: string | null
  sunrise: string | null
  sunset: string | null
  observed_at: string | null
  fetched_at: string
}

export interface LiveWeatherResponse {
  observations: LiveWeatherObservation[]
  count: number
  source: "openweathermap"
}

export async function fetchLiveWeather(city?: string): Promise<LiveWeatherResponse> {
  const qs = city ? `?city=${encodeURIComponent(city)}` : ""
  const resp = await fetch(`${API_URL}/weather/live${qs}`)
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new Error(err.detail || `Live weather API error: ${resp.status}`)
  }
  return resp.json()
}
