import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { DayState } from '../types'
import { drawerBuddy } from '../buddy'
import {
  addDaysToToday,
  addInboxItem,
  canChop,
  chopIntoBites,
  countReady,
  daysUntilDeadline,
  deadlinePhase,
  isChainMember,
  itemsByLevel,
  itemsWithDeadlinePhase,
  keepStaleItem,
  markStaleAsked,
  moveItem,
  nextPullable,
  nextStaleAsk,
  pullToTask,
  refreshReadyCapLatch,
  removeItem,
  setItemDeadline,
  setWaitingOn,
  snoozeItem,
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
  variant?: 'overlay' | 'page'
  onClose?: () => void
  aiChopOptIn?: boolean
  readyCap?: number
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
  readyCap: readyCapProp,
}: Props) {
  const { t, i18n } = useTranslation()
  const [draft, setDraft] = useState('')
  const [chopId, setChopId] = useState<string | null>(null)
  const [chopText, setChopText] = useState('')
  const [chopBusy, setChopBusy] = useState(false)
  const [chopErr, setChopErr] = useState<string | null>(null)
  const [openLevel, setOpenLevel] = useState<DrawerLevel | 'all'>('inbox')
  const [frozenOpen, setFrozenOpen] = useState(false)
  const [deadlineEditId, setDeadlineEditId] = useState<string | null>(null)
  const [snoozeId, setSnoozeId] = useState<string | null>(null)
  const [waitId, setWaitId] = useState<string | null>(null)
  const [waitDraft, setWaitDraft] = useState('')
  const [moreOpenId, setMoreOpenId] = useState<string | null>(null)
  const aiOptIn = aiChopOptIn ?? loadPrefs().drawerAiChopOptIn
  const readyCap =
    readyCapProp ?? loadPrefs().drawerReadyCap ?? DRAWER_READY_CAP_DEFAULT

  const readyCount = countReady(drawer.items)
  const chopOk = canChop(drawer, readyCap)
  const pullable = useMemo(() => nextPullable(drawer.items), [drawer.items])
  const emergency = useMemo(
    () => itemsWithDeadlinePhase(drawer.items, 'emergency'),
    [drawer.items],
  )
  const radar = useMemo(
    () => itemsWithDeadlinePhase(drawer.items, 'radar'),
    [drawer.items],
  )
  /** Angezeigte Frage — bleibt bis Antwort, auch nach Quiet-Markierung */
  const [activeStaleId, setActiveStaleId] = useState<string | null>(null)
  const markedStaleRef = useRef<string | null>(null)
  const staleItem = activeStaleId
    ? drawer.items.find((i) => i.id === activeStaleId) ?? null
    : null
  const chopParent = chopId
    ? drawer.items.find((i) => i.id === chopId)
    : undefined

  const buddyLine = drawerBuddy(day.buddyTone, {
    chopBlocked: !chopOk,
    emergencyCount: emergency.length,
    radarCount: radar.length,
  })

  function patchDrawer(
    updater: (d: DrawerState) => DrawerState,
  ) {
    setDrawer((prev) => refreshReadyCapLatch(updater(prev), readyCap))
  }

  useEffect(() => {
    if (activeStaleId) {
      if (!drawer.items.some((i) => i.id === activeStaleId)) {
        setActiveStaleId(null)
        markedStaleRef.current = null
      }
      return
    }
    const next = nextStaleAsk(drawer.items)
    if (!next) return
    setActiveStaleId(next.id)
    if (markedStaleRef.current !== next.id) {
      markedStaleRef.current = next.id
      patchDrawer((d) => markStaleAsked(d, next.id))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawer.items, activeStaleId])

  function answerStaleKeep() {
    if (!staleItem) return
    patchDrawer((d) => keepStaleItem(d, staleItem.id))
    setActiveStaleId(null)
    markedStaleRef.current = null
  }

  function answerStaleRest() {
    if (!staleItem) return
    patchDrawer((d) =>
      moveItem(keepStaleItem(d, staleItem.id), staleItem.id, 'frozen'),
    )
    setActiveStaleId(null)
    markedStaleRef.current = null
  }

  function answerStaleDiscard() {
    if (!staleItem) return
    const chain = isChainMember(drawer, staleItem)
    const ok = window.confirm(
      chain ? t('drawer.staleDiscardChainWarn') : t('drawer.staleDiscardWarn'),
    )
    if (!ok) return
    patchDrawer((d) => removeItem(d, staleItem.id))
    setActiveStaleId(null)
    markedStaleRef.current = null
  }

  function addDrop() {
    patchDrawer((d) => addInboxItem(d, draft))
    setDraft('')
    setOpenLevel('inbox')
  }

  function pullItem(item: DrawerItem) {
    if (!canAddSize(day.capacity, day.tasks, 'small')) return
    const task = pullToTask(item, day.mood, 'small')
    setDay((d) => ({ ...d, tasks: [...d.tasks, task] }))
    patchDrawer((d) => removeItem(d, item.id))
  }

  function submitChop() {
    if (!chopId) return
    const lines = chopText
      .split(/\n|;/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (lines.length === 0) return
    if (!canChop(drawer, readyCap)) return
    patchDrawer((d) => chopIntoBites(d, chopId, lines))
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

  function openChop(item: DrawerItem) {
    setChopId(item.id)
    setChopText('')
    setChopErr(null)
  }

  function deadlineLabel(item: DrawerItem): string | null {
    const phase = deadlinePhase(item)
    if (phase === 'none' || !item.deadline) return null
    const days = daysUntilDeadline(item.deadline)
    if (days === null) return null
    if (days < 0) return t('drawer.deadlineOverdue', { days: Math.abs(days) })
    if (days === 0) return t('drawer.deadlineToday')
    if (days === 1) return t('drawer.deadlineTomorrow')
    return t('drawer.deadlineInDays', { days, date: item.deadline })
  }

  function renderItem(item: DrawerItem, level: DrawerLevel | 'deadline') {
    const phase = deadlinePhase(item)
    const dLabel = deadlineLabel(item)
    const itemLevel = item.level
    return (
      <li
        key={item.id}
        className={`drawer-item${phase === 'emergency' ? ' drawer-item--emergency' : ''}${phase === 'radar' ? ' drawer-item--radar' : ''}`}
      >
        <div className="drawer-item-main">
          <strong>{item.title}</strong>
          {item.isChunk && (
            <span className="drawer-chip">{t('drawer.chunk')}</span>
          )}
          {item.parentId && (
            <span className="drawer-chip">{t('drawer.bite')}</span>
          )}
          {item.waitingOn && (
            <span className="drawer-chip drawer-chip--wait">
              {t('drawer.waitingOnChip', { who: item.waitingOn })}
            </span>
          )}
          {itemLevel === 'defer' && item.snoozeUntil && (
            <span className="drawer-chip">
              {t('drawer.snoozeUntilChip', { date: item.snoozeUntil })}
            </span>
          )}
          {dLabel && (
            <span
              className={`drawer-chip drawer-chip--deadline drawer-chip--${phase}`}
            >
              {dLabel}
            </span>
          )}
        </div>
        <div className="drawer-item-actions">
          {(itemLevel === 'inbox' || item.isChunk) && item.isChunk !== false && (
            <button
              type="button"
              className="secondary sm"
              disabled={!chopOk}
              title={chopOk ? undefined : t('drawer.capBlocked')}
              onClick={() => openChop(item)}
            >
              {t('drawer.chop')}
            </button>
          )}
          {itemLevel === 'ready' && !item.isChunk && (
            <button
              type="button"
              className="primary sm"
              disabled={!canAddSize(day.capacity, day.tasks, 'small')}
              onClick={() => pullItem(item)}
            >
              {t('drawer.pull')}
            </button>
          )}
          {itemLevel === 'defer' && (
            <button
              type="button"
              className="secondary sm"
              onClick={() => patchDrawer((d) => moveItem(d, item.id, 'inbox'))}
            >
              {t('drawer.backToInbox')}
            </button>
          )}
          {itemLevel === 'frozen' && (
            <button
              type="button"
              className="secondary sm"
              onClick={() => patchDrawer((d) => moveItem(d, item.id, 'ready'))}
            >
              {t('drawer.thaw')}
            </button>
          )}
          <button
            type="button"
            className={`ghost sm drawer-item-more${moreOpenId === item.id ? ' on' : ''}`}
            aria-expanded={moreOpenId === item.id}
            aria-label={t('drawer.itemMoreAria')}
            onClick={() =>
              setMoreOpenId((id) => (id === item.id ? null : item.id))
            }
          >
            {t('drawer.itemMore')}
          </button>
        </div>
        {moreOpenId === item.id && (
          <div className="drawer-item-actions drawer-item-actions--more">
            <button
              type="button"
              className="ghost sm"
              onClick={() =>
                setSnoozeId((id) => (id === item.id ? null : item.id))
              }
            >
              {t('drawer.snooze')}
            </button>
            <button
              type="button"
              className="ghost sm"
              onClick={() => {
                setWaitId((id) => (id === item.id ? null : item.id))
                setWaitDraft(item.waitingOn ?? '')
              }}
            >
              {t('drawer.waitingOn')}
            </button>
            <button
              type="button"
              className="ghost sm"
              onClick={() =>
                setDeadlineEditId((id) => (id === item.id ? null : item.id))
              }
            >
              {t('drawer.deadlineSet')}
            </button>
            {LEVELS.filter((l) => l !== itemLevel && l !== 'defer').map((l) => (
              <button
                key={l}
                type="button"
                className="ghost sm"
                onClick={() => patchDrawer((d) => moveItem(d, item.id, l))}
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
                  if (!window.confirm(t('drawer.deleteChainWarn'))) return
                }
                patchDrawer((d) => removeItem(d, item.id))
              }}
            >
              ✕
            </button>
          </div>
        )}
        {snoozeId === item.id && (
          <div className="drawer-deadline-edit">
            <span className="block-hint">{t('drawer.snoozeHint')}</span>
            <button
              type="button"
              className="secondary sm"
              onClick={() => {
                patchDrawer((d) => snoozeItem(d, item.id, addDaysToToday(1)))
                setSnoozeId(null)
              }}
            >
              {t('drawer.snoozeTomorrow')}
            </button>
            <button
              type="button"
              className="secondary sm"
              onClick={() => {
                patchDrawer((d) => snoozeItem(d, item.id, addDaysToToday(3)))
                setSnoozeId(null)
              }}
            >
              {t('drawer.snooze3d')}
            </button>
            <button
              type="button"
              className="secondary sm"
              onClick={() => {
                patchDrawer((d) => snoozeItem(d, item.id, addDaysToToday(7)))
                setSnoozeId(null)
              }}
            >
              {t('drawer.snooze7d')}
            </button>
            <label>
              <span className="block-hint">{t('drawer.snoozeDate')}</span>
              <input
                type="date"
                onChange={(e) => {
                  if (!e.target.value) return
                  patchDrawer((d) => snoozeItem(d, item.id, e.target.value))
                  setSnoozeId(null)
                }}
              />
            </label>
          </div>
        )}
        {waitId === item.id && (
          <form
            className="drawer-deadline-edit"
            onSubmit={(e) => {
              e.preventDefault()
              patchDrawer((d) => setWaitingOn(d, item.id, waitDraft))
              setWaitId(null)
            }}
          >
            <label>
              <span className="block-hint">{t('drawer.waitingOnHint')}</span>
              <input
                value={waitDraft}
                onChange={(e) => setWaitDraft(e.target.value)}
                placeholder={t('drawer.waitingOnPlaceholder')}
                maxLength={80}
              />
            </label>
            <button type="submit" className="primary sm">
              {t('common.ok')}
            </button>
            {item.waitingOn && (
              <button
                type="button"
                className="ghost sm"
                onClick={() => {
                  patchDrawer((d) => setWaitingOn(d, item.id, null))
                  setWaitId(null)
                }}
              >
                {t('drawer.waitingOnClear')}
              </button>
            )}
          </form>
        )}
        {deadlineEditId === item.id && (
          <div className="drawer-deadline-edit">
            <label>
              <span className="block-hint">{t('drawer.deadlineLabel')}</span>
              <input
                type="date"
                value={item.deadline ?? ''}
                onChange={(e) => {
                  const v = e.target.value || null
                  patchDrawer((d) => setItemDeadline(d, item.id, v))
                }}
              />
            </label>
            {item.deadline && (
              <button
                type="button"
                className="ghost sm"
                onClick={() => {
                  patchDrawer((d) => setItemDeadline(d, item.id, null))
                  setDeadlineEditId(null)
                }}
              >
                {t('drawer.deadlineClear')}
              </button>
            )}
          </div>
        )}
        {level === 'deadline' && phase === 'emergency' && item.isChunk && (
          <p className="block-hint">{t('drawer.deadlineEmergencyChop')}</p>
        )}
      </li>
    )
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
      <p className="block-hint">
        {variant === 'overlay' ? t('drawer.leadShort') : t('drawer.lead')}
      </p>
      {buddyLine && (
        <div className="buddy-card drawer-buddy" role="status">
          <span className="buddy-label">{t('common.buddy')}</span>
          <p>{buddyLine}</p>
        </div>
      )}
      {(variant === 'page' || readyCount > 0 || !chopOk) && (
        <p className="drawer-cap-line">
          {t('drawer.readyCap', {
            used: readyCount,
            max: readyCap,
          })}
        </p>
      )}

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

      {staleItem && (
        <div className="drawer-stale-card" role="status">
          <p className="drawer-stale-lead">{t('drawer.staleLead')}</p>
          <p className="drawer-stale-title">
            <strong>{staleItem.title}</strong>
          </p>
          {isChainMember(drawer, staleItem) && (
            <p className="block-hint">{t('drawer.staleChainHint')}</p>
          )}
          <div className="carry-actions drawer-stale-actions">
            <button type="button" className="primary sm" onClick={answerStaleKeep}>
              {t('drawer.staleKeep')}
            </button>
            <button
              type="button"
              className="secondary sm"
              onClick={answerStaleRest}
            >
              {t('drawer.staleRest')}
            </button>
            <button
              type="button"
              className="ghost sm"
              onClick={answerStaleDiscard}
            >
              {t('drawer.staleDiscard')}
            </button>
          </div>
        </div>
      )}

      {emergency.length > 0 && (
        <div className="drawer-deadline-block drawer-deadline-block--emergency">
          <h3>{t('drawer.deadlineEmergencyTitle')}</h3>
          <p className="block-hint">{t('drawer.deadlineEmergencyHint')}</p>
          <ul className="drawer-item-list">
            {emergency.map((item) => renderItem(item, 'deadline'))}
          </ul>
        </div>
      )}

      {radar.length > 0 &&
        (variant === 'page' ? (
          <div className="drawer-deadline-block drawer-deadline-block--radar">
            <h3>{t('drawer.deadlineRadarTitle')}</h3>
            <p className="block-hint">{t('drawer.deadlineRadarHint')}</p>
            <ul className="drawer-item-list">
              {radar.map((item) => renderItem(item, 'deadline'))}
            </ul>
          </div>
        ) : (
          <details className="drawer-deadline-block drawer-deadline-block--radar">
            <summary>
              {t('drawer.deadlineRadarTitle')} ({radar.length})
            </summary>
            <p className="block-hint">{t('drawer.deadlineRadarHint')}</p>
            <ul className="drawer-item-list">
              {radar.map((item) => renderItem(item, 'deadline'))}
            </ul>
          </details>
        ))}

      {pullable.length > 0 && (
        <div className="drawer-pull-block">
          <h3>{t('drawer.pullTitle')}</h3>
          <ul className="task-list">
            {pullable.slice(0, 6).map((item) => (
              <li key={item.id}>
                <span className="task-main">
                  {item.title}
                  {deadlinePhase(item) === 'emergency' && (
                    <span className="drawer-chip drawer-chip--emergency">
                      {t('drawer.deadlineUrgentChip')}
                    </span>
                  )}
                </span>
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
        {(
          (variant === 'overlay'
            ? LEVELS
            : (['all', ...LEVELS] as const)) as readonly (DrawerLevel | 'all')[]
        ).map((lv) => (
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
          const emptyHint = t(`drawer.emptyLevelBy.${level}`, {
            defaultValue: t('drawer.emptyLevel'),
          })
          if (level === 'frozen' && openLevel === 'all') {
            return (
              <details
                key={level}
                className="drawer-level-block drawer-frozen-fold"
                open={frozenOpen}
                onToggle={(e) =>
                  setFrozenOpen((e.target as HTMLDetailsElement).open)
                }
              >
                <summary>
                  {t(`drawer.level.${level}`)} ({items.length})
                </summary>
                {items.length === 0 ? (
                  <p className="block-hint">{emptyHint}</p>
                ) : (
                  <ul className="drawer-item-list">
                    {items.map((item) => renderItem(item, level))}
                  </ul>
                )}
              </details>
            )
          }
          return (
            <div key={level} className="drawer-level-block">
              {openLevel === 'all' && <h3>{t(`drawer.level.${level}`)}</h3>}
              {items.length === 0 ? (
                <p className="block-hint">{emptyHint}</p>
              ) : (
                <ul className="drawer-item-list">
                  {items.map((item) => renderItem(item, level))}
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
              disabled={chopBusy || !chopText.trim() || !chopOk}
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
