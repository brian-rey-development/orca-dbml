import { AppHeader } from './components/AppHeader'
import { AppPanes } from './components/AppPanes'
import { TooltipLayer } from './components/TooltipLayer'
import { useAppModel, type AppServices } from './hooks/use-app-model'
import './app.css'

export function App(services: AppServices) {
  const model = useAppModel(services)
  return (
    <div class="app">
      <AppHeader model={model} />
      <div class="app__body">
        <AppPanes model={model} />
      </div>
      <TooltipLayer />
    </div>
  )
}
