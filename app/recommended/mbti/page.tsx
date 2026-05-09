'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { CatalogBook } from '@/lib/catalog'
import { getCatalogCoverUrl } from '@/lib/catalog'
import koreanTitlesRaw from '@/lib/korean-titles.json'

const KOREAN_TITLES: Record<string, string> = koreanTitlesRaw as Record<string, string>

/* ── 장르 정의 ── */
const GENRE_LABELS: Record<string, string> = {
  fiction: '소설',
  mystery: '미스터리',
  horror: '공포',
  adventure: '모험',
  philosophy: '철학',
  classic: '고전',
}

const GENRE_KEYWORDS: Record<string, string[]> = {
  fiction:    ['Dickens', 'Austen', 'Tolstoy', 'Dostoevsky', 'Hugo', 'Joyce', 'Brontë', 'Hardy', 'James', 'Wharton', 'Chopin', 'Forster', 'Alcott', 'Montgomery', 'Burnett', 'Cather'],
  mystery:   ['Doyle', 'Sherlock', 'Scarlet', 'Baskervilles', 'Study'],
  horror:    ['Frankenstein', 'Dracula', 'Strange Case', 'Yellow Wallpaper', 'Great God Pan', 'Sleepy Hollow', 'Phantom'],
  adventure: ['Huckleberry', 'Tom Sawyer', 'Treasure Island', 'Call of the Wild', 'Sea-Wolf', 'White Fang', 'Jungle Book', 'Around the World', 'Twenty Thousand', 'Time Machine', 'War of the Worlds', 'Island of Doctor Moreau'],
  philosophy:['Nietzsche', 'Aurelius', 'Plato', 'Hobbes', 'Tao', 'Art of War', 'Prince', 'Leviathan', 'Meditations', 'Zarathustra', 'Beyond Good'],
  classic:   ['Homer', 'Odyssey', 'Iliad', 'Dante', 'Cervantes', 'Quixote', 'Arabian', 'Aesop', 'Grimm', 'Alighieri'],
}

function getBookGenres(book: CatalogBook): string[] {
  const haystack = `${book.title} ${book.author}`.toLowerCase()
  return Object.entries(GENRE_KEYWORDS)
    .filter(([, keywords]) => keywords.some((kw) => haystack.includes(kw.toLowerCase())))
    .map(([genre]) => genre)
}

/* ── MBTI 데이터 ── */
interface MbtiType {
  type: string
  title: string
  desc: string
  genres: { genre: string; score: number; reason: string }[]
}

