import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AccentRule, Card, PageHead, PrimaryButton, SecondaryButton, SectionRule } from '../ui/primitives'
import { DataTable, type RowAction } from '../ui/DataTable'
import { Field } from '../ui/Field'
import { Modal } from '../ui/Modal'
import { ErrorState, TableSkeleton, WriteError } from '../ui/states'
import { useToast } from '../ui/Toast'
import { BidiIsolate } from '../components/BidiIsolate'
import { useAuth } from '../auth/AuthProvider'
import { ROLES, type Role } from '../auth/permissions'
import {
  generateInitialPassword,
  useAccounts,
  useCreateAccount,
  useSetAccountPassword,
  useUpdateAccount,
  type Account,
} from '../data/accounts'
import { useMunicipalities, useMunicipalityName } from '../data/municipalities'
import type { ListRow } from '../hooks/useData'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Staff accounts. Super admin only (RAMTHA_IMPLEMENTATION_PLAN.md §2.5).
 *
 *  Create an admin, assign a municipality, create another super admin,
 *  deactivate an account, set a password. Nothing here is a permission check:
 *  every refusal on this screen is the database's, rendered — RLS on
 *  `app_user` (0118), `guard_app_user` (0117), and the `manage-account` Edge
 *  Function's own super-admin test. You cannot change your own role,
 *  deactivate yourself, or remove the last super admin, and the screen shows
 *  the refusal rather than hiding the control, so an admin learns the rule
 *  instead of wondering where the button went.
 *
 *  Passwords are generated here, shown ONCE, and never stored by this app.
 *  The admin hands them over out of band.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const STAFF_ROLES: readonly Role[] = ROLES.filter((r) => r !== 'participant')

function roleTone(role: Role): 'ok' | 'warn' | 'err' | 'mute' | 'pending' {
  if (role === 'super_admin') return 'warn'
  if (role === 'coordinator') return 'ok'
  return 'mute'
}

