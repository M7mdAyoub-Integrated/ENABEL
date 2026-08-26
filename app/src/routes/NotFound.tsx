import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { EmptyState, PrimaryButton } from '../ui/primitives'

export function NotFound() {
  const { t } = useTranslation(['errors', 'nav'])
  return (
    <EmptyState
      title={t('errors:notFoundTitle')}
      description={t('errors:notFoundBody')}
      actions={
        <Link to="/dashboard" className="inline-flex">
          <PrimaryButton>{t('nav:dashboard')}</PrimaryButton>
        </Link>
      }
    />
  )
}

export default NotFound
