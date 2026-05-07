import type { MetadataRoute } from 'next'
import fs from 'fs'
import path from 'path'

export default function sitemap(): MetadataRoute.Sitemap {
  const catalogPath = path.join(process.cwd(), 'public', 'books', 'catalog.json')
  const catalog: Array<{ id: number }> = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'))

  const baseUrl = 'https://books.purplelica.com'
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/recommended`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ]

  const bookPages: MetadataRoute.Sitemap = catalog.map(book => ({
    url: `${baseUrl}/book/${book.id}/info`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.9,
  }))

  return [...staticPages, ...bookPages]
}