const MBTI_DATA: MbtiType[] = [
  // 분석형 (NT)
  { type: 'INTJ', title: '전략가', desc: '독립적 사고와 깊은 분석을 즐기는 타입',
    genres: [
      { genre: 'philosophy', score: 5, reason: '전략적 사고와 권력 구조 분석에 몰입' },
      { genre: 'classic',    score: 4, reason: '인류 보편의 지혜에서 통찰 발견' },
      { genre: 'mystery',    score: 3, reason: '논리적 추론 과정 자체를 즐김' },
      { genre: 'fiction',    score: 2, reason: '사회 구조를 해부하는 소설 선호' },
      { genre: 'horror',     score: 2, reason: '심리적 공포의 메커니즘에 관심' },
      { genre: 'adventure',  score: 1, reason: '탐험보다 계획에 관심' },
    ]},
  { type: 'INTP', title: '논리술사', desc: '끝없는 지적 호기심과 이론 탐구',
    genres: [
      { genre: 'philosophy', score: 5, reason: '사상의 본질을 파고드는 재미' },
      { genre: 'mystery',    score: 4, reason: '복잡한 퍼즐을 해독하는 쾌감' },
      { genre: 'classic',    score: 4, reason: '고대 사상가의 논리 체계에 매료' },
      { genre: 'horror',     score: 3, reason: '과학과 괴기의 경계에 관심' },
      { genre: 'fiction',    score: 2, reason: '실험적 문체나 구조에 끌림' },
      { genre: 'adventure',  score: 2, reason: 'SF적 모험에 선택적 관심' },
    ]},
  { type: 'ENTJ', title: '통솔자', desc: '목표 지향적 리더, 효율과 성과 추구',
    genres: [
      { genre: 'philosophy', score: 5, reason: '리더십과 권력의 고전에서 전략 학습' },
      { genre: 'adventure',  score: 4, reason: '도전과 정복의 서사에 공감' },
      { genre: 'classic',    score: 3, reason: '역사적 리더의 결단에서 영감' },
      { genre: 'fiction',    score: 3, reason: '사회 변혁을 다룬 소설 선호' },
      { genre: 'mystery',    score: 2, reason: '효율적 문제 해결에 관심' },
      { genre: 'horror',     score: 1, reason: '감정적 공포보다 실용 선호' },
    ]},
  { type: 'ENTP', title: '변론가', desc: '창의적 토론가, 새로운 가능성 탐색',
    genres: [
      { genre: 'philosophy', score: 5, reason: '기존 관념을 뒤집는 사상에 열광' },
      { genre: 'mystery',    score: 4, reason: '반전과 트릭에 지적 자극' },
      { genre: 'adventure',  score: 4, reason: '예측 불가능한 전개를 즐김' },
      { genre: 'classic',    score: 3, reason: '시대를 초월한 논쟁거리 발견' },
      { genre: 'horror',     score: 3, reason: '파격적 설정에 끌림' },
      { genre: 'fiction',    score: 2, reason: '사회 풍자 소설에 관심' },
    ]},

  // 외교형 (NF)
  { type: 'INFJ', title: '옹호자', desc: '이상주의적 통찰력, 깊은 공감 능력',
    genres: [
      { genre: 'fiction',    score: 5, reason: '인간 내면의 복잡한 감정에 몰입' },
      { genre: 'classic',    score: 4, reason: '보편적 인간 조건에 공감' },
      { genre: 'philosophy', score: 4, reason: '의미와 목적에 대한 탐구' },
      { genre: 'horror',     score: 3, reason: '인간 본성의 어두운 면 탐색' },
      { genre: 'mystery',    score: 2, reason: '인물 심리에 집중하는 미스터리' },
      { genre: 'adventure',  score: 1, reason: '내면 여정을 선호' },
    ]},
  { type: 'INFP', title: '중재자', desc: '감성적 이상주의자, 내면 세계가 풍부',
    genres: [
      { genre: 'fiction',    score: 5, reason: '감정 몰입형 서사에 깊이 빠져듦' },
      { genre: 'horror',     score: 4, reason: '고딕 로맨스와 내면 공포에 매료' },
      { genre: 'classic',    score: 4, reason: '시대를 초월한 감성에 공명' },
      { genre: 'philosophy', score: 3, reason: '존재의 의미 탐구' },
      { genre: 'adventure',  score: 2, reason: '자아 발견의 여정이면 관심' },
      { genre: 'mystery',    score: 1, reason: '논리보다 감정에 끌림' },
    ]},
  { type: 'ENFJ', title: '선도자', desc: '카리스마 있는 리더, 타인의 성장 돕기',
    genres: [
      { genre: 'fiction',    score: 5, reason: '인간관계와 성장 서사에 감동' },
      { genre: 'classic',    score: 4, reason: '영웅의 여정과 도덕적 딜레마' },
      { genre: 'philosophy', score: 4, reason: '사회 정의와 윤리에 관심' },
      { genre: 'adventure',  score: 3, reason: '동료와 함께하는 모험에 공감' },
      { genre: 'mystery',    score: 2, reason: '정의 구현 서사에 관심' },
      { genre: 'horror',     score: 1, reason: '어둠보다 희망을 선호' },
    ]},
  { type: 'ENFP', title: '활동가', desc: '열정적 자유영혼, 가능성의 세계',
    genres: [
      { genre: 'adventure',  score: 5, reason: '자유로운 탐험과 새로운 세계' },
      { genre: 'fiction',    score: 4, reason: '다양한 인물과 감정에 공감' },
      { genre: 'classic',    score: 4, reason: '상상력을 자극하는 고전 서사' },
      { genre: 'horror',     score: 3, reason: '판타지적 공포에 호기심' },
      { genre: 'philosophy', score: 2, reason: '자유와 개성에 관한 사상' },
      { genre: 'mystery',    score: 2, reason: '반전 있는 이야기에 끌림' },
    ]},

  // 관리형 (SJ)
  { type: 'ISTJ', title: '현실주의자', desc: '책임감 있는 실행자, 전통과 질서',
    genres: [
      { genre: 'mystery',    score: 5, reason: '체계적 추론과 질서 회복에 만족' },
      { genre: 'classic',    score: 4, reason: '검증된 고전의 가치를 신뢰' },
      { genre: 'fiction',    score: 3, reason: '사실적 묘사의 소설 선호' },
      { genre: 'philosophy', score: 3, reason: '실용적 철학에 관심' },
      { genre: 'adventure',  score: 2, reason: '계획된 탐험에 관심' },
      { genre: 'horror',     score: 1, reason: '비현실적 요소에 거부감' },
    ]},
  { type: 'ISFJ', title: '수호자', desc: '따뜻한 보호자, 헌신과 배려',
    genres: [
      { genre: 'fiction',    score: 5, reason: '가족과 관계의 따뜻한 이야기' },
      { genre: 'classic',    score: 4, reason: '시대를 초월한 인간미' },
      { genre: 'mystery',    score: 3, reason: '정의가 실현되는 결말 선호' },
      { genre: 'adventure',  score: 3, reason: '성장과 귀환의 서사에 감동' },
      { genre: 'philosophy', score: 2, reason: '도덕과 의무에 관한 사상' },
      { genre: 'horror',     score: 1, reason: '불안을 주는 장르 기피' },
    ]},
  { type: 'ESTJ', title: '경영자', desc: '조직적 관리자, 규칙과 효율',
    genres: [
      { genre: 'philosophy', score: 5, reason: '통치와 조직 운영의 고전' },
      { genre: 'mystery',    score: 4, reason: '논리적 문제 해결에 만족' },
      { genre: 'classic',    score: 3, reason: '역사적 교훈에서 실용 가치' },
      { genre: 'adventure',  score: 3, reason: '목표 달성 서사에 공감' },
      { genre: 'fiction',    score: 2, reason: '사회 시스템을 다룬 소설' },
      { genre: 'horror',     score: 1, reason: '비효율적 감정 소모 기피' },
    ]},
  { type: 'ESFJ', title: '집정관', desc: '사교적 돌봄, 조화와 협력 추구',
    genres: [
      { genre: 'fiction',    score: 5, reason: '인간관계와 사랑 이야기에 몰입' },
      { genre: 'classic',    score: 4, reason: '사회적 관계를 다룬 고전' },
      { genre: 'adventure',  score: 3, reason: '우정과 협력의 모험담' },
      { genre: 'mystery',    score: 3, reason: '함께 추리하는 재미' },
      { genre: 'philosophy', score: 2, reason: '공동체와 윤리에 관심' },
      { genre: 'horror',     score: 1, reason: '불쾌한 감정 유발 기피' },
    ]},

  // 탐험형 (SP)
  { type: 'ISTP', title: '장인', desc: '냉철한 분석가, 실용적 문제 해결',
    genres: [
      { genre: 'mystery',    score: 5, reason: '논리적 퍼즐 해결에 쾌감' },
      { genre: 'adventure',  score: 5, reason: '손에 땀 쥐는 액션과 서바이벌' },
      { genre: 'horror',     score: 3, reason: '극한 상황의 생존 전략에 관심' },
      { genre: 'philosophy', score: 2, reason: '실용적 사상만 선택적 관심' },
      { genre: 'fiction',    score: 2, reason: '행동 중심 소설 선호' },
      { genre: 'classic',    score: 1, reason: '고전보다 현대적 서사 선호' },
    ]},
  { type: 'ISFP', title: '모험가', desc: '예술적 감성, 현재를 즐기는 자유인',
    genres: [
      { genre: 'fiction',    score: 5, reason: '아름다운 문체와 감성적 서사' },
      { genre: 'adventure',  score: 4, reason: '자연과 자유를 다룬 모험' },
      { genre: 'horror',     score: 4, reason: '고딕 미학과 분위기에 매료' },
      { genre: 'classic',    score: 3, reason: '예술적 가치가 높은 고전' },
      { genre: 'philosophy', score: 2, reason: '미학과 자유에 관한 사상' },
      { genre: 'mystery',    score: 1, reason: '논리보다 감각을 선호' },
    ]},
  { type: 'ESTP', title: '사업가', desc: '대담한 행동파, 현실적 기회 포착',
    genres: [
      { genre: 'adventure',  score: 5, reason: '스릴과 도전의 서사에 열광' },
      { genre: 'mystery',    score: 4, reason: '빠른 전개와 반전에 몰입' },
      { genre: 'horror',     score: 3, reason: '극한 상황의 스릴' },
      { genre: 'fiction',    score: 2, reason: '행동과 갈등 중심 소설' },
      { genre: 'philosophy', score: 2, reason: '실전 전략서에만 관심' },
      { genre: 'classic',    score: 1, reason: '느린 전개에 지루함' },
    ]},
  { type: 'ESFP', title: '연예인', desc: '에너지 넘치는 즐거움 추구자',
    genres: [
      { genre: 'adventure',  score: 5, reason: '신나고 다채로운 모험 이야기' },
      { genre: 'fiction',    score: 4, reason: '생생한 인물과 드라마' },
      { genre: 'classic',    score: 3, reason: '재미있는 고전 (아라비안나이트 등)' },
      { genre: 'horror',     score: 3, reason: '엔터테인먼트로서의 공포' },
      { genre: 'mystery',    score: 2, reason: '가벼운 추리에 관심' },
      { genre: 'philosophy', score: 1, reason: '무거운 사상보다 경험 선호' },
    ]},
]

