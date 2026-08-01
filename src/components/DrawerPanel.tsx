import type { DayState } from '../types'
import type { DrawerState } from '../drawer/types'
import { DrawerWorkspace } from './DrawerWorkspace'

type Props = {
  open: boolean
  onClose: () => void
  drawer: DrawerState
  setDrawer: React.Dispatch<React.SetStateAction<DrawerState>>
  day: DayState
  setDay: React.Dispatch<React.SetStateAction<DayState>>
  aiChopOptIn?: boolean
}

/** Overlay aus dem Tagesanker heraus — gleiche Oberfläche wie die Schublade-App */
export function DrawerPanel({
  open,
  onClose,
  drawer,
  setDrawer,
  day,
  setDay,
  aiChopOptIn,
}: Props) {
  if (!open) return null

  return (
    <div className="spark-overlay drawer-overlay" role="dialog" aria-modal>
      <div className="spark-panel drawer-panel">
        <DrawerWorkspace
          variant="overlay"
          onClose={onClose}
          drawer={drawer}
          setDrawer={setDrawer}
          day={day}
          setDay={setDay}
          aiChopOptIn={aiChopOptIn}
        />
      </div>
    </div>
  )
}
