import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { DayState } from '../types'
import {
  drawerBuddy,
  drawerChoppedOk,
  drawerPulledOk,
} from '../buddy'
import {
  addDaysToToday,
  addInboxItem,
  canChop,
  chainPullRole,
  childrenOf,
  chopIntoBites,
  countReady,
  daysUntilDeadline,
  deadlinePhase,
  earlierChainStep,
  groupItemsByParent,
  isChainMember,
  itemsByLevel,
  itemsByLevelTop,
  itemsWithDeadlinePhase,
  keepStaleItem,
  markStaleAsked,
  countTrash,
  emptyTrash,
  moveItem,
  moveItems,
  nextEnergy,
  nextPullable,
  nextStaleAsk,
  parentOf,
  pullToTask,
  setItemEnergy,
  readyRestCandidates,
  refreshReadyCapLatch,
  removeItem,
  restoreFromTrash,
  setItemDeadline,
  setWaitingOn,
  snoozeItem,
  sortReadyForFocus,
  trashItem,
  trashTopItems,
} from '../drawer/logic'
import { suggestChopBites } from '../drawer/chopAi'
import {
  CHOP_AI_DAILY_LIMIT,
  CHOP_AI_MONTHLY_LIMIT,
  canUseChopAi,
  freeDayRemaining,
  freeMonthRemaining,
  refreshChopWallet,
  usesFreeQuota,
  walletBalanceCached,
} from '../drawer/chopAiQuota'
import { ChopAiPackBuy } from './ChopAiPackBuy'
import { useOnline } from '../online'
import {
  bitesTooFine,
  CHOP_MAX,
  CHOP_MIN,
  looksAlreadySmall,
  parseChopLines,
} from '../drawer/chopGuards'
import {
  DRAWER_INBOX_FOCUS,
  DRAWER_PULL_FOCUS,
  DRAWER_READY_CAP_DEFAULT,
  DRAWER_READY_FOCUS,
  DRAWER_TIDY_AT,
  DRAWER_TIDY_REST,
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
  /** full = Pflege · drop = ablegen · pull = auf den Tag holen (Anker-Overlay) */
  mode?: 'full' | 'drop' | 'pull'
  /** Aufschub/Eingefroren/Radar-Fläche — sonst nur Eingang + Bereit */
  advanced?: boolean
  onClose?: () => void
  aiChopOptIn?: boolean
  readyCap?: number
}

const LEVELS: DrawerLevel[] = ['inbox', 'ready', 'defer', 'frozen']
const SIMPLE_LEVELS: DrawerLevel[] = ['inbox', 'ready']

