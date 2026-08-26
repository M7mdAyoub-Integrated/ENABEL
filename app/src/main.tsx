import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'

// i18n must initialise before the first render so no component ever sees an
// uninitialised t(). Imported for its side effect.
import './i18n'
import './index.css'

// Imported for its side effect only: constructing the client validates that
// VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are actually present, and fails
// loudly at startup if they are not. Without this import the module is
// tree-shaken and a misconfigured .env would stay silent until the first query
// in Phase 4. NO QUERIES ARE MADE -- see 08_FRONTEND_BUILD_PLAN.md phase 1.
import './lib/supabase'

import App from './App.tsx'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element #root not found in index.html')

createRoot(rootEl).render(
  <StrictMode>
    <Suspense fallback={null}>
      <App />
    </Suspense>
  </StrictMode>,
)
