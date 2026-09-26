import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toAppError, unwrapList } from './errors'
import { EvidenceRefusal, prepareEvidence, type EvidenceKind } from '../lib/evidence/compress'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Evidence files, on Cloudflare R2, through the `evidence` Edge Function.
 *
 *  The browser never holds an R2 credential. An upload is three steps:
 *
 *    1. compress here (lib/evidence/compress.ts) -- mandatory, the limits are
 *       the database's, read from evidence_usage()
 *    2. ask the function for a presigned PUT and PUT the bytes to R2
 *    3. ask the function to confirm: it checks the object is there and is the
 *       size we said, then inserts the `attachment` row AS THE USER, so RLS
 *       and the audit trail behave as for every other table (0128)
 *
 *  Reading the list is a plain select under RLS. Opening a file and removing
 *  one go through the function too, because only it can sign a URL or delete
 *  an object. Nothing here computes anything the database could.
 *
 *  Every refusal is an EvidenceRefusal with a `result` the screen has words
 *  for (common:evidence.refusal.*), and the function's own refusals are
 *  passed through under the same shape.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type Attachment = {
  id: string
  entity_type: string
  entity_id: string
  bucket: string
  object_key: string
  file_name: string
  mime_type: string | null
  size_bytes: number
  original_size_bytes: number
  content_kind: EvidenceKind
  uploaded_at: string
  deleted_at: string | null
  /** The Khalidiyah Field ID a file answers (0158); null everywhere else. */
  field_code: string | null
}

export type EvidenceUsage = {
  used_bytes: number
  files: number
  original_bytes: number
  visible_bytes: number
  quota_bytes: number
  included_bytes: number
  file_limit_bytes: number
  by_table: { entity_type: string; files: number; bytes: number }[]
  by_record: { entity_type: string; entity_id: string; municipality_id: string; files: number; bytes: number }[]
  by_municipality: { code: string; bytes: number; files: number }[]
}

export type FunctionRefusalResult =
  | 'r2_not_configured' | 'not_signed_in' | 'not_permitted' | 'not_found' | 'record_deleted' | 'file_too_large'
  | 'quota_exceeded' | 'object_missing' | 'size_mismatch' | 'store_unreachable' | 'insert_refused'
  | 'coordinator_only' | 'bucket_mismatch' | 'upload_failed' | 'bad_request' | 'field_full' | 'unknown'

export class EvidenceFunctionRefusal extends Error {
  readonly result: FunctionRefusalResult
  readonly values: Record<string, string | number>
  constructor(result: FunctionRefusalResult, values: Record<string, string | number> = {}) {
    super(result)
    this.result = result
    this.values = values
  }
}

type FnResult = { ok: boolean; result?: string; [k: string]: unknown }

async function invokeEvidence(body: Record<string, unknown>): Promise<FnResult> {
  const { data, error } = await supabase.functions.invoke<FnResult>('evidence', { body })
  if (error) {
    // A non-2xx answer still carries the function's JSON in `context`; read
    // it, because `result` is the only thing that says what was refused.
    const ctx = (error as { context?: Response }).context
    if (ctx && typeof ctx.json === 'function') {
      try {
        const parsed = (await ctx.json()) as FnResult
        if (parsed && typeof parsed.result === 'string') return parsed
      } catch {
        /* fall through */
      }
    }
    throw toAppError(error)
  }
  return data as FnResult
}

function refusalOf(r: FnResult): EvidenceFunctionRefusal {
  const result = (r.result ?? 'unknown') as FunctionRefusalResult
  const values: Record<string, string | number> = {}
  for (const k of ['used_bytes', 'quota_bytes', 'size_bytes', 'file_limit_bytes', 'declared', 'stored', 'message', 'code', 'max_files']) {
    const v = r[k]
    if (typeof v === 'number' || typeof v === 'string') values[k] = v
  }
  if (Array.isArray(r['missing'])) values['missing'] = (r['missing'] as string[]).join(', ')
  return new EvidenceFunctionRefusal(result, values)
}

export const evidenceKeys = {
  /** A record's files; with a field code, the files of that one field (a longer key under the same prefix). */
  list: (entityType: string, entityId: string, fieldCode?: string) =>
    (fieldCode ? ['evidence', 'list', entityType, entityId, fieldCode] : ['evidence', 'list', entityType, entityId]) as readonly string[],
  usage: ['evidence', 'usage'] as const,
}

