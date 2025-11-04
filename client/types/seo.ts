export interface SeoMeta {
  title: string
  description: string
  keywords: string[]
  image?: string
  url?: string
  type?: "website" | "article" | "app"
}

export interface StructuredData {
  "@context": string
  "@type": string
  [key: string]: any
}

export interface OpenGraphMeta {
  title: string
  description: string
  image: string
  url: string
  type: string
}

export interface TwitterCardMeta {
  card: "summary" | "summary_large_image" | "app" | "player"
  title: string
  description: string
  image: string
  site?: string
  creator?: string
}
