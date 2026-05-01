'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { CatalogBook } from '@/lib/catalog'
import { getCatalogCoverUrl } from '@/lib/catalog'
import koreanTitlesRaw from '@/lib/korean-titles.json'

const KOREAN_TITLES: Record<string, string> = koreanTitlesRaw as Record<string, string>

const BOOK_DESCRIPTIONS: Record<string, string> = {
  '84': '과학자 빅터 프랑켄슈타인이 새 생명을 창조했지만 그 존재로 인해 비극을 맞이하는 공포 소설. 메리 셸리의 불멸의 걸작으로 근대 SF의 시초.',
  '1342': '편견과 오만을 넘어선 엘리자베스 베넷과 다아시의 사랑 이야기. 제인 오스틴의 대표작이자 영문 로맨스 소설의 정수.',
  '11': '앨리스가 토끼를 따라 이상한 나라로 떨어지는 환상 동화. 어른도 즐길 수 있는 숨겨진 철학과 유머가 가득.',
  '2701': '선장 에이헤브의 흰 고래 모비딕에 대한 집착과 복수를 그린 대서사시. 인간의 야망과 자연의 위력을 탁월하게 묘사.',
  '1952': '드라큘라 백작과 그를 쫓는 영웅들의 대결. 뱀파이어 소설의 원형이자 고딕 공포의 영원한 걸작.',
  '98': '프랑스 혁명을 배경으로 런던과 파리 두 도시에 걸친 사랑과 희생의 이야기. 찰스 디킨스의 역사 대하소설.',
  '1661': '셜록 홈즈의 첫 등장. 피로 쓰인 수수께끼를 풀어가는 탐정 소설의 고전으로 추리 장르의 시초.',
  '74': '미시시피 강을 떠내려가는 허클베리 핀의 자유로운 모험기. 마크 트웨인이 그린 미국의 자유와 우정.',
  '2554': '가난한 청년의 살인과 그에 따른 죄의식을 심층 탐구한 심리 소설. 도스토예프스키의 철학적 걸작.',
  '76': '인디언 조의 보물을 찾아나서는 톰 소여의 유쾌한 모험기. 마크 트웨인의 활기찬 소년 성장 소설.',
  '5200': '하룻밤 사이에 벌레로 변해버린 그레고르의 이야기. 카프카의 부조리 문학 대표작으로 현대인의 소외를 상징.',
  '1080': '지킬 박사가 약물로 또 다른 자아 하이드를 만들어내는 이중 인격 공포 소설. 인간 내면의 선악을 탐구.',
  '174': '아름다운 청년 도리언 그레이의 타락과 절망을 그린 오스카 와일드의 유일한 장편소설. 미와 도덕의 충돌.',
  '120': '어른이 되기를 거부하는 피터 팬이 아이들을 이끌고 네버랜드로 가는 환상 동화.',
  '16': '앨리스가 거울 속 세계를 탐험하는 이상한 나라의 속편. 체스 게임을 배경으로 펼쳐지는 환상 모험.',
  '1260': '해양 탐험가 걸리버가 소인국·거인국·이상한 나라를 여행하는 풍자 소설. 인간 사회를 날카롭게 비판.',
  '345': '브램 스토커의 드라큘라. 서간문 형식으로 전개되는 뱀파이어 공포의 원전.',
  '1400': '샬럿 브론테의 자전적 소설. 고아 제인 에어가 역경을 딛고 사랑을 찾아가는 이야기.',
  '158': '에마 우드하우스가 주변 사람들의 사랑을 주선하다가 자신의 마음을 깨닫는 오스틴의 걸작 코미디.',
  '768': '황야의 폭풍 같은 사랑, 히스클리프와 캐서린의 파국적 열정. 에밀리 브론테의 유일한 소설.',
}