export function useAttachments(entityType: string, entityId: string | undefined, fieldCode?: string) {
  return useQuery({
    queryKey: evidenceKeys.list(entityType, entityId ?? '', fieldCode),
    enabled: !!entityId,
    queryFn: async (): Promise<Attachment[]> => {
      let q = supabase
        .from('attachment')
        .select('id, entity_type, entity_id, bucket, object_key, file_name, mime_type, size_bytes, original_size_bytes, content_kind, uploaded_at, deleted_at, field_code')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId!)
        .is('deleted_at', null)
      if (fieldCode) q = q.eq('field_code', fieldCode)
      const res = await (q.order('uploaded_at', { ascending: false }) as unknown as Promise<{ data: Attachment[] | null; error: unknown }>)
      return unwrapList(res)
    },
  })
}

export function useEvidenceUsage() {
  return useQuery({
    queryKey: evidenceKeys.usage,
    staleTime: 30_000,
    queryFn: async (): Promise<EvidenceUsage> => {
      const { data, error } = await supabase.rpc('evidence_usage')
      if (error) throw toAppError(error)
      return data as unknown as EvidenceUsage
    },
  })
}

export type UploadInput = { file: File; kind: EvidenceKind }

export function useUploadEvidence(entityType: string, entityId: string, fieldCode?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['evidence', 'upload', entityType, entityId],
    retry: false,
    mutationFn: async ({ file, kind }: UploadInput): Promise<string> => {
      // The per-file limit is the database's; asked for rather than copied.
      const usage = await qc.fetchQuery({
        queryKey: evidenceKeys.usage,
        staleTime: 30_000,
        queryFn: async (): Promise<EvidenceUsage> => {
          const { data, error } = await supabase.rpc('evidence_usage')
          if (error) throw toAppError(error)
          return data as unknown as EvidenceUsage
        },
      })
      const prepared = await prepareEvidence(file, kind, usage.file_limit_bytes)

      const presigned = await invokeEvidence({
        action: 'presign_upload',
        entity_type: entityType,
        entity_id: entityId,
        file_name: prepared.fileName,
        size_bytes: prepared.blob.size,
        ...(fieldCode ? { field_code: fieldCode } : {}),
      })
      if (!presigned.ok) throw refusalOf(presigned)

      let put: Response
      try {
        put = await fetch(String(presigned['url']), {
          method: 'PUT',
          body: prepared.blob,
          headers: { 'Content-Type': prepared.mimeType },
        })
      } catch {
        throw new EvidenceFunctionRefusal('upload_failed', { message: 'network' })
      }
      if (!put.ok) throw new EvidenceFunctionRefusal('upload_failed', { code: put.status })

      const confirmed = await invokeEvidence({
        action: 'confirm',
        key: presigned['key'],
        entity_type: entityType,
        entity_id: entityId,
        file_name: prepared.fileName,
        mime_type: prepared.mimeType,
        size_bytes: prepared.blob.size,
        original_size_bytes: prepared.originalSize,
        content_kind: prepared.kind,
        ...(fieldCode ? { field_code: fieldCode } : {}),
      })
      if (!confirmed.ok) throw refusalOf(confirmed)
      return String(confirmed['id'])
    },
    onSettled: () => {
      // The list the user is looking at, and the total the settings screen
      // shows -- whichever of them is mounted.
      void qc.invalidateQueries({ queryKey: evidenceKeys.list(entityType, entityId) })
      void qc.invalidateQueries({ queryKey: evidenceKeys.usage })
    },
  })
}

/** A short-lived signed URL for one file, opened by the caller. */
export async function evidenceUrl(attachmentId: string): Promise<string> {
  const r = await invokeEvidence({ action: 'download', attachment_id: attachmentId })
  if (!r.ok) throw refusalOf(r)
  return String(r['url'])
}

export function useRemoveEvidence(entityType: string, entityId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['evidence', 'remove', entityType, entityId],
    retry: false,
    mutationFn: async (attachmentId: string): Promise<{ objectDeleted: boolean }> => {
      const r = await invokeEvidence({ action: 'remove', attachment_id: attachmentId })
      if (!r.ok) throw refusalOf(r)
      return { objectDeleted: r['object_deleted'] === true }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: evidenceKeys.list(entityType, entityId) })
      void qc.invalidateQueries({ queryKey: evidenceKeys.usage })
    },
  })
}

export function isEvidenceRefusal(e: unknown): e is EvidenceRefusal | EvidenceFunctionRefusal {
  return e instanceof EvidenceRefusal || e instanceof EvidenceFunctionRefusal
}
