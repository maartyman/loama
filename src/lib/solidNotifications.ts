import { trustflowsFetch } from '@/lib/trustflowsAuth'

const NOTIFICATION_CONTEXT = 'https://www.w3.org/ns/solid/notification/v1'
const NOTIFICATIONS_NAMESPACE = 'http://www.w3.org/ns/solid/notifications#'
const WEBSOCKET_CHANNEL_TYPE = `${NOTIFICATIONS_NAMESPACE}WebSocketChannel2023`
const RECEIVE_FROM = `${NOTIFICATIONS_NAMESPACE}receiveFrom`

type JsonLdValue = string | { '@id'?: string; id?: string } | Array<string | { '@id'?: string; id?: string }>

type DescriptionResource = {
  subscription?: DescriptionSubscription | DescriptionSubscription[]
}

type DescriptionSubscription = {
  id?: string
  '@id'?: string
  channelType?: string | string[]
}

type NotificationChannel = {
  receiveFrom?: string
  [RECEIVE_FROM]?: JsonLdValue
}

export type SolidNotification = {
  id?: string
  type?: string | string[]
  object?: string
  target?: string
  state?: string
  published?: string
  raw: MessageEvent
}

type SubscriptionOptions = {
  reconnectDelay?: number
  onError?: (error: unknown) => void
}

export type SolidNotificationSubscription = {
  close: () => void
}

export async function subscribeToSolidNotifications(
  topicUrl: string,
  onNotification: (notification: SolidNotification) => void,
  options: SubscriptionOptions = {}
): Promise<SolidNotificationSubscription> {
  const reconnectDelay = options.reconnectDelay ?? 5000
  let closed = false
  let socket: WebSocket | undefined
  let reconnectTimer: number | undefined

  const cleanupSocket = () => {
    socket?.close()
    socket = undefined
  }

  const connect = async () => {
    try {
      const channel = await createWebSocketChannel(topicUrl)

      if (closed) return

      socket = new WebSocket(channel.receiveFrom)
      socket.onmessage = (event) => onNotification(parseNotification(event))
      socket.onerror = (event) => options.onError?.(event)
      socket.onclose = () => {
        if (closed) return
        reconnectTimer = window.setTimeout(connect, reconnectDelay)
      }
    } catch (error) {
      options.onError?.(error)
      if (!closed) {
        reconnectTimer = window.setTimeout(connect, reconnectDelay)
      }
    }
  }

  await connect()

  return {
    close: () => {
      closed = true
      if (reconnectTimer) window.clearTimeout(reconnectTimer)
      cleanupSocket()
    }
  }
}

async function createWebSocketChannel(topicUrl: string): Promise<{ receiveFrom: string }> {
  const subscriptionUrl = await discoverWebSocketSubscriptionUrl(topicUrl)
  const response = await trustflowsFetch(subscriptionUrl, {
    method: 'POST',
    headers: {
      accept: 'application/ld+json',
      'content-type': 'application/ld+json'
    },
    body: JSON.stringify({
      '@context': NOTIFICATION_CONTEXT,
      type: WEBSOCKET_CHANNEL_TYPE,
      topic: topicUrl,
      accept: 'application/ld+json'
    })
  })

  if (!response.ok) {
    throw new Error(`Failed to create Solid notification channel for ${topicUrl}: ${response.status}`)
  }

  const channel = (await response.json()) as NotificationChannel
  const receiveFrom = compactJsonLdValue(channel.receiveFrom ?? channel[RECEIVE_FROM])

  if (!receiveFrom) {
    throw new Error(`Solid notification channel for ${topicUrl} did not include receiveFrom`)
  }

  return { receiveFrom }
}

async function discoverWebSocketSubscriptionUrl(topicUrl: string): Promise<string> {
  const descriptionUrl = await discoverDescriptionUrl(topicUrl)

  if (!descriptionUrl) {
    return new URL('/.notifications/WebSocketChannel2023/', topicUrl).href
  }

  const response = await trustflowsFetch(descriptionUrl, {
    headers: { accept: 'application/ld+json' }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch Solid notification description for ${topicUrl}: ${response.status}`)
  }

  const description = (await response.json()) as DescriptionResource
  const subscription = toArray(description.subscription).find((entry) =>
    toArray(entry.channelType).some(isWebSocketChannelType)
  )
  const id = subscription?.id ?? subscription?.['@id']

  if (!id) {
    throw new Error(`No WebSocketChannel2023 subscription was advertised for ${topicUrl}`)
  }

  return new URL(id, descriptionUrl).href
}

async function discoverDescriptionUrl(topicUrl: string): Promise<string | undefined> {
  const response = await trustflowsFetch(topicUrl, { method: 'HEAD' })
  const linkHeader = response.headers.get('link')

  const descriptionLink = parseLinkHeader(linkHeader).find((link) =>
    link.rel.includes('describedby') || link.rel.includes('http://www.w3.org/ns/solid/terms#storageDescription')
  )

  return descriptionLink ? new URL(descriptionLink.url, topicUrl).href : undefined
}

function parseNotification(event: MessageEvent): SolidNotification {
  if (typeof event.data !== 'string') return { raw: event }

  try {
    const data = JSON.parse(event.data) as unknown
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { raw: event }

    return { ...data, raw: event }
  } catch {
    return { raw: event }
  }
}

function compactJsonLdValue(value?: JsonLdValue): string | undefined {
  if (!value) return undefined
  if (Array.isArray(value)) return compactJsonLdValue(value[0])
  if (typeof value === 'string') return value

  return value.id ?? value['@id']
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function isWebSocketChannelType(type: string): boolean {
  return type === 'WebSocketChannel2023' || type === WEBSOCKET_CHANNEL_TYPE
}

function parseLinkHeader(header: string | null): Array<{ url: string; rel: string[] }> {
  if (!header) return []

  return splitLinkHeader(header).map((link) => {
    const url = link.match(/<([^>]+)>/)?.[1] ?? ''
    const rel = link.match(/;\s*rel="?([^";]+)"?/)?.[1]?.split(/\s+/) ?? []

    return { url, rel }
  }).filter((link) => link.url)
}

function splitLinkHeader(header: string): string[] {
  const links: string[] = []
  let current = ''
  let inQuotes = false

  for (const char of header) {
    if (char === '"') inQuotes = !inQuotes
    if (char === ',' && !inQuotes) {
      links.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  if (current.trim()) links.push(current.trim())
  return links
}
