import type { DayState } from '../types'
import type { DrawerState } from '../drawer/types'
import { DrawerWorkspace } from './DrawerWorkspace'

type Props = {
  open: boolean
  onClose: () => void
  mode?: 'drop' | 'pull'
  drawer: DrawerState
  setDrawer: React.Dispatch<React.SetStateAction<DrawerState>>
  day: DayState
  setDay: React.Dispatch<React.SetStateAction<DayState>>
  aiChopOptIn?: boolean
  readyCap?: number
}

/** Overlay aus dem Tagesanker — ablegen oder holen; Pflege in /schublade */
export function DrawerPanel({
  open,
  onClose,
  mode = 'drop',
  drawer,
  setDrawer,
  day,
  setDay,
  aiChopOptIn,
  readyCap,
}: Props) {
  if (!open) return null

  return (
    <div className="spark-overlay drawer-overlay" role="dialog" aria-modal>
      <div
        className={`spark-panel drawer-panel drawer-panel--drop${mode === 'pull' ? ' drawer-panel--pull' : ''}`}
      >
        <DrawerWorkspace
          variant="overlay"
          mode={mode}
          onClose={onClose}
          drawer={drawer}
          setDrawer={setDrawer}
          day={day}
          setDay={setDay}
          aiChopOptIn={aiChopOptIn}
          readyCap={readyCap}
        />
      </div>
    </div>
  )
}
