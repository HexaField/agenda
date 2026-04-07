import type { ParentComponent } from 'solid-js'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { ViewRouter } from './views/ViewRouter'

export const Shell: ParentComponent = () => {
  return (
    <div class="flex h-screen overflow-hidden bg-zinc-950 text-white">
      <Sidebar />
      <div class="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main class="flex-1 overflow-hidden">
          <ViewRouter />
        </main>
      </div>
    </div>
  )
}
