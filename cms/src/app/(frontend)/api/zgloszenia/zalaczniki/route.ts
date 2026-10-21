import payloadConfig from '@payload-config'
import { after } from 'next/server'
import { getPayload } from 'payload'

import { handleUpload } from '@/lib/attachments/handler'
import { uploadDeps } from '@/lib/attachments/server'
import { submissionSettingsFromEnv } from '@/lib/submissions/config'

// Odczyt do 4 MB, dekodowanie i zapis dwóch plików; zapas na wolne łącze klienta.
export const maxDuration = 60

export function POST(request: Request) {
  const deps = uploadDeps(
    () => getPayload({ config: payloadConfig }),
    submissionSettingsFromEnv(),
    (task) => after(task),
  )
  return handleUpload(request, deps)
}
