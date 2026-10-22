import payloadConfig from '@payload-config'
import { getPayload } from 'payload'

import { handleView } from '@/lib/attachments/handler'
import { viewDeps } from '@/lib/attachments/server'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return handleView(
    request,
    id,
    viewDeps(() => getPayload({ config: payloadConfig })),
  )
}
