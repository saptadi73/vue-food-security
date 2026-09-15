import { reactive, readonly } from 'vue'

export interface TraceEntry {
  id: string
  method: string
  path: string
  status: number | null
  ok: boolean
  durationMs: number
  requestId: string | null
  correlationId: string
  serverTimeMs: number | null
  message: string
  startedAt: number
}

const MAX_ENTRIES = 60

const state = reactive({
  entries: [] as TraceEntry[],
  inFlight: 0,
})

/** Log ringan setiap request API supaya penelusuran masalah tidak butuh devtools. */
export const apiTrace = {
  state: readonly(state),

  start() {
    state.inFlight += 1
  },

  finish(entry: TraceEntry) {
    state.inFlight = Math.max(0, state.inFlight - 1)
    state.entries.unshift(entry)
    if (state.entries.length > MAX_ENTRIES) state.entries.length = MAX_ENTRIES
  },

  clear() {
    state.entries.splice(0, state.entries.length)
  },
}
