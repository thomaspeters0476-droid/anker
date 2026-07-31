import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

type Props = {
  /** Welche App gerade aktiv ist */
  active: 'anker' | 'schublade'
}

/** Brücke zwischen den beiden App-Einstiegen (gleiche Daten, zwei Oberflächen) */
export function ProductNav({ active }: Props) {
  const { t } = useTranslation()
  return (
    <nav className="product-nav" aria-label={t('productNav.label')}>
      <NavLink
        to="/app"
        className={({ isActive }) =>
          `product-nav-link${isActive || active === 'anker' ? ' on' : ''}`
        }
        end
      >
        {t('productNav.heute')}
      </NavLink>
      <NavLink
        to="/schublade"
        className={({ isActive }) =>
          `product-nav-link${isActive || active === 'schublade' ? ' on' : ''}`
        }
      >
        {t('productNav.schublade')}
      </NavLink>
    </nav>
  )
}
