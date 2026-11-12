
import Sidebar from './Sidebar'
import AppHeader from './AppHeader'
import './AppLayout.css'

type AppLayoutProps = {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="app-layout">
      <Sidebar />

      <div className="app-layout-main">
        <AppHeader />

        <main className="app-layout-content">
          {children}
        </main>
      </div>
    </div>
  )
}
