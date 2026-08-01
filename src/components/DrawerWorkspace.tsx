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
import { suggestChopBites } from '../drawer/chopAi'
import {
  DRAWER_READY_CAP_DEFAULT,
  type DrawerItem,
  type DrawerLevel,
  type DrawerState,
} from '../drawer/types'
import { canAddSize } from '../capacity'
import { loadPrefs } from '../storage'

type Props = {
  drawer: DrawerState
  setDrawer: React.Dispatch<React.SetStateAction<DrawerState>>
  day: DayState
  setDay: React.Dispatch<React.SetStateAction<DayState>>
  /** Overlay: Schließen-Knopf; page: freistehende App */
  variant?: 'overlay' | 'page'
  onClose?: () => void
  /** KI-Opt-in; wenn gesetzt, steuert Parent (sonst Prefs) */
  aiChopOptIn?: boolean
}

const LEVELS: DrawerLevel[] = ['inbox', 'ready', 'defer', 'frozen']

export function DrawerWorkspace({
  drawer,
  setDrawer,
  day,
  setDay,
  variant = 'page',
  onClose,
  aiChopOptIn,
}: Props) {
  const { t, i18n } = useTranslation()
  const [draft, setDraft] = useState('')
  const [chopId, setChopId] = useState<string | null>(null)
  const [chopText, setChopText] = useState('')
  const [chopBusy, setChopBusy] = useState(false)
  const [chopErr, setChopErr] = useState<string | null>(null)
  const [openLevel, setOpenLevel] = useState<DrawerLevel | 'all'>('inbox')
  const aiOptIn = aiChopOptIn ?? loadPrefs().drawerAiChopOptIn

  const readyCount = countReady(drawer.items)
  const chopOk = canChop(drawer.items)
  const pullable = useMemo(() => nextPullable(drawer.items), [drawer.items])
  const chopParent = chopId
    ? drawer.items.find((i) => i.id === chopId)
    : undefined

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
    if (!canChop(drawer.items) && readyCount >= DRAWER_READY_CAP_DEFAULT) return
    setDrawer((d) => chopIntoBites(d, chopId, lines))
    setChopId(null)
    setChopText('')
    setChopErr(null)
    setOpenLevel('ready')
  }

  async function runAiSuggest() {
    if (!chopParent || chopBusy) return
    setChopBusy(true)
    setChopErr(null)
    const result = await suggestChopBites(
      chopParent.title,
      i18n.language.startsWith('en') ? 'en' : 'de',
    )
    setChopBusy(false)
    if (!result.ok) {
      const key = `drawer.chopAiError.${result.error}`
      const msg = t(key)
      setChopErr(msg === key ? t('drawer.chopAiError.generic') : msg)
      return
    }
    setChopText(result.bites.join('\n'))
  }

  return (
    <div className={`drawer-workspace drawer-workspace--${variant}`}>
      {variant === 'overlay' ? (
        <div className="drawer-panel-head">
          <h2>{t('drawer.title')}</h2>
          {onClose && (
            <button type="button" className="ghost sm" onClick={onClose}>
              {t('common.ok')}
            </button>
          )}
        </div>
      ) : null}
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
            {lv === 'all' ? t('drawer.levelAll') : t(`drawer.level.${lv}`)}
          </button>
        ))}
      </div>

      {LEVELS.filter((lv) => openLevel === 'all' || openLevel === lv).map(
        (level) => {
          const items = itemsByLevel(drawer, level)
          if (openLevel === 'all' && items.length === 0) return null
          return (
            <div key={level} className="drawer-level-block">
              {openLevel === 'all' && <h3>{t(`drawer.level.${level}`)}</h3>}
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
                            title={chopOk ? undefined : t('drawer.capBlocked')}
                              onClick={() => {
                                setChopId(item.id)
                                setChopText('')
                                setChopErr(null)
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
          {chopParent && (
            <p className="drawer-chop-parent">
              <strong>{chopParent.title}</strong>
            </p>
          )}
          <p className="block-hint">{t('drawer.chopHint')}</p>
          {aiOptIn ? (
            <div className="carry-actions drawer-chop-ai-row">
              <button
                type="button"
                className="secondary"
                disabled={chopBusy || !chopParent}
                onClick={() => void runAiSuggest()}
              >
                {chopBusy ? t('drawer.chopAiBusy') : t('drawer.chopAiSuggest')}
              </button>
            </div>
          ) : (
            <p className="block-hint">{t('drawer.chopAiOptInHint')}</p>
          )}
          {chopErr && (
            <p className="block-hint drawer-chop-err" role="alert">
              {chopErr}
            </p>
          )}
          <textarea
            rows={4}
            value={chopText}
            onChange={(e) => setChopText(e.target.value)}
            placeholder={t('drawer.chopPlaceholder')}
            disabled={chopBusy}
          />
          <div className="carry-actions">
            <button
              type="button"
              className="primary"
              disabled={chopBusy || !chopText.trim()}
              onClick={submitChop}
            >
              {t('drawer.chopSave')}
            </button>
            <button
              type="button"
              className="ghost"
              disabled={chopBusy}
              onClick={() => {
                setChopId(null)
                setChopText('')
                setChopErr(null)
              }}
            >
              {t('drawer.chopCancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