export function Accounts() {
  const { t } = useTranslation(['accounts', 'auth', 'common', 'nav'])
  const toast = useToast()
  const { userId } = useAuth()
  const accounts = useAccounts()
  const { data: municipalities } = useMunicipalities()
  const name = useMunicipalityName()
  const update = useUpdateAccount()
  const create = useCreateAccount()
  const setPassword = useSetAccountPassword()

  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [confirmDeactivate, setConfirmDeactivate] = useState<Account | null>(null)
  const [passwordFor, setPasswordFor] = useState<{ account: Account; password: string } | null>(null)
  const [writeError, setWriteError] = useState<unknown>(null)

  const muniOptions = useMemo(
    () => (municipalities ?? []).filter((m) => m.is_active).map((m) => ({ value: m.id, label: name(m) })),
    [municipalities, name],
  )
  const muniLabel = (id: string | null) => {
    if (!id) return t('accounts:allMunicipalities')
    const m = municipalities?.find((x) => x.id === id)
    return m ? name(m) : id
  }

  const rows: ListRow[] = (accounts.data ?? []).map((a) => ({
    id: a.id,
    cells: [
      a.id === userId
        ? { kind: 'text', text: a.full_name, sub: t('accounts:you') }
        : { kind: 'text', text: a.full_name },
      { kind: 'ltr', text: a.email ?? '' },
      { kind: 'chip', text: t(`auth:role.${a.role}`), tone: roleTone(a.role) },
      { kind: 'text', text: muniLabel(a.municipality_id) },
      {
        kind: 'chip',
        text: a.is_active ? t('accounts:status.active') : t('accounts:status.inactive'),
        tone: a.is_active ? 'ok' : 'err',
      },
    ],
    filterValue: t(`auth:role.${a.role}`),
    search: `${a.full_name} ${a.email ?? ''}`.toLowerCase(),
  }))

  const actions = (row: ListRow): RowAction[] => {
    const a = accounts.data?.find((x) => x.id === row.id)
    if (!a) return []
    const list: RowAction[] = [
      { id: 'edit', label: t('accounts:actions.edit'), onSelect: () => setEditing(a) },
      {
        id: 'password',
        label: t('accounts:actions.setPassword'),
        onSelect: async () => {
          const pw = generateInitialPassword()
          try {
            const res = await setPassword.mutateAsync({ user_id: a.id, password: pw })
            if (!res.ok) {
              setWriteError({ kind: 'invalid', messageKey: `accounts:result.${res.result}` })
              return
            }
            setPasswordFor({ account: a, password: pw })
          } catch (e) {
            setWriteError(e)
          }
        },
      },
    ]
    if (a.is_active) {
      list.push({
        id: 'deactivate',
        label: t('accounts:actions.deactivate'),
        tone: 'danger',
        onSelect: () => setConfirmDeactivate(a),
      })
    } else {
      list.push({
        id: 'reactivate',
        label: t('accounts:actions.reactivate'),
        tone: 'ok',
        onSelect: async () => {
          try {
            await update.mutateAsync({ id: a.id, is_active: true })
            toast.fire({ tag: t('accounts:toast.tag'), title: t('accounts:toast.reactivated') })
          } catch (e) {
            setWriteError(e)
          }
        },
      })
    }
    return list
  }

  return (
    <>
      <PageHead
        title={t('nav:accounts')}
        description={t('accounts:intro')}
        action={
          <PrimaryButton onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? t('common:actions.cancel') : t('accounts:create.open')}
          </PrimaryButton>
        }
      />
      <AccentRule className="bg-slate" />

      {writeError ? <WriteError error={writeError} onDismiss={() => setWriteError(null)} /> : null}

      {showCreate ? (
        <CreateAccountForm
          muniOptions={muniOptions}
          busy={create.isPending}
          onCancel={() => setShowCreate(false)}
          onSubmit={async (input) => {
            try {
              const res = await create.mutateAsync(input)
              if (!res.ok) {
                setWriteError({ kind: 'invalid', messageKey: `accounts:result.${res.result}` })
                return false
              }
              toast.fire({ tag: t('accounts:toast.tag'), title: t('accounts:toast.created') })
              // The form stays mounted: it now shows the one-time password,
              // and its Done button is what closes it.
              return true
            } catch (e) {
              setWriteError(e)
              return false
            }
          }}
        />
      ) : null}

      {editing ? (
        <EditAccountForm
          account={editing}
          muniOptions={muniOptions}
          busy={update.isPending}
          onCancel={() => setEditing(null)}
          onSubmit={async (patch) => {
            try {
              await update.mutateAsync({ id: editing.id, ...patch })
              toast.fire({ tag: t('accounts:toast.tag'), title: t('common:toast.updated') })
              setEditing(null)
            } catch (e) {
              setWriteError(e)
            }
          }}
        />
      ) : null}

      <Card as="section" className="mt-[18px]">
        <div className="p-5 pb-0">
          <SectionRule title={t('accounts:list.title')} />
        </div>
        {accounts.isLoading ? (
          <div className="p-5">
            <TableSkeleton columns={5} />
          </div>
        ) : accounts.isError ? (
          <div className="p-5">
            <ErrorState error={accounts.error} onRetry={() => void accounts.refetch()} />
          </div>
        ) : (
          <DataTable
            columns={[
              t('accounts:columns.name'),
              t('accounts:columns.email'),
              t('accounts:columns.role'),
              t('accounts:columns.municipality'),
              t('accounts:columns.status'),
            ]}
            rows={rows}
            actions={actions}
            recordLabel={t('accounts:record')}
          />
        )}
      </Card>

      {/* The one-time password, shown once. */}
      <Modal
        open={passwordFor !== null}
        onClose={() => setPasswordFor(null)}
        title={t('accounts:password.title')}
        description={t('accounts:password.body', { name: passwordFor?.account.full_name ?? '' })}
        cancelLabel={t('accounts:password.done')}
      >
        {passwordFor ? (
          <p className="mt-4 border-[1.5px] border-ink bg-input px-[13px] py-[11px] text-center text-[20px] font-bold tracking-[0.08em]">
            <BidiIsolate>{passwordFor.password}</BidiIsolate>
          </p>
        ) : null}
      </Modal>

      {/* Deactivation, with the consequence stated. */}
      <Modal
        open={confirmDeactivate !== null}
        onClose={() => setConfirmDeactivate(null)}
        title={t('accounts:deactivate.title')}
        description={t('accounts:deactivate.body', { name: confirmDeactivate?.full_name ?? '' })}
        note={t('accounts:deactivate.note')}
        confirmLabel={t('accounts:actions.deactivate')}
        onConfirm={async () => {
          const a = confirmDeactivate
          setConfirmDeactivate(null)
          if (!a) return
          try {
            await update.mutateAsync({ id: a.id, is_active: false })
            toast.fire({ tag: t('accounts:toast.tag'), title: t('accounts:toast.deactivated'), tone: 'destructive' })
          } catch (e) {
            setWriteError(e)
          }
        }}
      />
    </>
  )
}

