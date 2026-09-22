import type { PayloadRequest } from 'payload'

type PublicationDocument = {
  _status?: null | string
}

export function publicationAffectsFrontend(
  doc: PublicationDocument,
  previousDoc?: null | PublicationDocument,
): boolean {
  return doc._status === 'published' || previousDoc?._status === 'published'
}

export async function triggerFrontendRebuild(
  doc: PublicationDocument,
  previousDoc: null | PublicationDocument | undefined,
  req: PayloadRequest,
): Promise<void> {
  const deployHookUrl = process.env.FRONTEND_DEPLOY_HOOK_URL

  if (
    process.env.VERCEL_ENV !== 'production' ||
    !deployHookUrl ||
    !publicationAffectsFrontend(doc, previousDoc) ||
    req.context.skipFrontendRebuild
  ) {
    return
  }

  try {
    const response = await fetch(deployHookUrl, {
      method: 'POST',
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      throw new Error(`Deploy hook returned status ${response.status}`)
    }
  } catch (error) {
    req.payload.logger.error({
      err: error,
      msg: 'Frontend deploy hook failed after a CMS publication change',
    })
  }
}
