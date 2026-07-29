import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { DayState } from '../types'
import { workTasksSettled } from '../types'
import { ctxFromDay, dayDone } from '../buddy'
import { emptyDay, rollDayForward } from '../storage'
import { SparkVault } from '../components/SparkVault'
import { lifeTemplateLabel } from '../i18n/lifeLabels'
import { deleteSparkRemote } from '../sync'

type Props = {
  day: DayState
  setDay: React.Dispatch<React.SetStateAction<DayState>>
}

export function DoneScreen({ day, setDay }: Props) {
  const { t } = useTranslation()
  const done = day.tasks.filter((task) => task.status === 'done')
  const skipped = day.tasks.filter((task) => task.status === 'skipped')
  const msg = dayDone(done.length, day.tasks.length, ctxFromDay(day))
  const unlocked = workTasksSettled(day.tasks)
  const [vaultVisible, setVaultVisible] = useState(false)

  function reset() {
    rollDayForward(day)
    setDay(emptyDay())
  }

  return (
    <section className="screen done-screen">
      <div className="buddy-card" role="status">
        <span className="buddy-label">{t('common.buddy')}</span>
        <p>{msg}</p>
      </div>

      <div className="block">
        <h2>{t('done.doneTitle')}</h2>
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

      <button type="button" className="primary lg" onClick={reset}>
        {t('done.newDay')}
      </button>

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
