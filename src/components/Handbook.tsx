import { useTranslation } from 'react-i18next'

type Section = {
  id: string
  title: string
  blocks: Array<
    | { type: 'p'; text: string }
    | { type: 'ul'; items: string[] }
    | { type: 'h'; text: string }
    | { type: 'rows'; rows: Array<{ label: string; text: string }> }
  >
}

function useHandbookSections(): Section[] {
  const { t } = useTranslation('handbook')

  const row = (path: string) => ({
    label: t(`${path}.label`),
    text: t(`${path}.text`),
  })

  const list = (key: string) =>
    t(key, { returnObjects: true }) as string[]

  return [
    {
      id: 'screens',
      title: t('sections.screens.title'),
      blocks: [
        {
          type: 'rows',
          rows: [
            row('sections.screens.rows.intro'),
            row('sections.screens.rows.plan'),
            row('sections.screens.rows.focus'),
            row('sections.screens.rows.done'),
          ],
        },
      ],
    },
    {
      id: 'plan',
      title: t('sections.plan.title'),
      blocks: [
        { type: 'h', text: t('sections.plan.buddyH') },
        { type: 'p', text: t('sections.plan.buddyP') },
        { type: 'h', text: t('sections.plan.moodH') },
        { type: 'ul', items: list('sections.plan.moodItems') },
        { type: 'p', text: t('sections.plan.moodNote') },
        { type: 'h', text: t('sections.plan.workH') },
        { type: 'ul', items: list('sections.plan.workItems') },
        { type: 'h', text: t('sections.plan.lifeH') },
        { type: 'ul', items: list('sections.plan.lifeItems') },
        { type: 'h', text: t('sections.plan.carryH') },
        { type: 'p', text: t('sections.plan.carryP') },
        { type: 'h', text: t('sections.plan.startH') },
        { type: 'p', text: t('sections.plan.startP') },
      ],
    },
    {
      id: 'fokus',
      title: t('sections.fokus.title'),
      blocks: [
        { type: 'h', text: t('sections.fokus.activeH') },
        { type: 'ul', items: list('sections.fokus.activeItems') },
        { type: 'h', text: t('sections.fokus.checkinH') },
        { type: 'p', text: t('sections.fokus.checkinP') },
        { type: 'h', text: t('sections.fokus.feierabendH') },
        { type: 'p', text: t('sections.fokus.feierabendP') },
        { type: 'h', text: t('sections.fokus.freezeH') },
        { type: 'p', text: t('sections.fokus.freezeP') },
        { type: 'h', text: t('sections.fokus.endH') },
        { type: 'p', text: t('sections.fokus.endP') },
      ],
    },
    {
      id: 'done',
      title: t('sections.done.title'),
      blocks: [{ type: 'ul', items: list('sections.done.items') }],
    },
    {
      id: 'settings',
      title: t('sections.settings.title'),
      blocks: [
        {
          type: 'rows',
          rows: [
            row('sections.settings.rows.capacity'),
            row('sections.settings.rows.lifeMax'),
            row('sections.settings.rows.tone'),
            row('sections.settings.rows.checkin'),
            row('sections.settings.rows.reminders'),
            row('sections.settings.rows.freeze'),
            row('sections.settings.rows.language'),
            row('sections.settings.rows.intro'),
            row('sections.settings.rows.pwa'),
            row('sections.settings.rows.sync'),
          ],
        },
      ],
    },
    {
      id: 'sparks',
      title: t('sections.sparks.title'),
      blocks: [
        {
          type: 'rows',
          rows: [
            row('sections.sparks.rows.park'),
            row('sections.sparks.rows.vault'),
            row('sections.sparks.rows.ttl'),
            row('sections.sparks.rows.mail'),
            row('sections.sparks.rows.delete'),
            row('sections.sparks.rows.export'),
          ],
        },
      ],
    },
    {
      id: 'regulate',
      title: t('sections.regulate.title'),
      blocks: [
        { type: 'p', text: t('sections.regulate.lead') },
        {
          type: 'rows',
          rows: [
            row('sections.regulate.rows.breathe'),
            row('sections.regulate.rows.senses'),
            row('sections.regulate.rows.body'),
            row('sections.regulate.rows.back'),
          ],
        },
      ],
    },
    {
      id: 'data',
      title: t('sections.data.title'),
      blocks: [{ type: 'ul', items: list('sections.data.items') }],
    },
  ]
}

type Props = {
  onClose: () => void
}

export function Handbook({ onClose }: Props) {
  const { t } = useTranslation('handbook')
  const sections = useHandbookSections()

  return (
    <div
      className="spark-overlay handbook-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t('ariaLabel')}
    >
      <div className="spark-panel handbook-panel">
        <div className="vault-head">
          <div>
            <h2>{t('title')}</h2>
            <p className="block-hint" style={{ margin: '0.25rem 0 0' }}>
              {t('lead')}
            </p>
          </div>
          <button type="button" className="ghost sm" onClick={onClose}>
            {t('close')}
          </button>
        </div>

        <div className="handbook-body">
          {sections.map((section) => (
            <details key={section.id} className="handbook-section">
              <summary>{section.title}</summary>
              <div className="handbook-section-body">
                {section.blocks.map((block, i) => {
                  if (block.type === 'p') {
                    return <p key={i}>{block.text}</p>
                  }
                  if (block.type === 'h') {
                    return (
                      <h3 key={i} className="handbook-sub">
                        {block.text}
                      </h3>
                    )
                  }
                  if (block.type === 'ul') {
                    return (
                      <ul key={i}>
                        {block.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    )
                  }
                  return (
                    <dl key={i} className="handbook-dl">
                      {block.rows.map((r) => (
                        <div key={r.label} className="handbook-dl-row">
                          <dt>{r.label}</dt>
                          <dd>{r.text}</dd>
                        </div>
                      ))}
                    </dl>
                  )
                })}
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  )
}
