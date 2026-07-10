import type { MetadataRoute } from 'next'

const BASE_URL = 'https://www.nurufindlove.co.ke'

// Only public, crawlable marketing/legal pages belong here — authenticated
// app screens (discover, matches, wallet, profile, chat, admin) are behind
// login and shouldn't be indexed.
export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
    { path: '', priority: 1, changeFrequency: 'weekly' },
    { path: '/about', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/careers', priority: 0.4, changeFrequency: 'monthly' },
    { path: '/press', priority: 0.4, changeFrequency: 'monthly' },
    { path: '/contact', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/help', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/safety', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/cookies', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/login', priority: 0.5, changeFrequency: 'yearly' },
    { path: '/register', priority: 0.8, changeFrequency: 'yearly' },
  ]

  const lastModified = new Date()

  return staticPages.map((page) => ({
    url: `${BASE_URL}${page.path}`,
    lastModified,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }))
}
