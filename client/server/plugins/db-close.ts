export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('afterResponse', (event) => {
    const client = event.context.__dbClient as { end: (o?: any) => Promise<void> } | undefined
    if (!client) return

    const closing = client.end({ timeout: 5 }).catch(() => {})
    const waitUntil = event.context.waitUntil as ((p: Promise<unknown>) => void) | undefined
    waitUntil?.(closing)
  })
})