/* ── create ─────────────────────────────────────────────────────────────── */

function CreateAccountForm({
  muniOptions,
  busy,
  onCancel,
  onSubmit,
}: {
  muniOptions: { value: string; label: string }[]
  busy: boolean
  onCancel: () => void
  onSubmit: (input: {
    email: string
    password: string
    full_name: string
    role: Role
    municipality_id: string | null
  }) => Promise<boolean>
}) {
  const { t } = useTranslation(['accounts', 'auth', 'common'])
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role | ''>('')
  const [municipality, setMunicipality] = useState('')
  const [password, setPassword] = useState(() => generateInitialPassword())
  const [shown, setShown] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const needsMunicipality = role !== '' && role !== 'super_admin'

  const submit = async () => {
    const next: Record<string, string> = {}
    if (!fullName.trim()) next.fullName = t('accounts:errors.nameRequired')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = t('accounts:errors.emailInvalid')
    if (!role) next.role = t('accounts:errors.roleRequired')
    if (needsMunicipality && !municipality) next.municipality = t('accounts:errors.municipalityRequired')
    if (password.length < 12) next.password = t('auth:errors.passwordTooShort', { count: 12 })
    setErrors(next)
    if (Object.keys(next).length > 0) return
    const ok = await onSubmit({
      email: email.trim(),
      password,
      full_name: fullName.trim(),
      role: role as Role,
      municipality_id: role === 'super_admin' ? null : municipality,
    })
    if (ok) setShown(password)
  }

  if (shown) {
    return (
      <Card as="section" className="mt-[18px] p-5">
        <SectionRule title={t('accounts:password.title')} />
        <p className="mt-3 text-[15px] text-body">{t('accounts:password.body', { name: fullName })}</p>
        <p className="mt-4 border-[1.5px] border-ink bg-input px-[13px] py-[11px] text-center text-[20px] font-bold tracking-[0.08em]">
          <BidiIsolate>{shown}</BidiIsolate>
        </p>
        <div className="mt-4 flex justify-end">
          <SecondaryButton onClick={onCancel}>{t('accounts:password.done')}</SecondaryButton>
        </div>
      </Card>
    )
  }

  return (
    <Card as="section" className="mt-[18px] p-5">
      <SectionRule title={t('accounts:create.title')} />
      <p className="mt-2 text-[14px] text-muted">{t('accounts:create.help')}</p>
      <div className="mt-4 grid grid-cols-12 gap-x-4 gap-y-4">
        <Field
          spec={{ key: 'fullName', label: t('accounts:fields.fullName'), type: 'text', required: true, span: 6, ...(errors.fullName ? { error: errors.fullName } : {}) }}
          value={fullName}
          onChange={setFullName}
        />
        <Field
          spec={{ key: 'email', label: t('accounts:fields.email'), type: 'email', required: true, span: 6, ltr: true, ...(errors.email ? { error: errors.email } : {}) }}
          value={email}
          onChange={setEmail}
        />
        <Field
          spec={{
            key: 'role',
            label: t('accounts:fields.role'),
            type: 'select',
            required: true,
            span: 6,
            options: STAFF_ROLES.map((r) => ({ value: r, label: t(`auth:role.${r}`) })),
            ...(errors.role ? { error: errors.role } : {}),
          }}
          value={role}
          onChange={(v) => setRole(v as Role | '')}
        />
        <Field
          spec={{
            key: 'municipality',
            label: t('accounts:fields.municipality'),
            type: 'select',
            required: needsMunicipality,
            span: 6,
            options: muniOptions,
            ...(role === 'super_admin' ? { help: t('accounts:fields.municipalityNoneForSuper') } : {}),
            disabled: role === 'super_admin',
            ...(errors.municipality ? { error: errors.municipality } : {}),
          }}
          value={role === 'super_admin' ? '' : municipality}
          onChange={setMunicipality}
        />
        <Field
          spec={{
            key: 'password',
            label: t('accounts:fields.password'),
            type: 'text',
            required: true,
            span: 6,
            ltr: true,
            help: t('accounts:fields.passwordHelp'),
            ...(errors.password ? { error: errors.password } : {}),
          }}
          value={password}
          onChange={setPassword}
        />
        <div className="col-span-12 flex items-end sm:col-span-6">
          <SecondaryButton onClick={() => setPassword(generateInitialPassword())}>
            {t('accounts:create.regenerate')}
          </SecondaryButton>
        </div>
      </div>
      <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
        <SecondaryButton onClick={onCancel} disabled={busy}>
          {t('common:actions.cancel')}
        </SecondaryButton>
        <PrimaryButton onClick={() => void submit()} disabled={busy}>
          {busy ? t('accounts:create.working') : t('accounts:create.submit')}
        </PrimaryButton>
      </div>
    </Card>
  )
}

