type CmsEnvironmentInput = {
  blobReadWriteToken?: string
  databaseUrl?: string
  nodeEnv?: string
  payloadSecret?: string
}

export type CmsEnvironment = {
  blobReadWriteToken: string
  databaseUrl: string
  payloadSecret: string
}

const LOCAL_PAYLOAD_SECRET = 'pznowak-cms-local-development-only'

function requireProductionValue(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required production environment variable: ${name}`)
  }

  return value
}

export function resolveCmsEnvironment(input: CmsEnvironmentInput): CmsEnvironment {
  if (input.nodeEnv === 'production') {
    return {
      blobReadWriteToken: requireProductionValue('BLOB_READ_WRITE_TOKEN', input.blobReadWriteToken),
      databaseUrl: requireProductionValue('DATABASE_URL', input.databaseUrl),
      payloadSecret: requireProductionValue('PAYLOAD_SECRET', input.payloadSecret),
    }
  }

  return {
    blobReadWriteToken: input.blobReadWriteToken ?? '',
    databaseUrl: input.databaseUrl ?? '',
    payloadSecret: input.payloadSecret || LOCAL_PAYLOAD_SECRET,
  }
}
