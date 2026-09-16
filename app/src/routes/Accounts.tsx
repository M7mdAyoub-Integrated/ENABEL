import { useId, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, EmptyState, PrimaryButton, SecondaryButton, SectionRule } from '../ui/primitives'
import { DataTable, type RowAction } from '../ui/DataTable'
import { Field } from '../ui/Field'
import { Modal } from '../ui/Modal'
import { ErrorState, TableSkeleton, WriteError } from '../ui/states'
import { useToast } from '../ui/Toast'
import { CROSS } from '../ui/glyphs'
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
import { useMunicipalities, useMunicipalityName, type Municipality } from '../data/municipalities'
import { ACCOUNT_FILTER_PARAMS } from '../layout/platformDialogContext'
import type { ListRow } from '../hooks/useData'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Staff accounts. Super admin only (RAMTHA_IMPLEMENTATION_PLAN.md §2.5).
 *
 *  Rendered inside the platform dialog (layout/PlatformDialog.tsx), never as
 *  a page inside a municipality's shell: an account belongs to the platform,
 *  and a super admin acting on a municipality sees that municipality's
 *  product with the platform's administration in a dialog over it.
 *  `/accounts` is still an address and opens the dialog here.
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
 *
 *  ── The filters live in the URL ──
 *
 *  Municipality, role, active-or-not and a text search on name and email,
 *  as `?muni=`, `?role=`, `?status=` and `?q=` beside the dialog's own
 *  `?platform=accounts` (platformDialogContext.ts), so a view can be shared
 *  and a refresh does not lose it. A value the URL carries that nothing here
 *  recognises — a slug that is not a municipality, a role that is not one —
 *  is read as "not set" rather than as an error, and the address is left as
 *  it came. Below 768px the four controls sit behind one "Filters" control
 *  instead of wrapping into a tall row; the chips beneath still show what is
 *  active without opening it.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const STAFF_ROLES: readonly Role[] = ROLES.filter((r) => r !== 'participant')

/* ── filters ─────────────────────────────────────────────────────────────── */

/** `?muni=none`: the accounts that belong to no municipality — super admins. */
const NO_MUNICIPALITY = 'none'
const STATUSES = ['active', 'deactivated'] as const
type Status = (typeof STATUSES)[number]

type Filters = {
  q: string
  /** A municipality's slug, `none`, or null for any. */
  muni: string | null
  role: Role | null
  status: Status | null
}

function readFilters(params: URLSearchParams, municipalities: readonly Municipality[]): Filters {
  const muni = params.get('muni')
  const role = params.get('role')
  const status = params.get('status')
  return {
    q: params.get('q') ?? '',
    muni: muni === NO_MUNICIPALITY || municipalities.some((m) => m.slug === muni) ? muni : null,
    role: (ROLES as readonly string[]).includes(role ?? '') ? (role as Role) : null,
    status: (STATUSES as readonly string[]).includes(status ?? '') ? (status as Status) : null,
  }
}

function matches(a: Account, f: Filters, idOfSlug: (slug: string) => string | null): boolean {
  const q = f.q.trim().toLowerCase()
  if (q && !`${a.full_name} ${a.email ?? ''}`.toLowerCase().includes(q)) return false
  if (f.muni === NO_MUNICIPALITY) {
    if (a.municipality_id !== null) return false
  } else if (f.muni && a.municipality_id !== idOfSlug(f.muni)) return false
  if (f.role && a.role !== f.role) return false
  if (f.status && (f.status === 'active') !== a.is_active) return false
  return true
}

const SELECT =
  'min-h-11 w-full min-w-0 cursor-pointer truncate border-0 bg-raised px-[14px] py-[11px] font-narrow text-[12.5px] font-bold uppercase tracking-[0.08em] text-ink'

/**
 * The filter strip: one 1.5px frame — search, municipality, role, status —
 * the list screens' control strip with three selects instead of one. From
 * 768px the search has the first row to itself and the three selects share
 * the second, hairlines between: four cells in one row truncated every
 * select's label inside a 900px dialog. Below 768px the frame holds a
 * "Filters" control that opens the four stacked, so a phone does not get a
 * row that wraps to five lines above the list it is filtering.
 */
