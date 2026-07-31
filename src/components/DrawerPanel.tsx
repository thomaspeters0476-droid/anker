import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { DayState } from '../types'
import {
  addInboxItem,
  canChop,
  chopIntoBites,
  countReady,
  itemsByLevel,
  moveItem,
  nextPullable,
  pullToTask,
  removeItem,
} from '../drawer/logic'
import {
  DRAWER_READY_CAP_DEFAULT,
  type DrawerItem,
  type DrawerLevel,
  type DrawerState,
} from '../drawer/types'
import { canAddSize } from '../capacity'

type Props = {
  open: boolean
  onClose: () => void
  drawer: DrawerState
  setDrawer: React.Dispatch<React.SetStateAction<DrawerState>>
  day: DayState
  setDay: React.Dispatch<React.SetStateAction<DayState>>
}

const LEVELS: DrawerLevel[] = ['inbox', 'ready', 'defer', 'frozen']

export function DrawerPanel({
  open,
  onClose,
  drawer,
  setDrawer,
  day,
  setDay,
}: Props) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState('')
  const [chopId, setChopId] = useState<string | null>(null)
  const [chopText, setChopText] = useState('')
  const [openLevel, setOpenLevel] = useState<DrawerLevel | 'all'>('inbox')

  const readyCount = countReady(drawer.items)
  const chopOk = canChop(drawer.items)
  const pullable = useMemo(() => nextPullable(drawer.items), [drawer.items])

  if (!open) return null

  function addDrop() {
    setDrawer((d) => addInboxItem(d, draft))
    setDraft('')
    setOpenLevel('inbox')
  }

  function pullItem(item: DrawerItem) {
    if (!canAddSize(day.capacity, day.tasks, 'small')) return
    const task = pullToTask(item, day.mood, 'small')
    setDay((d) => ({ ...d, tasks: [...d.tasks, task] }))
    setDrawer((d) => removeItem(d, item.id))
  }

  function submitChop() {
    if (!chopId) return
    const lines = chopText
      .split(/\n|;/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (lines.length === 0) return
    if (!canChop(drawer.items) && lines.length > 0) {
      // Cap: block if already at cap
      if (readyCount >= DRAWER_READY_CAP_DEFAULT) return
    }
    setDrawer((d) => chopIntoBites(d, chopId, lines))
    setChopId(null)
    setChopText('')
    setOpenLevel('ready')
  }

  return (
    <div className="spark-overlay drawer-overlay" role="dialog" aria-modal>
      <div className="spark-panel drawer-panel">
        <div className="drawer-panel-head">
          <h2>{t('drawer.title')}</h2>
          <button type="button" className="ghost sm" onClick={onClose}>
            {t('common.ok')}
          </button>
        </div>
        <p className="block-hint">{t('drawer.lead')}</p>
        <p className="drawer-cap-line">
          {t('drawer.readyCap', {
            used: readyCount,
            max: DRAWER_READY_CAP_DEFAULT,
          })}
        </p>

        <form
          className="add-row"
          onSubmit={(e) => {
            e.preventDefault()
            addDrop()
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t('drawer.dropPlaceholder')}
            maxLength={120}
          />
          <button type="submit" className="primary sm" disabled={!draft.trim()}>
            {t('drawer.drop')}
          </button>
        </form>

        {pullable.length > 0 && (
          <div className="drawer-pull-block">
            <h3>{t('drawer.pullTitle')}</h3>
            <ul className="task-list">
              {pullable.slice(0, 6).map((item) => (
                <li key={item.id}>
                  <span className="task-main">{item.title}</span>
                  <button
                    type="button"
                    className="primary sm"
                    disabled={!canAddSize(day.capacity, day.tasks, 'small')}
                    onClick={() => pullItem(item)}
                  >
                    {t('drawer.pull')}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="drawer-level-tabs" role="tablist">
          {(['all', ...LEVELS] as const).map((lv) => (
            <button
              key={lv}
              type="button"
              role="tab"
              className={openLevel === lv ? 'on' : ''}
              onClick={() => setOpenLevel(lv)}
            >
              {lv === 'all'
                ? t('drawer.levelAll')
                : t(`drawer.level.${lv}`)}
            </button>
          ))}
        </div>

        {LEVELS.filter((lv) => openLevel === 'all' || openLevel === lv).map(
          (level) => {
            const items = itemsByLevel(drawer, level)
            if (openLevel === 'all' && items.length === 0) return null
            return (
              <div key={level} className="drawer-level-block">
                {openLevel === 'all' && (
                  <h3>{t(`drawer.level.${level}`)}</h3>
                )}
                {items.length === 0 ? (
                  <p className="block-hint">{t('drawer.emptyLevel')}</p>
                ) : (
                  <ul className="drawer-item-list">
                    {items.map((item) => (
                      <li key={item.id} className="drawer-item">
                        <div className="drawer-item-main">
                          <strong>{item.title}</strong>
                          {item.isChunk && (
                            <span className="drawer-chip">
                              {t('drawer.chunk')}
                            </span>
                          )}
                          {item.parentId && (
                            <span className="drawer-chip">
                              {t('drawer.bite')}
                            </span>
                          )}
                        </div>
                        <div className="drawer-item-actions">
                          {level === 'inbox' && item.isChunk !== false && (
                            <button
                              type="button"
                              className="secondary sm"
                              disabled={!chopOk}
                              title={
                                chopOk ? undefined : t('drawer.capBlocked')
                              }
                              onClick={() => {
                                setChopId(item.id)
                                setChopText('')
                              }}
                            >
                              {t('drawer.chop')}
                            </button>
                          )}
                          {LEVELS.filter((l) => l !== level).map((l) => (
                            <button
                              key={l}
                              type="button"
                              className="ghost sm"
                              onClick={() =>
                                setDrawer((d) => moveItem(d, item.id, l))
                              }
                            >
                              → {t(`drawer.levelShort.${l}`)}
                            </button>
                          ))}
                          <button
                            type="button"
                            className="ghost sm"
                            onClick={() => {
                              if (
                                item.parentId ||
                                drawer.items.some((x) => x.parentId === item.id)
                              ) {
                                if (
                                  !window.confirm(t('drawer.deleteChainWarn'))
                                ) {
                                  return
                                }
                              }
                              setDrawer((d) => removeItem(d, item.id))
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          },
        )}

        {chopId && (
          <div className="drawer-chop-sheet">
            <h3>{t('drawer.chopTitle')}</h3>
            <p className="block-hint">{t('drawer.chopHint')}</p>
            <textarea
              rows={4}
              value={chopText}
              onChange={(e) => setChopText(e.target.value)}
              placeholder={t('drawer.chopPlaceholder')}
            />
            <div className="carry-actions">
              <button type="button" className="primary" onClick={submitChop}>
                {t('drawer.chopSave')}
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setChopId(null)
                  setChopText('')
                }}
              >
                {t('drawer.chopCancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