export default function BookInfoPage() {
  const params = useParams()
  const router = useRouter()
  const bookId = String(params.id)
  const [book, setBook] = useState<CatalogBook | null>(null)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    fetch('/api/catalog')
      .then((r) => r.json())
      .then((data: CatalogBook[]) => {
        const found = data.find((b) => String(b.id) === bookId)
        setBook(found ?? null)
      })
      .catch(() => setBook(null))
  }, [bookId])

  const koTitle = book ? KOREAN_TITLES[bookId] : null
  const desc = BOOK_DESCRIPTIONS[bookId] ?? 'Project Gutenberg에서 무료로 제공하는 영문 고전 작품입니다.'
  const cover = book ? getCatalogCoverUrl(book.id) : null

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--paper)', color: 'var(--ink)' }}>

      {/* 상단 바 */}
      <header
        className="sticky top-0 z-10 flex items-center px-4 sm:px-6 py-4 gap-3"
        style={{ background: 'var(--accent-deep)', borderBottom: '1px solid rgba(250,250,247,0.1)' }}
      >
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-sm font-medium transition-opacity opacity-80 hover:opacity-100"
          style={{ color: 'var(--paper)' }}
        >
          ← 목록으로
        </button>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 flex flex-col items-center justify-start px-5 pt-10 pb-16 max-w-lg mx-auto w-full">

        {!book ? (
          /* 로딩 스켈레톤 */
          <div className="w-full animate-pulse space-y-6">
            <div className="mx-auto w-44 h-64 rounded-xl" style={{ background: 'var(--paper-3)' }} />
            <div className="space-y-3">
              <div className="h-5 rounded w-1/3 mx-auto" style={{ background: 'var(--paper-3)' }} />
              <div className="h-8 rounded w-2/3 mx-auto" style={{ background: 'var(--paper-3)' }} />
              <div className="h-4 rounded w-1/2 mx-auto" style={{ background: 'var(--paper-3)' }} />
            </div>
          </div>
        ) : (
          <>
            {/* 표지 */}
            <div
              className="w-44 h-64 rounded-xl overflow-hidden shadow-2xl mb-8"
              style={{ border: '1px solid rgba(0,0,0,0.08)' }}
            >
              {!imgError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cover!}
                  alt={book.title}
                  className="w-full h-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div
                  className="w-full h-full flex flex-col items-center justify-center gap-3 p-4"
                  style={{ background: 'var(--paper-2)' }}
                >
                  <p
                    className="text-sm text-center leading-snug line-clamp-4"
                    style={{ fontFamily: 'var(--serif)', color: 'var(--ink-3)' }}
                  >
                    {book.title}
                  </p>
                </div>
              )}
            </div>

            {/* 제목 영역 */}
            <div className="w-full text-center space-y-2 mb-6">
              {koTitle && (
                <p className="text-sm font-semibold" style={{ color: 'var(--accent-ink)' }}>
                  {koTitle}
                </p>
              )}
              <h1
                className="text-2xl sm:text-3xl leading-tight"
                style={{ fontFamily: 'var(--serif)', fontWeight: 500, color: 'var(--ink)' }}
              >
                {book.title}
              </h1>
              <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
                {book.author}
                {book.year > 0 && (
                  <span className="ml-2 text-xs" style={{ color: 'var(--ink-4)' }}>· {book.year}년</span>
                )}
              </p>
            </div>

            {/* 구분선 */}
            <div className="w-full mb-6" style={{ height: '1px', background: 'var(--paper-3)' }} />

            {/* 책 소개 */}
            <p
              className="w-full text-center leading-relaxed mb-10 text-sm sm:text-base"
              style={{ color: 'var(--ink-3)', fontFamily: 'var(--sans)', lineHeight: '1.8' }}
            >
              {desc}
            </p>

            {/* 읽기 시작 버튼 (크게) */}
            <button
              onClick={() => router.push(`/book/${bookId}?page=1`)}
              className="w-full py-5 rounded-2xl font-bold text-lg tracking-wide transition-all active:scale-95 shadow-lg"
              style={{
                background: 'var(--accent-deep)',
                color: 'var(--paper)',
                fontSize: '18px',
              }}
            >
              📖 읽기 시작
            </button>

            <p
              className="mt-4 text-xs"
              style={{ color: 'var(--ink-5)', fontFamily: 'var(--sans)' }}
            >
              한국어 번역 포함 · 단어 즉시 풀이 · 무료
            </p>
          </>
        )}
      </main>
    </div>
  )
}