function AccountFilters({
  filters,
  active,
  municipalities,
  onChange,
}: {
  filters: Filters
  /** How many of the four are set — the badge on the phone control. */
  active: number
  municipalities: readonly Municipality[]
  onChange: (key: (typeof ACCOUNT_FILTER_PARAMS)[number], value: string) => void
}) {
  const { t } = useTranslation(['accounts', 'auth'])
  const name = useMunicipalityName()
  const [expanded, setExpanded] = useState(false)
  const controlsId = useId()

  return (
    <div className="mt-5 border-[1.5px] border-ink">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={controlsId}
        onClick={() => setExpanded((v) => !v)}
        className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 px-[14px] font-narrow text-[12.5px] font-bold uppercase tracking-[0.08em] text-ink md:hidden"
      >
        <span>{t('accounts:filters.toggle')}</span>
        <span className="flex items-center gap-3">
          {active > 0 ? (
            <span className="bg-ink px-2 py-[2px] text-[11px] text-bg tabular-nums">{active}</span>
          ) : null}
          <span aria-hidden="true" className="text-[11px] text-muted">
            {expanded ? t('accounts:filters.hide') : t('accounts:filters.show')}
          </span>
        </span>
      </button>
      <div id={controlsId} className={`${expanded ? 'block' : 'hidden'} md:block`}>
        <label className="block border-t-[1.5px] border-ink md:border-t-0">
          <span className="sr-only">{t('accounts:filters.searchLabel')}</span>
          <input
            type="search"
            value={filters.q}
            onChange={(e) => onChange('q', e.target.value)}
            placeholder={t('accounts:filters.searchPlaceholder')}
            className="w-full min-w-0 border-0 bg-bg px-[14px] py-[11px] text-[15px] text-ink placeholder:text-ghost"
          />
        </label>
        <div className="flex flex-col md:flex-row md:items-stretch">
          <label className="min-w-0 border-t-[1.5px] border-ink md:flex-1">
            <span className="sr-only">{t('accounts:filters.municipality')}</span>
            <select value={filters.muni ?? ''} onChange={(e) => onChange('muni', e.target.value)} className={SELECT}>
              <option value="">{t('accounts:filters.anyMunicipality')}</option>
              {municipalities.map((m) => (
                <option key={m.id} value={m.slug}>
                  {name(m)}
                </option>
              ))}
              <option value={NO_MUNICIPALITY}>{t('accounts:filters.noMunicipality')}</option>
            </select>
          </label>
          <label className="min-w-0 border-t-[1.5px] border-ink md:flex-1 md:border-s-[1.5px]">
            <span className="sr-only">{t('accounts:filters.role')}</span>
            <select value={filters.role ?? ''} onChange={(e) => onChange('role', e.target.value)} className={SELECT}>
              <option value="">{t('accounts:filters.anyRole')}</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`auth:role.${r}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0 border-t-[1.5px] border-ink md:flex-1 md:border-s-[1.5px]">
            <span className="sr-only">{t('accounts:filters.status')}</span>
            <select value={filters.status ?? ''} onChange={(e) => onChange('status', e.target.value)} className={SELECT}>
              <option value="">{t('accounts:filters.anyStatus')}</option>
              <option value="active">{t('accounts:status.active')}</option>
              <option value="deactivated">{t('accounts:status.inactive')}</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  )
}

/** One active filter, with the control that removes it. */
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  const { t } = useTranslation('accounts')
  return (
    <span className="inline-flex items-stretch border-[1.5px] border-ink font-narrow text-[11.5px] font-bold uppercase tracking-[0.1em] text-ink">
      <span className="flex items-center px-[9px] py-1">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={t('filters.remove', { label })}
        className="flex min-w-8 cursor-pointer items-center justify-center border-s-[1.5px] border-ink px-2 text-[15px] leading-none hover:bg-ink hover:text-bg"
      >
        <span aria-hidden="true">{CROSS}</span>
      </button>
    </span>
  )
}

function roleTone(role: Role): 'ok' | 'warn' | 'err' | 'mute' | 'pending' {
  if (role === 'super_admin') return 'warn'
  if (role === 'coordinator') return 'ok'
  return 'mute'
}

export function AccountsSection() {
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

  // The filters, read from and written to the URL. Every write replaces the
  // history entry — a keystroke in the search box is not a place to go
  // Back to — and leaves `?platform=accounts` and `?m=` where they are.
  const [params, setParams] = useSearchParams()
  const filters = readFilters(params, municipalities ?? [])
  const setFilter = (key: (typeof ACCOUNT_FILTER_PARAMS)[number], value: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true },
    )
  const clearFilters = () =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const k of ACCOUNT_FILTER_PARAMS) next.delete(k)
        return next
      },
      { replace: true },
    )
  const idOfSlug = (slug: string) => municipalities?.find((m) => m.slug === slug)?.id ?? null
  const all = accounts.data ?? []
  const shown = all.filter((a) => matches(a, filters, idOfSlug))
  const chips: { key: (typeof ACCOUNT_FILTER_PARAMS)[number]; label: string }[] = [
    ...(filters.q.trim() ? [{ key: 'q' as const, label: t('accounts:filters.chip.q', { value: filters.q.trim() }) }] : []),
    ...(filters.muni
      ? [
          {
            key: 'muni' as const,
            label: t('accounts:filters.chip.muni', {
              value:
                filters.muni === NO_MUNICIPALITY
                  ? t('accounts:filters.noMunicipality')
                  : name(municipalities?.find((m) => m.slug === filters.muni)),
            }),
          },
        ]
      : []),
    ...(filters.role ? [{ key: 'role' as const, label: t('accounts:filters.chip.role', { value: t(`auth:role.${filters.role}`) }) }] : []),
    ...(filters.status
      ? [
          {
            key: 'status' as const,
            label: t('accounts:filters.chip.status', {
              value: filters.status === 'active' ? t('accounts:status.active') : t('accounts:status.inactive'),
            }),
          },
        ]
      : []),
  ]
  const filtering = chips.length > 0

  const rows: ListRow[] = shown.map((a) => ({
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
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <p className="text-[15px] leading-relaxed text-body">{t('accounts:intro')}</p>
        <div className="flex-none">
          <PrimaryButton onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? t('common:actions.cancel') : t('accounts:create.open')}
          </PrimaryButton>
        </div>
      </div>

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
          <AccountFilters
            filters={filters}
            active={chips.length}
            municipalities={municipalities ?? []}
            onChange={setFilter}
          />
          {/* What is showing, and every filter that narrows it, each with
              its own remove. The count is always here so "3 of 8" beside
              two chips reads as one sentence about the list below. */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="me-1 font-narrow text-[12px] font-bold uppercase tracking-[0.08em] text-muted tabular-nums">
              {t('accounts:filters.showing', { shown: shown.length, total: all.length })}
            </span>
            {chips.map((c) => (
              <FilterChip key={c.key} label={c.label} onRemove={() => setFilter(c.key, '')} />
            ))}
            {filtering ? (
              <button
                type="button"
                onClick={clearFilters}
                className="min-h-8 cursor-pointer px-2 font-narrow text-[11.5px] font-bold uppercase tracking-[0.1em] text-ink underline decoration-[1.5px] underline-offset-[3px] hover:bg-sunken"
              >
                {t('accounts:filters.clearAll')}
              </button>
            ) : null}
          </div>
        </div>
        {accounts.isLoading ? (
          <div className="p-5">
            <TableSkeleton columns={5} />
          </div>
        ) : accounts.isError ? (
          <div className="p-5">
            <ErrorState error={accounts.error} onRetry={() => void accounts.refetch()} />
          </div>
        ) : shown.length === 0 && filtering ? (
          <div className="p-5">
            <EmptyState
              title={t('accounts:filters.emptyTitle')}
              description={t('accounts:filters.emptyDesc', { total: all.length })}
              actions={<SecondaryButton onClick={clearFilters}>{t('accounts:filters.clearAll')}</SecondaryButton>}
            />
          </div>
        ) : (
          /* Stacked at every width, still: the five-column table with three
             actions per row needs 1041px, and this dialog's body is at most
             ~850px, so the table rendering would be sideways scroll here as
             it was in the 760px panel. See DataTable. */
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
            layout="stacked"
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

export default AccountsSection
