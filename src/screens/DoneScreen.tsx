import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { DayState } from '../types'
import { workTasksSettled } from '../types'
import { ctxFromDay, dayDone } from '../buddy'
import { emptyDay, loadPrefs, rollDayForward, startNextRound } from '../storage'
import { SparkVault } from '../components/SparkVault'
import { lifeTemplateLabel } from '../i18n/lifeLabels'
import { deleteSparkRemote } from '../sync'

type Props = {
  day: DayState
  setDay: React.Dispatch<React.SetStateAction<DayState>>
}

export function DoneScreen({ day, setDay }: Props) {
  const { t } = useTranslation()
  const drawerOn = loadPrefs().drawerEnabled
  const round = Math.max(1, day.round ?? 1)
  const done = day.tasks.filter((task) => task.status === 'done')
  const skipped = day.tasks.filter((task) => task.status === 'skipped')
  const priorDone = day.priorRoundDone ?? []
  const msg = dayDone(done.length, day.tasks.length, ctxFromDay(day))
  const unlocked = workTasksSettled(day.tasks)
  const [vaultVisible, setVaultVisible] = useState(false)

  function feierabend() {
    rollDayForward(day)
    setDay(emptyDay())
  }

  function anotherRound() {
    setDay(startNextRound(day))
  }

  return (
    <section className="screen done-screen">
      <div className="buddy-card" role="status">
        <span className="buddy-label">{t('common.buddy')}</span>
        <p>{msg}</p>
        {drawerOn && (
          <p className="block-hint done-round-hint">
            {t('done.roundDone', { round })}
          </p>
        )}
      </div>

      <div className="block">
        <h2>
          {drawerOn
            ? t('done.doneTitleRound', { round })
            : t('done.doneTitle')}
        </h2>
        {done.length === 0 ? (
          <p className="empty">{t('done.empty')}</p>
        ) : (
          <ul className="task-list done">
            {done.map((task) => (
              <li key={task.id}>
                <span className={`kind tiny ${task.kind}`}>
                  {task.kind === 'work'
                    ? t('common.workAbbrev')
                    : t('common.lifeAbbrev')}
                </span>
                {lifeTemplateLabel(task.title, t)}
              </li>
            ))}
          </ul>
        )}
      </div>

      {priorDone.length > 0 && (
        <div className="block muted">
          <h2>{t('done.earlierRounds', { count: priorDone.length })}</h2>
          <ul className="task-list done">
            {priorDone.slice(-8).map((task) => (
              <li key={task.id}>
                <span>{lifeTemplateLabel(task.title, t)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {skipped.length > 0 && (
        <div className="block muted">
          <h2>{t('done.skippedTitle')}</h2>
          <ul className="task-list">
            {skipped.map((task) => (
              <li key={task.id}>
                <span>{lifeTemplateLabel(task.title, t)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {day.sparks.length > 0 && (
        <button
          type="button"
          className={`secondary lg ${unlocked ? '' : 'locked-cta'}`}
          onClick={() => setVaultVisible(true)}
        >
          {unlocked
            ? t('done.viewSparks', { count: day.sparks.length })
            : t('done.sparksLocked', { count: day.sparks.length })}
        </button>
      )}

      {drawerOn ? (
        <div className="done-round-actions">
          <button type="button" className="primary lg" onClick={anotherRound}>
            {t('done.anotherRound', { next: round + 1 })}
          </button>
          <button type="button" className="secondary lg" onClick={feierabend}>
            {t('done.feierabend')}
          </button>
          <p className="block-hint">{t('done.roundChoiceHint')}</p>
        </div>
      ) : (
        <button type="button" className="primary lg" onClick={feierabend}>
          {t('done.newDay')}
        </button>
      )}

      {vaultVisible && (
        <SparkVault
          sparks={day.sparks}
          unlocked={unlocked}
          onClose={() => setVaultVisible(false)}
          onDelete={(id) => {
            void deleteSparkRemote(id)
            setDay((d) => ({
              ...d,
              sparks: d.sparks.filter((s) => s.id !== id),
            }))
          }}
        />
      )}
    </section>
  )
}
