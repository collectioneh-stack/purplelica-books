'use client'

import Link from 'next/link'
import type { GutenbergBook } from '@/lib/gutenberg'
import { getCoverUrl, getAuthorName } from '@/lib/gutenberg'

export default function BookCard({ book }: { book: GutenbergBook }) {
  const cover = getCoverUrl(book)
  const author = getAuthorName(book)

  return (
    <Link href={`/book/${book.id}`}>
      <div className="group bg-white border border-violet-100 rounded-2xl overflow-hidden hover:border-violet-300 hover:shadow-lg hover:shadow-violet-100/50 transition-all duration-200 cursor-pointer">
        {/* 커버 이미지 */}
        <div className="aspect-[2/3] bg-violet-50 overflow-hidden relative">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt={book.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl text-violet-200">
              📚
            </div>
          )}
          <div className="absolute bottom-2 right-2 bg-violet-950/75 backdrop-blur text-violet-200 text-[10px] px-2 py-0.5 rounded-full">
            ↓ {(book.download_count / 1000).toFixed(0)}K
          </div>
        </div>

        {/* 책 정보 */}
        <div className="p-3 space-y-1">
          <h3 className="text-violet-950 text-sm font-semibold leading-tight line-clamp-2">
            {book.title}
          </h3>
          <p className="text-violet-400 text-xs">{author}</p>
        </div>
      </div>
    </Link>
  )
}