const MBTI_GROUPS = [
  { label: '분석형', emoji: '🧠', types: ['INTJ', 'INTP', 'ENTJ', 'ENTP'] },
  { label: '외교형', emoji: '💚', types: ['INFJ', 'INFP', 'ENFJ', 'ENFP'] },
  { label: '관리형', emoji: '📋', types: ['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ'] },
  { label: '탐험형', emoji: '🔥', types: ['ISTP', 'ISFP', 'ESTP', 'ESFP'] },
]

/* ── 별점 렌더 ── */
function Stars({ score }: { score: number }) {
  return (
    <span className="text-[13px] tracking-wider">
      {'★'.repeat(score)}
      {'☆'.repeat(5 - score)}
    </span>
  )
}

/* ── 책 커버 ── */
function BookCover({ book }: { book: CatalogBook }) {
  const [imgError, setImgError] = useState(false)
  const cover = getCatalogCoverUrl(book.id)

  if (!imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={cover} alt={book.title} className="w-full h-full object-cover" onError={() => setImgError(true)} />
    )
  }
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2 px-3"
         style={{ background: 'linear-gradient(160deg, #F5F0EB 0%, #E8E2DB 100%)' }}>
      <span className="text-2xl">📖</span>
      <p className="text-[#8C8C8C] text-[10px] text-center leading-snug line-clamp-2" style={{ fontFamily: 'var(--serif)' }}>{book.title}</p>
    </div>
  )
}