/* ── edit role / municipality ───────────────────────────────────────────── */

function EditAccountForm({
  account,
  muniOptions,
  busy,
  onCancel,
  onSubmit,
}: {
  account: Account
  muniOptions: { value: string; label: string }[]
  busy: boolean
  onCancel: () => void
  onSubmit: (patch: { role: Role; municipality_id: string | null }) => Promise<void>
}) {
  const { t } = useTranslation(['accounts', 'auth', 'common'])
  const { userId } = useAuth()
  const [role, setRole] = useState<Role>(account.role)
  const [municipality, setMunicipality] = useState(account.municipality_id ?? '')
  const [error, setError] = useState<string | null>(null)
  const needsMunicipality = role !== 'super_admin' && role !== 'participant'

  return (
    <Card as="section" className="mt-[18px] p-5">
      <SectionRule title={t('accounts:edit.title', { name: account.full_name })} />
      {account.id === userId ? (
        <p className="mt-2 text-[14px] text-muted">{t('accounts:edit.selfNote')}</p>
      ) : null}
      <div className="mt-4 grid grid-cols-12 gap-x-4 gap-y-4">
        <Field
          spec={{
            key: 'role',
            label: t('accounts:fields.role'),
            type: 'select',
            span: 6,
            options: STAFF_ROLES.map((r) => ({ value: r, label: t(`auth:role.${r}`) })),
            disabled: account.id === userId,
          }}
          value={role}
          onChange={(v) => setRole(v as Role)}
        />
        <Field
          spec={{
            key: 'municipality',
            label: t('accounts:fields.municipality'),
            type: 'select',
            span: 6,
            options: muniOptions,
            disabled: role === 'super_admin',
            ...(role === 'super_admin' ? { help: t('accounts:fields.municipalityNoneForSuper') } : {}),
            ...(error ? { error } : {}),
          }}
          value={role === 'super_admin' ? '' : municipality}
          onChange={setMunicipality}
        />
      </div>
      <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
        <SecondaryButton onClick={onCancel} disabled={busy}>
          {t('common:actions.cancel')}
        </SecondaryButton>
        <PrimaryButton
          disabled={busy}
          onClick={() => {
            if (needsMunicipality && !municipality) {
              setError(t('accounts:errors.municipalityRequired'))
              return
            }
            setError(null)
            void onSubmit({ role, municipality_id: role === 'super_admin' ? null : municipality })
          }}
        >
          {t('accounts:edit.submit')}
        </PrimaryButton>
      </div>
    </Card>
  )
}

export default Accounts
