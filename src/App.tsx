import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import GraphPage from "@/pages/GraphPage"
import AuthPage from "@/pages/AuthPage"
import DomainLayout from "@/layouts/DomainLayout"
import NewsListPage from "@/pages/NewsListPage"
import ArticleDetailPage from "@/pages/ArticleDetailPage"

// Domain Pages
import GeopoliticsPage from "@/pages/domains/GeopoliticsPage"
import EconomyPage from "@/pages/domains/EconomyPage"
import DefensePage from "@/pages/domains/DefensePage"
import ClimatePage from "@/pages/domains/ClimatePage"
import TechnologyPage from "@/pages/domains/TechnologyPage"

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("auth_token")
  if (!token) return <Navigate to="/auth" replace />
  return <>{children}</>
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/" element={<RequireAuth><GraphPage /></RequireAuth>} />
        <Route path="/news" element={<RequireAuth><NewsListPage /></RequireAuth>} />
        <Route path="/news/:id" element={<RequireAuth><ArticleDetailPage /></RequireAuth>} />

        <Route path="/domains" element={<RequireAuth><DomainLayout /></RequireAuth>}>
           <Route path="geopolitics" element={<GeopoliticsPage />} />
           <Route path="economy" element={<EconomyPage />} />
           <Route path="defense" element={<DefensePage />} />
           <Route path="climate" element={<ClimatePage />} />
           <Route path="technology" element={<TechnologyPage />} />
           {/* Add other pages here as needed */}
           <Route path="*" element={<div className="p-4 text-white">Domain Dashboard Under Construction</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