/* ── 메인 ── */
export default function MbtiPage() {
  const [allBooks, setAllBooks] = useState<CatalogBook[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/catalog')
      .then((r) => r.json())
      .then((data: CatalogBook[]) => { setAllBooks(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const mbti = MBTI_DATA.find((m) => m.type === selected)

  // 장르별 책 매핑
  const booksByGenre = useMemo(() => {
    const map: Record<string, CatalogBook[]> = {}
    for (const genre of Object.keys(GENRE_KEYWORDS)) {
      map[genre] = allBooks.filter((book) => getBookGenres(book).includes(genre))
    }
    return map
  }, [allBooks])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FFFFFF' }}>

      {/* 헤더 */}
      <nav className="sticky top-0 z-30 bg-white/95 backdrop-blur-md" style={{ borderBottom: '1px solid #F0F0EE' }}>
        <div className="max-w-[1080px] mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <Link href="/recommended" className="flex items-center gap-1.5 text-[#8C8C8C] hover:text-[#1A1A1A] transition-colors text-[13px] font-medium group">
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M15 19l-7-7 7-7" />
            </svg>
            추천
          </Link>
          <Link href="/" className="text-[#1A1A1A] text-lg tracking-tight" style={{ fontFamily: 'var(--serif)', fontWeight: 600 }}>
            Purplelica
          </Link>
          <div className="w-16" />
        </div>
      </nav>

      {/* 히어로 */}
      <section className="py-12 sm:py-16" style={{ background: '#FAFAF8' }}>
        <div className="max-w-[1080px] mx-auto px-5 sm:px-8 text-center">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#B0B0B0] mb-4">
            MBTI × Classic Literature
          </p>
          <h1 className="text-[#1A1A1A] mb-3" style={{
            fontFamily: 'var(--serif)',
            fontSize: 'clamp(26px, 3.5vw, 40px)',
            fontWeight: 500,
            lineHeight: 1.2,
          }}>
            당신의 MBTI에 맞는<br />영어 원서를 찾아보세요
          </h1>
          <p className="text-[#8C8C8C] text-[15px] max-w-md mx-auto">
            16가지 성격 유형별로 장르 궁합과 추천 도서를 확인하세요.
          </p>
        </div>
      </section>

      {/* MBTI 선택 그리드 */}
      <section className="py-10 sm:py-14">
        <div className="max-w-[1080px] mx-auto px-5 sm:px-8">

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {MBTI_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-[12px] font-semibold text-[#8C8C8C] mb-3 flex items-center gap-1.5">
                  <span>{group.emoji}</span> {group.label}
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {group.types.map((type) => {
                    const data = MBTI_DATA.find((m) => m.type === type)!
                    const isSelected = selected === type
                    return (
                      <button
                        key={type}
                        onClick={() => setSelected(isSelected ? null : type)}
                        className={`rounded-xl px-4 py-3.5 text-left transition-all duration-200 ${
                          isSelected
                            ? 'bg-[#1A1A1A] text-white shadow-lg scale-[1.02]'
                            : 'bg-[#FAFAF8] text-[#1A1A1A] hover:bg-[#F0F0EE] hover:shadow-sm'
                        }`}
                        style={!isSelected ? { border: '1px solid #F0F0EE' } : {}}
                      >
                        <span className="text-[15px] font-bold tracking-wide">{type}</span>
                        <p className={`text-[11px] mt-0.5 ${isSelected ? 'text-white/70' : 'text-[#8C8C8C]'}`}>
                          {data.title}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 선택된 MBTI 결과 */}
      {mbti && !loading && (
        <section className="py-10 sm:py-14" style={{ background: '#FAFAF8' }}>
          <div className="max-w-[1080px] mx-auto px-5 sm:px-8">

            {/* 타입 소개 */}
            <div className="mb-10 sm:mb-14">
              <div className="flex items-baseline gap-3 mb-2">
                <h2 className="text-[#1A1A1A] text-2xl sm:text-3xl font-bold tracking-wide">
                  {mbti.type}
                </h2>
                <span className="text-[#8C8C8C] text-[15px] font-medium">{mbti.title}</span>
              </div>
              <p className="text-[#8C8C8C] text-[15px]">{mbti.desc}</p>
            </div>

            {/* 장르별 추천표 */}
            <div className="space-y-6">
              {mbti.genres.map(({ genre, score, reason }, idx) => {
                const books = booksByGenre[genre] ?? []
                return (
                  <div key={genre} className="rounded-2xl bg-white p-5 sm:p-7" style={{ border: '1px solid #F0F0EE' }}>

                    {/* 장르 헤더 */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-3">
                        <span className="text-[#B0B0B0] text-[13px] font-bold w-6">{idx + 1}</span>
                        <h3 className="text-[#1A1A1A] text-[17px] sm:text-[18px] font-semibold">
                          {GENRE_LABELS[genre]}
                        </h3>
                      </div>
                      <span className="text-[#D4A843]">
                        <Stars score={score} />
                      </span>
                    </div>
                    <p className="text-[#8C8C8C] text-[13px] ml-9 mb-5">{reason}</p>

                    {/* 도서 목록 */}
                    {books.length > 0 ? (
                      <div className="ml-9 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-6">
                        {books.map((book) => (
                          <div
                            key={book.id}
                            onClick={() => router.push(`/book/${book.id}/info`)}
                            className="group cursor-pointer"
                          >
                            <div className="aspect-[2/3] rounded-lg overflow-hidden bg-[#F5F5F3] shadow-sm group-hover:shadow-md group-hover:-translate-y-0.5 transition-all duration-200">
                              <BookCover book={book} />
                            </div>
                            <div className="mt-2">
                              <p className="text-[#1A1A1A] text-[12px] font-semibold leading-tight line-clamp-2">{book.title}</p>
                              {KOREAN_TITLES[String(book.id)] && (
                                <p className="text-[#8C8C8C] text-[11px] mt-0.5 line-clamp-1">{KOREAN_TITLES[String(book.id)]}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="ml-9 text-[#B0B0B0] text-[13px]">이 장르의 도서가 곧 추가됩니다.</p>
                    )}
                  </div>
                )
              })}
            </div>

            {/* CTA */}
            <div className="mt-10 text-center">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-[15px] font-semibold transition-all duration-200 hover:opacity-85"
                style={{ background: '#1A1A1A', color: '#FFFFFF' }}
              >
                전체 도서 보기 &rarr;
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 미선택 상태 안내 */}
      {!selected && !loading && (
        <div className="py-16 text-center">
          <p className="text-[#B0B0B0] text-[15px]">위에서 MBTI를 선택하면 장르별 추천이 나타납니다</p>
        </div>
      )}

      {/* 푸터 */}
      <footer className="mt-auto py-8" style={{ borderTop: '1px solid #F0F0EE' }}>
        <div className="max-w-[1080px] mx-auto px-5 sm:px-8 text-center space-y-1">
          <p className="text-[#B0B0B0] text-xs">
            본 서비스는{' '}
            <a href="https://www.gutenberg.org" target="_blank" rel="noopener noreferrer"
              className="text-[#8C8C8C] underline underline-offset-2 hover:text-[#1A1A1A] transition-colors">
              Project Gutenberg
            </a>
            에서 제공하는 저작권 만료 공개 도서를 활용합니다.
          </p>
          <p className="text-[#B0B0B0] text-xs">&copy; 2026 Purplelica Books</p>
        </div>
      </footer>
    </div>
  )
}
