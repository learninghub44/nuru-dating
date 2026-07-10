import type { MetadataRoute } from 'next'

const BASE_URL = 'https://www.nurufindlove.co.ke'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/admin',
        '/discover',
        '/matches',
        '/wallet',
        '/profile',
        '/chat/',
        '/ai/',
        '/onboarding',
        '/banned',
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