export function DrawerWorkspace({
  drawer,
  setDrawer,
  day,
  setDay,
  variant = 'page',
  mode = 'full',
  advanced: advancedProp,
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
  const [deferOpen, setDeferOpen] = useState(false)
  const [readyMoreOpen, setReadyMoreOpen] = useState(false)
  const [inboxMoreOpen, setInboxMoreOpen] = useState(false)
  const [tidyDismissed, setTidyDismissed] = useState(false)
  const [actionFlash, setActionFlash] = useState<string | null>(null)
  const [deadlineEditId, setDeadlineEditId] = useState<string | null>(null)
  const [snoozeId, setSnoozeId] = useState<string | null>(null)
  const [waitId, setWaitId] = useState<string | null>(null)
  const [waitDraft, setWaitDraft] = useState('')
  const [moreOpenId, setMoreOpenId] = useState<string | null>(null)
  /** Aufgeklappte Brocken → Häppchen darunter */
  const [expandedChunkId, setExpandedChunkId] = useState<string | null>(null)
  const [chopSteer, setChopSteer] = useState<
    'already_small' | 'too_fine' | 'too_many' | null
  >(null)
  /** Ketten-Vorziehen: Buddy fragt nach Bestätigung */
  const [pullConfirmId, setPullConfirmId] = useState<string | null>(null)
  const aiOptIn = aiChopOptIn ?? loadPrefs().drawerAiChopOptIn
  const online = useOnline()
  const [aiQuotaTick, setAiQuotaTick] = useState(0)
  useEffect(() => {
    void refreshChopWallet().then(() => setAiQuotaTick((n) => n + 1))
  }, [])
  const walletLeft = aiQuotaTick >= 0 ? walletBalanceCached() : 0
  const aiQuotaOk = aiQuotaTick >= 0 ? canUseChopAi() : false
  const showFree = aiQuotaTick >= 0 ? usesFreeQuota() : true
  const readyCap =
    readyCapProp ?? loadPrefs().drawerReadyCap ?? DRAWER_READY_CAP_DEFAULT
  const advanced = advancedProp ?? loadPrefs().drawerAdvanced
  const levelTabs: readonly (DrawerLevel | 'all')[] = advanced
    ? variant === 'page'
      ? (['all', ...LEVELS] as const)
      : LEVELS
    : SIMPLE_LEVELS

  useEffect(() => {
    if (
      !advanced &&
      (openLevel === 'all' || openLevel === 'defer' || openLevel === 'frozen')
    ) {
      setOpenLevel('inbox')
    }
  }, [advanced, openLevel])

  const readyCount = countReady(drawer.items)
  const chopOk = canChop(drawer, readyCap)
  const pullable = useMemo(
    () => nextPullable(drawer.items, undefined, day.mood),
    [drawer.items, day.mood],
  )
  const restCandidates = useMemo(
    () => readyRestCandidates(drawer.items, DRAWER_READY_FOCUS),
    [drawer.items],
  )
  const tidyRestN = Math.min(DRAWER_TIDY_REST, restCandidates.length)
  const showTidy =
    !tidyDismissed &&
    tidyRestN > 0 &&
    (readyCount >= DRAWER_TIDY_AT || !chopOk)
  const emergency = useMemo(
    () => itemsWithDeadlinePhase(drawer.items, 'emergency'),
    [drawer.items],
  )
  const radar = useMemo(
    () => itemsWithDeadlinePhase(drawer.items, 'radar'),
    [drawer.items],
  )

  useEffect(() => {
    if (readyCount < DRAWER_TIDY_AT && chopOk) setTidyDismissed(false)
  }, [readyCount, chopOk])

  useEffect(() => {
    if (!actionFlash) return
    const id = window.setTimeout(() => setActionFlash(null), 4500)
    return () => window.clearTimeout(id)
  }, [actionFlash])
  /** Angezeigte Frage — bleibt bis Antwort, auch nach Quiet-Markierung */
  const [activeStaleId, setActiveStaleId] = useState<string | null>(null)
  const markedStaleRef = useRef<string | null>(null)
  const staleItem = activeStaleId
    ? drawer.items.find((i) => i.id === activeStaleId) ?? null
    : null
  const chopParent = chopId
    ? drawer.items.find((i) => i.id === chopId)
    : undefined
  const pullConfirmItem = pullConfirmId
    ? drawer.items.find((i) => i.id === pullConfirmId) ?? null
    : null
  const pullAheadEarlier = pullConfirmItem
    ? earlierChainStep(drawer.items, pullConfirmItem)
    : null
  const chopSheetRef = useRef<HTMLDivElement | null>(null)
  const chopTextRef = useRef<HTMLTextAreaElement | null>(null)

  const inboxEmpty = itemsByLevel(drawer, 'inbox').length === 0
  const waitingSample =
    drawer.items.find((i) => Boolean(i.waitingOn?.trim()))?.waitingOn ?? null

  const buddyLine = drawerBuddy(day.buddyTone, {
    chopBlocked: !chopOk,
    chopSteer: pullConfirmId ? null : chopSteer,
    pullAheadEarlier: pullAheadEarlier?.title ?? null,
    staleTitle: staleItem?.title ?? null,
    waitingOn: waitingSample,
    emptyInbox: inboxEmpty && !showTidy && emergency.length === 0,
    emergencyCount: emergency.length,
    radarCount: showTidy ? 0 : radar.length,
    readyCount: showTidy ? readyCount : 0,
    restN: showTidy ? tidyRestN : 0,
    tidyAt: DRAWER_TIDY_AT,
  })

  function patchDrawer(
    updater: (d: DrawerState) => DrawerState,
  ) {
    setDrawer((prev) => refreshReadyCapLatch(updater(prev), readyCap))
  }

  useEffect(() => {
    if (!chopId) return
    // Formular liegt am Eintrag — sofort sichtbar machen
    chopSheetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    window.setTimeout(() => chopTextRef.current?.focus(), 80)
  }, [chopId])

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
    patchDrawer((d) => trashItem(d, staleItem.id))
    setActiveStaleId(null)
    markedStaleRef.current = null
    setActionFlash(t('drawer.trashedFlash', { title: staleItem.title }))
  }

  function addDrop() {
    patchDrawer((d) => addInboxItem(d, draft))
    setDraft('')
    setOpenLevel('inbox')
  }

  function doPullItem(item: DrawerItem) {
    if (!canAddSize(day.capacity, day.tasks, 'small')) return
    const parent = parentOf(drawer.items, item)
    const task = pullToTask(item, day.mood, 'small', parent?.title)
    setDay((d) => ({ ...d, tasks: [...d.tasks, task] }))
    patchDrawer((d) => removeItem(d, item.id))
    setPullConfirmId(null)
    setActionFlash(drawerPulledOk(day.buddyTone, item.title))
  }

  /** Ohne Tagesanker: Schritt hier abhaken (aus der Schublade nehmen) */
  function completeReadyItem(item: DrawerItem) {
    patchDrawer((d) => removeItem(d, item.id))
    setPullConfirmId(null)
    setMoreOpenId(null)
    setActionFlash(t('drawer.doneFlash', { title: item.title }))
  }

  function tidyPullOne() {
    const next = pullable[0]
    if (!next) return
    pullItem(next)
  }

  function tidyRestSome() {
    const ids = restCandidates.slice(0, tidyRestN).map((i) => i.id)
    if (ids.length === 0) return
    patchDrawer((d) => moveItems(d, ids, 'frozen'))
    setTidyDismissed(true)
    setActionFlash(t('drawer.restedFlash', { n: ids.length }))
  }

  function renderGroupedItems(
    items: DrawerItem[],
    level: DrawerLevel | 'deadline',
    opts?: { groupsOpen?: boolean },
  ) {
    const groups = groupItemsByParent(drawer.items, items)
    const groupsOpen = opts?.groupsOpen ?? true
    return (
      <div className="drawer-group-list">
        {groups.map((group) => {
          const useFold =
            Boolean(group.label) &&
            group.items.length >= 1 &&
            !group.items.every((i) => i.isChunk)
          if (!useFold) {
            return (
              <ul key={group.key} className="drawer-item-list">
                {group.items.map((item) => renderItem(item, level))}
              </ul>
            )
          }
          const hasNext = group.items.some(
            (i) => chainPullRole(drawer.items, i) === 'next',
          )
          return (
            <details
              key={group.key}
              className="drawer-brocken-group"
              open={groupsOpen || hasNext || group.items.length <= 2}
            >
              <summary>
                {t('drawer.groupBrocken', {
                  title: group.label,
                  count: group.items.length,
                })}
              </summary>
              <ul className="drawer-item-list">
                {group.items.map((item) => renderItem(item, level))}
              </ul>
            </details>
          )
        })}
      </div>
    )
  }

  function renderLevelBody(level: DrawerLevel, items: DrawerItem[]) {
    const ordered =
      level === 'ready' ? sortReadyForFocus(items, drawer.items) : items
    const focusN =
      level === 'ready'
        ? DRAWER_READY_FOCUS
        : level === 'inbox'
          ? DRAWER_INBOX_FOCUS
          : ordered.length
    const head = ordered.slice(0, focusN)
    const rest = ordered.slice(focusN)
    const moreOpen =
      level === 'ready'
        ? readyMoreOpen
        : level === 'inbox'
          ? inboxMoreOpen
          : true
    const setMoreOpen =
      level === 'ready'
        ? setReadyMoreOpen
        : level === 'inbox'
          ? setInboxMoreOpen
          : undefined
    const foldQuiet = level === 'defer' || level === 'frozen'
    const groupsOpen = !foldQuiet

    const inner = (
      <>
        {head.length === 0 && rest.length === 0 ? null : (
          renderGroupedItems(head, level, { groupsOpen })
        )}
        {rest.length > 0 && setMoreOpen && (
          <details
            className="drawer-more-fold"
            open={moreOpen}
            onToggle={(e) =>
              setMoreOpen((e.target as HTMLDetailsElement).open)
            }
          >
            <summary>
              {t(`drawer.moreInLevel.${level}`, { count: rest.length })}
            </summary>
            {renderGroupedItems(rest, level, { groupsOpen: false })}
          </details>
        )}
        {rest.length > 0 && !setMoreOpen && (
          <details className="drawer-more-fold">
            <summary>
              {t(`drawer.moreInLevel.${level}`, { count: rest.length })}
            </summary>
            {renderGroupedItems(rest, level, { groupsOpen: false })}
          </details>
        )}
      </>
    )

    return inner
  }

  function pullItem(item: DrawerItem, opts?: { force?: boolean }) {
    if (!canAddSize(day.capacity, day.tasks, 'small')) return
    const role = chainPullRole(drawer.items, item)
    // Späterer Ketten-Schritt: Buddy fragt — Reihenfolge war Absicht
    if (!opts?.force && role === 'later') {
      setPullConfirmId(item.id)
      setChopSteer(null)
      closeChop()
      return
    }
    doPullItem(item)
  }

  function submitChop() {
    if (!chopId || !chopParent) return
    const lines = parseChopLines(chopText)
    if (lines.length === 0) return
    if (lines.length > CHOP_MAX) {
      setChopSteer('too_many')
      setChopErr(t('drawer.chopSteerTooMany', { max: CHOP_MAX }))
      return
    }
    if (lines.length < CHOP_MIN) {
      setChopErr(t('drawer.chopSteerTooFew', { min: CHOP_MIN }))
      return
    }
    if (bitesTooFine(lines)) {
      setChopSteer('too_fine')
      setChopErr(t('drawer.chopSteerTooFine'))
      return
    }
    if (!chopRoomFor(lines.length)) {
      setChopErr(t('drawer.capBlocked'))
      return
    }
    patchDrawer((d) => chopIntoBites(d, chopId, lines))
    closeChop()
    setChopSteer(null)
    setOpenLevel('ready')
    setActionFlash(drawerChoppedOk(day.buddyTone, chopParent.title))
  }

  async function runAiSuggest() {
    if (!chopParent || chopBusy) return
    if (!online) {
      setChopErr(t('drawer.chopAiOffline'))
      return
    }
    await refreshChopWallet()
    setAiQuotaTick((n) => n + 1)
    if (!canUseChopAi()) {
      setChopErr(t('drawer.chopAiLimitReached'))
      return
    }
    setChopBusy(true)
    setChopErr(null)
    // Bei schon kleinen Häppchen nur Hinweis — Vorschlag trotzdem erlauben
    setChopSteer(
      chopParent.isChunk === false && looksAlreadySmall(chopParent.title)
        ? 'already_small'
        : null,
    )
    const parent = parentOf(drawer.items, chopParent)
    const further = chopParent.isChunk === false
    const result = await suggestChopBites({
      title: chopParent.title,
      locale: i18n.language.startsWith('en') ? 'en' : 'de',
      parentTitle: further ? (parent?.title ?? null) : null,
      mode: further ? 'further' : 'first',
    })
    setChopBusy(false)
    setAiQuotaTick((n) => n + 1)
    if (!result.ok) {
      if (result.error === 'too_many_bites') setChopSteer('too_many')
      const key = `drawer.chopAiError.${result.error}`
      const msg = t(key, {
        day: CHOP_AI_DAILY_LIMIT,
        month: CHOP_AI_MONTHLY_LIMIT,
      })
      setChopErr(
        result.error === 'daily_limit'
          ? t('drawer.chopAiLimitReached')
          : msg === key
            ? t('drawer.chopAiError.generic')
            : msg,
      )
      return
    }
    // Nie still abschneiden — API liefert nur gültige 3–5
    if (
      result.bites.length < CHOP_MIN ||
      result.bites.length > CHOP_MAX
    ) {
      setChopSteer('too_many')
      setChopErr(t('drawer.chopAiError.bad_ai_response'))
      return
    }
    setChopText(result.bites.join('\n'))
    if (bitesTooFine(result.bites)) setChopSteer('too_fine')
  }

  function openChop(item: DrawerItem, opts?: { force?: boolean }) {
    setMoreOpenId(null)
    setSnoozeId(null)
    setWaitId(null)
    setDeadlineEditId(null)
    // Schon greifbar → Buddy rät eher Holen; „Weiter zerteilen“ (force) geht trotzdem
    if (
      !opts?.force &&
      item.isChunk === false &&
      looksAlreadySmall(item.title)
    ) {
      setChopSteer('already_small')
      closeChop()
      return
    }
    setChopSteer(
      opts?.force &&
        item.isChunk === false &&
        looksAlreadySmall(item.title)
        ? 'already_small'
        : null,
    )
    // Tab auf die Ebene des Eintrags, sonst wirkt der Klick „tot“
    if (item.level && openLevel !== 'all' && openLevel !== item.level) {
      setOpenLevel(item.level)
    }
    setChopId(item.id)
    setChopText('')
    setChopErr(null)
  }

  function closeChop() {
    setChopId(null)
    setChopText('')
    setChopErr(null)
  }

  function chopRoomFor(lineCount: number): boolean {
    if (!chopParent || lineCount < 1) return false
    const n = countReady(drawer.items)
    // Häppchen ersetzen: −1 + neue Zeilen
    if (chopParent.isChunk === false) {
      return n - 1 + lineCount <= readyCap
    }
    return n + lineCount <= readyCap && chopOk
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

  function renderItem(
    item: DrawerItem,
    level: DrawerLevel | 'deadline',
    opts?: { nested?: boolean },
  ) {
    const nested = Boolean(opts?.nested)
    const phase = deadlinePhase(item)
    const dLabel = deadlineLabel(item)
    const itemLevel = item.level
    const parent = !nested ? parentOf(drawer.items, item) : null
    const kids = childrenOf(drawer.items, item.id)
    const canExpand = Boolean(item.isChunk) || kids.length > 0
    const expanded = expandedChunkId === item.id
    const pullRole = chainPullRole(drawer.items, item)
    const confirmingPull = pullConfirmId === item.id

    return (
      <li
        key={item.id}
        className={`drawer-item${nested ? ' drawer-item--child' : ''}${phase === 'emergency' ? ' drawer-item--emergency' : ''}${phase === 'radar' ? ' drawer-item--radar' : ''}${expanded ? ' drawer-item--expanded' : ''}${pullRole === 'later' ? ' drawer-item--later' : ''}`}
      >
        <div className="drawer-item-main">
          {parent && (
            <p className="drawer-item-parent">
              {t('drawer.parentLine', { title: parent.title })}
            </p>
          )}
          {canExpand ? (
            <button
              type="button"
              className="drawer-item-title-btn"
              aria-expanded={expanded}
              title={
                expanded
                  ? t('drawer.chunkCollapseHint')
                  : t('drawer.chunkExpandHint')
              }
              onClick={() =>
                setExpandedChunkId((id) => (id === item.id ? null : item.id))
              }
            >
              <strong>{item.title}</strong>
              <span className="drawer-chip">{t('drawer.chunk')}</span>
              <span className="drawer-chip drawer-chip--count">
                {t('drawer.chunkChildren', { count: kids.length })}
              </span>
            </button>
          ) : (
            <>
              <strong>{item.title}</strong>
              {item.parentId && (
                <span className="drawer-chip">{t('drawer.bite')}</span>
              )}
              {pullRole === 'later' && (
                <span className="drawer-chip drawer-chip--later">
                  {t('drawer.pullLaterChip')}
                </span>
              )}
              {itemLevel === 'ready' && (
                <button
                  type="button"
                  className="drawer-chip drawer-chip--energy"
                  title={t('drawer.energyHint')}
                  onClick={() =>
                    patchDrawer((d) =>
                      setItemEnergy(d, item.id, nextEnergy(item.energy)),
                    )
                  }
                >
                  {t(`drawer.energy.${item.energy ?? 'normal'}`)}
                </button>
              )}
            </>
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
          {/* Bereit: Holen (+ in der Schublade-App auch Abhaken ohne Tagesanker) */}
          {itemLevel === 'ready' && !item.isChunk && !confirmingPull && (
            <>
              {variant === 'page' && (
                <button
                  type="button"
                  className="primary sm"
                  onClick={() => completeReadyItem(item)}
                >
                  {t('drawer.markDone')}
                </button>
              )}
              <button
                type="button"
                className={
                  variant === 'page' || pullRole === 'later'
                    ? 'secondary sm'
                    : 'primary sm'
                }
                disabled={!canAddSize(day.capacity, day.tasks, 'small')}
                onClick={() => pullItem(item)}
              >
                {t('drawer.pull')}
              </button>
            </>
          )}
          {(itemLevel === 'inbox' || Boolean(item.isChunk)) && (
              <button
                type="button"
                className={`primary sm${chopId === item.id ? ' on' : ''}`}
                aria-expanded={chopId === item.id}
                onClick={() =>
                  chopId === item.id ? closeChop() : openChop(item)
                }
              >
                {item.isChunk && itemLevel === 'ready'
                  ? t('drawer.chopAgain')
                  : t('drawer.chop')}
              </button>
            )}
          {itemLevel === 'defer' && (
            <button
              type="button"
              className="primary sm"
              onClick={() => patchDrawer((d) => moveItem(d, item.id, 'inbox'))}
            >
              {t('drawer.backToInbox')}
            </button>
          )}
          {itemLevel === 'frozen' && (
            <button
              type="button"
              className="primary sm"
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
            {!item.isChunk &&
              (itemLevel === 'ready' || itemLevel === 'inbox') && (
              <button
                type="button"
                className="ghost sm"
                onClick={() => openChop(item, { force: true })}
              >
                {t('drawer.chopAgain')}
              </button>
            )}
            <button
              type="button"
              className="ghost sm"
              onClick={() => {
                setMoreOpenId(item.id)
                setWaitId(null)
                setDeadlineEditId(null)
                setSnoozeId((id) => (id === item.id ? null : item.id))
              }}
            >
              {t('drawer.snooze')}
            </button>
            <button
              type="button"
              className="ghost sm"
              onClick={() => {
                setMoreOpenId(item.id)
                setSnoozeId(null)
                setDeadlineEditId(null)
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
              className="ghost sm drawer-item-remove"
              onClick={() => {
                const childCount = drawer.items.filter(
                  (x) => x.parentId === item.id && x.level !== 'trash',
                ).length
                const ok =
                  item.isChunk || childCount > 0
                    ? window.confirm(
                        t('drawer.trashProjectWarn', {
                          title: item.title,
                          count: childCount,
                        }),
                      )
                    : window.confirm(
                        t('drawer.trashItemWarn', { title: item.title }),
                      )
                if (!ok) return
                patchDrawer((d) => trashItem(d, item.id))
                setMoreOpenId(null)
                setActionFlash(
                  childCount > 0 || item.isChunk
                    ? t('drawer.trashedProjectFlash', {
                        title: item.title,
                        count: childCount,
                      })
                    : t('drawer.trashedFlash', { title: item.title }),
                )
              }}
            >
              {t('drawer.remove')}
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
        {confirmingPull && (
          <div className="drawer-pull-ahead" role="status">
            <p className="block-hint">{t('drawer.pullAheadHint')}</p>
            <div className="carry-actions">
              <button
                type="button"
                className="primary sm"
                disabled={!canAddSize(day.capacity, day.tasks, 'small')}
                onClick={() => pullItem(item, { force: true })}
              >
                {t('drawer.pullAheadConfirm')}
              </button>
              <button
                type="button"
                className="ghost sm"
                onClick={() => setPullConfirmId(null)}
              >
                {t('drawer.pullAheadCancel')}
              </button>
            </div>
          </div>
        )}
        {chopId === item.id && (
          <div
            className="drawer-chop-sheet drawer-chop-sheet--inline"
            ref={chopSheetRef}
          >
            <h3>
              {item.isChunk === false
                ? t('drawer.chopAgainTitle')
                : t('drawer.chopTitle')}
            </h3>
            <p className="block-hint">
              {item.isChunk === false
                ? t('drawer.chopAgainHint')
                : t('drawer.chopHint')}
            </p>
            {!chopOk && item.isChunk !== false && (
              <p className="block-hint drawer-chop-err" role="status">
                {t('drawer.capBlocked')}
              </p>
            )}
            {aiOptIn ? (
              <div className="drawer-chop-ai-block">
                <div className="carry-actions drawer-chop-ai-row">
                  <button
                    type="button"
                    className="secondary"
                    disabled={chopBusy || !online || !aiQuotaOk}
                    onClick={() => void runAiSuggest()}
                  >
                    {chopBusy
                      ? t('drawer.chopAiBusy')
                      : t('drawer.chopAiSuggest')}
                  </button>
                </div>
                {!online ? (
                  <p className="block-hint" role="status">
                    {t('drawer.chopAiOffline')}
                  </p>
                ) : (
                  <p className="block-hint" role="status">
                    {showFree
                      ? t('drawer.chopAiQuotaHintFree', {
                          dayLeft: freeDayRemaining(),
                          dayLimit: CHOP_AI_DAILY_LIMIT,
                          monthLeft: freeMonthRemaining(),
                          monthLimit: CHOP_AI_MONTHLY_LIMIT,
                          wallet: walletLeft,
                        })
                      : t('drawer.chopAiQuotaHintWallet', {
                          wallet: walletLeft,
                        })}
                  </p>
                )}
                {!aiQuotaOk && online && <ChopAiPackBuy compact />}
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
              ref={chopTextRef}
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
                onClick={closeChop}
              >
                {t('drawer.chopCancel')}
              </button>
            </div>
          </div>
        )}
        {level === 'deadline' && phase === 'emergency' && item.isChunk && (
          <p className="block-hint">{t('drawer.deadlineEmergencyChop')}</p>
        )}
        {expanded && (
          <div className="drawer-item-children">
            {kids.length === 0 ? (
              <p className="block-hint">{t('drawer.chunkEmptyChildren')}</p>
            ) : (
              <ul className="drawer-item-list drawer-item-list--nested">
                {kids.map((child) => renderItem(child, child.level, { nested: true }))}
              </ul>
            )}
          </div>
        )}
      </li>
    )
  }

  if (mode === 'drop') {
    const inboxCount = itemsByLevel(drawer, 'inbox').length
    return (
      <div className="drawer-workspace drawer-workspace--overlay drawer-workspace--drop">
        <div className="drawer-panel-head">
          <h2>{t('drawer.dropTitle')}</h2>
          {onClose && (
            <button type="button" className="ghost sm" onClick={onClose}>
              {t('common.ok')}
            </button>
          )}
        </div>
        <p className="block-hint">{t('drawer.dropLead')}</p>
        <form
          className="add-row"
          onSubmit={(e) => {
            e.preventDefault()
            addDrop()
            onClose?.()
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t('drawer.dropPlaceholder')}
            maxLength={120}
            autoFocus
          />
          <button type="submit" className="primary sm" disabled={!draft.trim()}>
            {t('drawer.drop')}
          </button>
        </form>
        {inboxCount > 0 && (
          <p className="block-hint">
            {t('drawer.dropInboxHint', { count: inboxCount })}
          </p>
        )}
        <p className="drawer-drop-footer">
          <Link to="/schublade" className="secondary sm" onClick={onClose}>
            {t('productNav.openSchublade')}
          </Link>
        </p>
      </div>
    )
  }

  if (mode === 'pull') {
    const canPull = canAddSize(day.capacity, day.tasks, 'small')
    const focus = pullable.slice(0, DRAWER_PULL_FOCUS)
    return (
      <div className="drawer-workspace drawer-workspace--overlay drawer-workspace--drop drawer-workspace--pull">
        <div className="drawer-panel-head">
          <h2>{t('drawer.pullTitle')}</h2>
          {onClose && (
            <button type="button" className="ghost sm" onClick={onClose}>
              {t('common.ok')}
            </button>
          )}
        </div>
        <p className="block-hint">{t('drawer.pullLead')}</p>
        {actionFlash && (
          <div className="buddy-card drawer-flash" role="status">
            <span className="buddy-label">{t('common.buddy')}</span>
            <p>{actionFlash}</p>
          </div>
        )}
        {buddyLine && (
          <div className="buddy-card drawer-buddy" role="status">
            <span className="buddy-label">{t('common.buddy')}</span>
            <p>{buddyLine}</p>
          </div>
        )}
        {!canPull && (
          <p className="block-hint">{t('drawer.pullCapFull')}</p>
        )}
        {focus.length === 0 ? (
          <p className="empty">{t('drawer.pullEmpty')}</p>
        ) : (
          <ul className="drawer-item-list drawer-pull-list">
            {focus.map((item) => {
              const parent = parentOf(drawer.items, item)
              const confirming = pullConfirmId === item.id
              return (
                <li key={item.id} className="drawer-item drawer-item--pull">
                  <div className="drawer-item-main">
                    <strong>{item.title}</strong>
                    {parent && (
                      <p className="task-parent-line">
                        {t('drawer.parentLine', { title: parent.title })}
                      </p>
                    )}
                    {chainPullRole(drawer.items, item) === 'later' && (
                      <span className="drawer-chip">
                        {t('drawer.pullLaterChip')}
                      </span>
                    )}
                    <span className="drawer-chip drawer-chip--energy">
                      {t(`drawer.energy.${item.energy ?? 'normal'}`)}
                    </span>
                  </div>
                  {confirming ? (
                    <div className="drawer-item-actions">
                      <p className="block-hint">{t('drawer.pullAheadHint')}</p>
                      <button
                        type="button"
                        className="primary sm"
                        disabled={!canPull}
                        onClick={() => {
                          pullItem(item, { force: true })
                          onClose?.()
                        }}
                      >
                        {t('drawer.pullAheadConfirm')}
                      </button>
                      <button
                        type="button"
                        className="ghost sm"
                        onClick={() => setPullConfirmId(null)}
                      >
                        {t('drawer.pullAheadCancel')}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="primary sm"
                      disabled={!canPull}
                      onClick={() => {
                        const role = chainPullRole(drawer.items, item)
                        if (role === 'later') {
                          pullItem(item)
                          return
                        }
                        pullItem(item)
                        onClose?.()
                      }}
                    >
                      {t('drawer.pull')}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        {pullable.length > focus.length && (
          <p className="block-hint">
            {t('drawer.moreInLevel.ready', {
              count: pullable.length - focus.length,
            })}
          </p>
        )}
        <p className="drawer-drop-footer">
          <Link to="/schublade" className="secondary sm" onClick={onClose}>
            {t('productNav.openSchublade')}
          </Link>
        </p>
      </div>
    )
  }

  const showCap = advanced || !chopOk || readyCount >= Math.max(1, readyCap - 5)
  const visibleLevels = LEVELS.filter(
    (lv) =>
      (advanced || SIMPLE_LEVELS.includes(lv)) &&
      (openLevel === 'all' || openLevel === lv),
  )

  return (
    <div
      className={`drawer-workspace drawer-workspace--${variant}${advanced ? '' : ' drawer-workspace--simple'}`}
    >
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
        {advanced ? t('drawer.lead') : t('drawer.leadSimple')}
      </p>
      {actionFlash && (
        <div className="buddy-card drawer-flash" role="status">
          <span className="buddy-label">{t('common.buddy')}</span>
          <p>{actionFlash}</p>
        </div>
      )}
      {buddyLine && (
        <div className="buddy-card drawer-buddy" role="status">
          <span className="buddy-label">{t('common.buddy')}</span>
          <p>{buddyLine}</p>
          {showTidy && (
            <div className="drawer-tidy-actions">
              <button
                type="button"
                className="primary sm"
                disabled={
                  pullable.length === 0 ||
                  !canAddSize(day.capacity, day.tasks, 'small')
                }
                onClick={tidyPullOne}
              >
                {t('drawer.tidyPullOne')}
              </button>
              <button
                type="button"
                className="secondary sm"
                onClick={tidyRestSome}
              >
                {t('drawer.tidyRestN', { n: tidyRestN })}
              </button>
              <button
                type="button"
                className="ghost sm"
                onClick={() => setTidyDismissed(true)}
              >
                {t('drawer.tidyLater')}
              </button>
            </div>
          )}
        </div>
      )}
      {showCap && (
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

      {radar.length > 0 && advanced && (
        <details className="drawer-deadline-block drawer-deadline-block--radar">
          <summary>
            {t('drawer.deadlineRadarTitle')} ({radar.length})
          </summary>
          <p className="block-hint">{t('drawer.deadlineRadarHint')}</p>
          <ul className="drawer-item-list">
            {radar.map((item) => renderItem(item, 'deadline'))}
          </ul>
        </details>
      )}

      {pullable.length > 0 && openLevel !== 'inbox' && (
        <div className="drawer-pull-block">
          <h3>{t('drawer.pullTitle')}</h3>
          <ul className="task-list">
            {pullable.slice(0, DRAWER_PULL_FOCUS).map((item) => {
              const parent = parentOf(drawer.items, item)
              return (
                <li key={item.id}>
                  <span className="task-main">
                    {parent && (
                      <span className="drawer-item-parent drawer-item-parent--inline">
                        {t('drawer.parentLine', { title: parent.title })}
                      </span>
                    )}
                    <span>{item.title}</span>
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
              )
            })}
          </ul>
        </div>
      )}

      <div className="drawer-level-tabs" role="tablist">
        {levelTabs.map((lv) => (
          <button
            key={lv}
            type="button"
            role="tab"
            className={openLevel === lv ? 'on' : ''}
            onClick={() => setOpenLevel(lv)}
          >
            {lv === 'all' ? t('drawer.levelAll') : t(`drawer.level.${lv}`)}
            {lv !== 'all' && (
              <span className="drawer-tab-count">
                {itemsByLevel(drawer, lv).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {visibleLevels.map((level) => {
        const items = itemsByLevelTop(drawer, level)
        if (openLevel === 'all' && items.length === 0) return null
        const emptyHint = t(`drawer.emptyLevelBy.${level}`, {
          defaultValue: t('drawer.emptyLevel'),
        })
        const body =
          items.length === 0 ? (
            <p className="block-hint">{emptyHint}</p>
          ) : (
            renderLevelBody(level, items)
          )

        if (level === 'frozen' && openLevel === 'all') {
          return (
            <details
              key={level}
              className="drawer-level-block drawer-quiet-fold"
              open={frozenOpen}
              onToggle={(e) =>
                setFrozenOpen((e.target as HTMLDetailsElement).open)
              }
            >
              <summary>{t('drawer.foldFrozen', { count: items.length })}</summary>
              {body}
            </details>
          )
        }
        if (level === 'defer' && openLevel === 'all') {
          return (
            <details
              key={level}
              className="drawer-level-block drawer-quiet-fold"
              open={deferOpen}
              onToggle={(e) =>
                setDeferOpen((e.target as HTMLDetailsElement).open)
              }
            >
              <summary>{t('drawer.foldDefer', { count: items.length })}</summary>
              {body}
            </details>
          )
        }
        if (
          (level === 'frozen' || level === 'defer') &&
          openLevel === level
        ) {
          return (
            <details
              key={level}
              className="drawer-level-block drawer-quiet-fold"
              open={level === 'frozen' ? frozenOpen : deferOpen}
              onToggle={(e) => {
                const open = (e.target as HTMLDetailsElement).open
                if (level === 'frozen') setFrozenOpen(open)
                else setDeferOpen(open)
              }}
            >
              <summary>
                {level === 'frozen'
                  ? t('drawer.foldFrozen', { count: items.length })
                  : t('drawer.foldDefer', { count: items.length })}
              </summary>
              {body}
            </details>
          )
        }
        return (
          <div key={level} className="drawer-level-block">
            {openLevel === 'all' && <h3>{t(`drawer.level.${level}`)}</h3>}
            {body}
          </div>
        )
      })}

      {variant === 'page' && (
        <details className="drawer-trash-fold">
          <summary>
            {t('drawer.trashTitle', { count: countTrash(drawer) })}
          </summary>
          <p className="block-hint">{t('drawer.trashLead')}</p>
          {countTrash(drawer) === 0 ? (
            <p className="block-hint">{t('drawer.trashEmpty')}</p>
          ) : (
            <>
              <ul className="drawer-item-list">
                {trashTopItems(drawer).map((item) => {
                  const childCount = drawer.items.filter(
                    (x) => x.parentId === item.id && x.level === 'trash',
                  ).length
                  return (
                    <li key={item.id} className="drawer-item drawer-item--trash">
                      <div className="drawer-item-main">
                        <strong>{item.title}</strong>
                        {childCount > 0 && (
                          <span className="drawer-chip">
                            {t('drawer.trashWithSteps', { count: childCount })}
                          </span>
                        )}
                      </div>
                      <div className="drawer-item-actions">
                        <button
                          type="button"
                          className="secondary sm"
                          onClick={() => {
                            patchDrawer((d) => restoreFromTrash(d, item.id))
                            setActionFlash(
                              t('drawer.restoredFlash', { title: item.title }),
                            )
                          }}
                        >
                          {t('drawer.trashRestore')}
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
              <button
                type="button"
                className="ghost sm drawer-trash-empty"
                onClick={() => {
                  if (!window.confirm(t('drawer.trashEmptyWarn'))) return
                  const n = countTrash(drawer)
                  patchDrawer((d) => emptyTrash(d))
                  setActionFlash(t('drawer.trashEmptiedFlash', { count: n }))
                }}
              >
                {t('drawer.trashEmptyAction')}
              </button>
            </>
          )}
        </details>
      )}
    </div>
  )
}
