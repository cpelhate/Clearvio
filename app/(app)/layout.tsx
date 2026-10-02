import { Sidebar } from "@/components/layout/sidebar"
import { MainWrapper } from "@/components/layout/main-wrapper"
import { ToastProvider } from "@/components/ui/toast"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-bg-tertiary)" }}>
        <Sidebar />
        <MainWrapper>{children}</MainWrapper>
      </div>
    </ToastProvider>
  )
}
