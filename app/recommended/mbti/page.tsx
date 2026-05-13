'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { CatalogBook } from '@/lib/catalog'
import { getCatalogCoverUrl } from '@/lib/catalog'
import koreanTitlesRaw from '@/lib/korean-titles.json'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react'

const KOREAN_TITLES: Record<string, string> = koreanTitlesRaw as Record<string, string>

/* ── 장르 정의 ── */
const GENRE_LABELS: Record<string, string> = {
  fiction: '소설', mystery: '미스터리', horror: '공포',
  adventure: '모험', philosophy: '철학', classic: '고전',
}

const GENRE_KEYWORDS: Record<string, string[]> = {
  fiction:    ['Dickens', 'Austen', 'Tolstoy', 'Dostoevsky', 'Hugo', 'Joyce', 'Brontë', 'Hardy', 'James', 'Wharton', 'Chopin', 'Forster', 'Alcott', 'Montgomery', 'Burnett', 'Cather'],
  mystery:   ['Doyle', 'Sherlock', 'Scarlet', 'Baskervilles', 'Study'],
  horror:    ['Frankenstein', 'Dracula', 'Strange Case', 'Yellow Wallpaper', 'Great God Pan', 'Sleepy Hollow', 'Phantom'],
  adventure: ['Huckleberry', 'Tom Sawyer', 'Treasure Island', 'Call of the Wild', 'Sea-Wolf', 'White Fang', 'Jungle Book', 'Around the World', 'Twenty Thousand', 'Time Machine', 'War of the Worlds', 'Island of Doctor Moreau'],
  philosophy:['Nietzsche', 'Aurelius', 'Plato', 'Hobbes', 'Tao', 'Art of War', 'Prince', 'Leviathan', 'Meditations', 'Zarathustra', 'Beyond Good'],
  classic:   ['Homer', 'Odyssey', 'Iliad', 'Dante', 'Cervantes', 'Quixote', 'Arabian', 'Aesop', 'Grimm', 'Alighieri'],
}

const coverGradients: Record<string, string> = {
  fiction: 'bg-gradient-to-br from-blue-600/80 via-blue-500/60 to-indigo-400/40',
  mystery: 'bg-gradient-to-br from-amber-700/80 via-amber-600/60 to-yellow-500/40',
  horror: 'bg-gradient-to-br from-red-800/80 via-red-600/60 to-rose-500/40',
  adventure: 'bg-gradient-to-br from-emerald-700/80 via-green-600/60 to-teal-400/40',
  philosophy: 'bg-gradient-to-br from-purple-700/80 via-violet-600/60 to-fuchsia-400/40',
  classic: 'bg-gradient-to-br from-slate-700/80 via-gray-600/60 to-zinc-400/40',
}

function getBookGenres(book: CatalogBook): string[] {
  const haystack = `${book.title} ${book.author}`.toLowerCase()
  return Object.entries(GENRE_KEYWORDS)
    .filter(([, keywords]) => keywords.some((kw) => haystack.includes(kw.toLowerCase())))
    .map(([genre]) => genre)
}

function getBookGenre(book: CatalogBook): string {
  const genres = getBookGenres(book)
  return genres[0] || 'fiction'
}

/* ── MBTI 데이터 ── */
interface MbtiType {
  type: string; title: string; desc: string; emoji: string; color: string
  genres: { genre: string; score: number; reason: string }[]
}

const MBTI_DATA: MbtiType[] = [
  { type: 'INTJ', title: '전략가', desc: '독립적 사고와 깊은 분석을 즐기는 타입', emoji: '🧙‍♂️', color: '#6366F1',
    genres: [
      { genre: 'philosophy', score: 5, reason: '전략적 사고와 권력 구조 분석에 몰입' },
      { genre: 'classic', score: 4, reason: '인류 보편의 지혜에서 통찰 발견' },
      { genre: 'mystery', score: 3, reason: '논리적 추론 과정 자체를 즐김' },
      { genre: 'fiction', score: 2, reason: '사회 구조를 해부하는 소설 선호' },
      { genre: 'horror', score: 2, reason: '심리적 공포의 메커니즘에 관심' },
      { genre: 'adventure', score: 1, reason: '탐험보다 계획에 관심' },
    ]},
  { type: 'INTP', title: '논리술사', desc: '끝없는 지적 호기심과 이론 탐구', emoji: '🔬', color: '#818CF8',
    genres: [
      { genre: 'philosophy', score: 5, reason: '사상의 본질을 파고드는 재미' },
      { genre: 'mystery', score: 4, reason: '복잡한 퍼즐을 해독하는 쾌감' },
      { genre: 'classic', score: 4, reason: '고대 사상가의 논리 체계에 매료' },
      { genre: 'horror', score: 3, reason: '과학과 괴기의 경계에 관심' },
      { genre: 'fiction', score: 2, reason: '실험적 문체나 구조에 끌림' },
      { genre: 'adventure', score: 2, reason: 'SF적 모험에 선택적 관심' },
    ]},
  { type: 'ENTJ', title: '통솔자', desc: '목표 지향적 리더, 효율과 성과 추구', emoji: '👑', color: '#4F46E5',
    genres: [
      { genre: 'philosophy', score: 5, reason: '리더십과 권력의 고전에서 전략 학습' },
      { genre: 'adventure', score: 4, reason: '도전과 정복의 서사에 공감' },
      { genre: 'classic', score: 3, reason: '역사적 리더의 결단에서 영감' },
      { genre: 'fiction', score: 3, reason: '사회 변혁을 다룬 소설 선호' },
      { genre: 'mystery', score: 2, reason: '효율적 문제 해결에 관심' },
      { genre: 'horror', score: 1, reason: '감정적 공포보다 실용 선호' },
    ]},
  { type: 'ENTP', title: '변론가', desc: '창의적 토론가, 새로운 가능성 탐색', emoji: '⚡', color: '#7C3AED',
    genres: [
      { genre: 'philosophy', score: 5, reason: '기존 관념을 뒤집는 사상에 열광' },
      { genre: 'mystery', score: 4, reason: '반전과 트릭에 지적 자극' },
      { genre: 'adventure', score: 4, reason: '예측 불가능한 전개를 즐김' },
      { genre: 'classic', score: 3, reason: '시대를 초월한 논쟁거리 발견' },
      { genre: 'horror', score: 3, reason: '파격적 설정에 끌림' },
      { genre: 'fiction', score: 2, reason: '사회 풍자 소설에 관심' },
    ]},
  { type: 'INFJ', title: '옹호자', desc: '이상주의적 통찰력, 깊은 공감 능력', emoji: '🦋', color: '#10B981',
    genres: [
      { genre: 'fiction', score: 5, reason: '인간 내면의 복잡한 감정에 몰입' },
      { genre: 'classic', score: 4, reason: '보편적 인간 조건에 공감' },
      { genre: 'philosophy', score: 4, reason: '의미와 목적에 대한 탐구' },
      { genre: 'horror', score: 3, reason: '인간 본성의 어두운 면 탐색' },
      { genre: 'mystery', score: 2, reason: '인물 심리에 집중하는 미스터리' },
      { genre: 'adventure', score: 1, reason: '내면 여정을 선호' },
    ]},
  { type: 'INFP', title: '중재자', desc: '감성적 이상주의자, 내면 세계가 풍부', emoji: '🌙', color: '#34D399',
    genres: [
      { genre: 'fiction', score: 5, reason: '감정 몰입형 서사에 깊이 빠져듦' },
      { genre: 'horror', score: 4, reason: '고딕 로맨스와 내면 공포에 매료' },
      { genre: 'classic', score: 4, reason: '시대를 초월한 감성에 공명' },
      { genre: 'philosophy', score: 3, reason: '존재의 의미 탐구' },
      { genre: 'adventure', score: 2, reason: '자아 발견의 여정이면 관심' },
      { genre: 'mystery', score: 1, reason: '논리보다 감정에 끌림' },
    ]},
  { type: 'ENFJ', title: '선도자', desc: '카리스마 있는 리더, 타인의 성장 돕기', emoji: '🌟', color: '#059669',
    genres: [
      { genre: 'fiction', score: 5, reason: '인간관계와 성장 서사에 감동' },
      { genre: 'classic', score: 4, reason: '영웅의 여정과 도덕적 딜레마' },
      { genre: 'philosophy', score: 4, reason: '사회 정의와 윤리에 관심' },
      { genre: 'adventure', score: 3, reason: '동료와 함께하는 모험에 공감' },
      { genre: 'mystery', score: 2, reason: '정의 구현 서사에 관심' },
      { genre: 'horror', score: 1, reason: '어둠보다 희망을 선호' },
    ]},
  { type: 'ENFP', title: '활동가', desc: '열정적 자유영혼, 가능성의 세계', emoji: '🎨', color: '#6EE7B7',
    genres: [
      { genre: 'adventure', score: 5, reason: '자유로운 탐험과 새로운 세계' },
      { genre: 'fiction', score: 4, reason: '다양한 인물과 감정에 공감' },
      { genre: 'classic', score: 4, reason: '상상력을 자극하는 고전 서사' },
      { genre: 'horror', score: 3, reason: '판타지적 공포에 호기심' },
      { genre: 'philosophy', score: 2, reason: '자유와 개성에 관한 사상' },
      { genre: 'mystery', score: 2, reason: '반전 있는 이야기에 끌림' },
    ]},
  { type: 'ISTJ', title: '현실주의자', desc: '책임감 있는 실행자, 전통과 질서', emoji: '🏛️', color: '#F59E0B',
    genres: [
      { genre: 'mystery', score: 5, reason: '체계적 추론과 질서 회복에 만족' },
      { genre: 'classic', score: 4, reason: '검증된 고전의 가치를 신뢰' },
      { genre: 'fiction', score: 3, reason: '사실적 묘사의 소설 선호' },
      { genre: 'philosophy', score: 3, reason: '실용적 철학에 관심' },
      { genre: 'adventure', score: 2, reason: '계획된 탐험에 관심' },
      { genre: 'horror', score: 1, reason: '비현실적 요소에 거부감' },
    ]},
  { type: 'ISFJ', title: '수호자', desc: '따뜻한 보호자, 헌신과 배려', emoji: '🛡️', color: '#FBBF24',
    genres: [
      { genre: 'fiction', score: 5, reason: '가족과 관계의 따뜻한 이야기' },
      { genre: 'classic', score: 4, reason: '시대를 초월한 인간미' },
      { genre: 'mystery', score: 3, reason: '정의가 실현되는 결말 선호' },
      { genre: 'adventure', score: 3, reason: '성장과 귀환의 서사에 감동' },
      { genre: 'philosophy', score: 2, reason: '도덕과 의무에 관한 사상' },
      { genre: 'horror', score: 1, reason: '불안을 주는 장르 기피' },
    ]},
  { type: 'ESTJ', title: '경영자', desc: '조직적 관리자, 규칙과 효율', emoji: '📊', color: '#D97706',
    genres: [
      { genre: 'philosophy', score: 5, reason: '통치와 조직 운영의 고전' },
      { genre: 'mystery', score: 4, reason: '논리적 문제 해결에 만족' },
      { genre: 'classic', score: 3, reason: '역사적 교훈에서 실용 가치' },
      { genre: 'adventure', score: 3, reason: '목표 달성 서사에 공감' },
      { genre: 'fiction', score: 2, reason: '사회 시스템을 다룬 소설' },
      { genre: 'horror', score: 1, reason: '비효율적 감정 소모 기피' },
    ]},
  { type: 'ESFJ', title: '집정관', desc: '사교적 돌봄, 조화와 협력 추구', emoji: '🤝', color: '#F7DC6F',
    genres: [
      { genre: 'fiction', score: 5, reason: '인간관계와 사랑 이야기에 몰입' },
      { genre: 'classic', score: 4, reason: '사회적 관계를 다룬 고전' },
      { genre: 'adventure', score: 3, reason: '우정과 협력의 모험담' },
      { genre: 'mystery', score: 3, reason: '함께 추리하는 재미' },
      { genre: 'philosophy', score: 2, reason: '공동체와 윤리에 관심' },
      { genre: 'horror', score: 1, reason: '불쾌한 감정 유발 기피' },
    ]},
  { type: 'ISTP', title: '장인', desc: '냉철한 분석가, 실용적 문제 해결', emoji: '🔧', color: '#EF4444',
    genres: [
      { genre: 'mystery', score: 5, reason: '논리적 퍼즐 해결에 쾌감' },
      { genre: 'adventure', score: 5, reason: '손에 땀 쥐는 액션과 서바이벌' },
      { genre: 'horror', score: 3, reason: '극한 상황의 생존 전략에 관심' },
      { genre: 'philosophy', score: 2, reason: '실용적 사상만 선택적 관심' },
      { genre: 'fiction', score: 2, reason: '행동 중심 소설 선호' },
      { genre: 'classic', score: 1, reason: '고전보다 현대적 서사 선호' },
    ]},
  { type: 'ISFP', title: '모험가', desc: '예술적 감성, 현재를 즐기는 자유인', emoji: '🎭', color: '#F87171',
    genres: [
      { genre: 'fiction', score: 5, reason: '아름다운 문체와 감성적 서사' },
      { genre: 'adventure', score: 4, reason: '자연과 자유를 다룬 모험' },
      { genre: 'horror', score: 4, reason: '고딕 미학과 분위기에 매료' },
      { genre: 'classic', score: 3, reason: '예술적 가치가 높은 고전' },
      { genre: 'philosophy', score: 2, reason: '미학과 자유에 관한 사상' },
      { genre: 'mystery', score: 1, reason: '논리보다 감각을 선호' },
    ]},
  { type: 'ESTP', title: '사업가', desc: '대담한 행동파, 현실적 기회 포착', emoji: '🚀', color: '#DC2626',
    genres: [
      { genre: 'adventure', score: 5, reason: '스릴과 도전의 서사에 열광' },
      { genre: 'mystery', score: 4, reason: '빠른 전개와 반전에 몰입' },
      { genre: 'horror', score: 3, reason: '극한 상황의 스릴' },
      { genre: 'fiction', score: 2, reason: '행동과 갈등 중심 소설' },
      { genre: 'philosophy', score: 2, reason: '실전 전략서에만 관심' },
      { genre: 'classic', score: 1, reason: '느린 전개에 지루함' },
    ]},
  { type: 'ESFP', title: '연예인', desc: '에너지 넘치는 즐거움 추구자', emoji: '🎪', color: '#FB923C',
    genres: [
      { genre: 'adventure', score: 5, reason: '신나고 다채로운 모험 이야기' },
      { genre: 'fiction', score: 4, reason: '생생한 인물과 드라마' },
      { genre: 'classic', score: 3, reason: '재미있는 고전 (아라비안나이트 등)' },
      { genre: 'horror', score: 3, reason: '엔터테인먼트로서의 공포' },
      { genre: 'mystery', score: 2, reason: '가벼운 추리에 관심' },
      { genre: 'philosophy', score: 1, reason: '무거운 사상보다 경험 선호' },
    ]},
]

const MBTI_GROUPS = [
  { label: '분석형', types: ['INTJ', 'INTP', 'ENTJ', 'ENTP'], color: 'from-purple-500/20 to-purple-500/5' },
  { label: '외교형', types: ['INFJ', 'INFP', 'ENFJ', 'ENFP'], color: 'from-green-500/20 to-green-500/5' },
  { label: '관리형', types: ['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ'], color: 'from-blue-500/20 to-blue-500/5' },
  { label: '탐험형', types: ['ISTP', 'ISFP', 'ESTP', 'ESFP'], color: 'from-amber-500/20 to-amber-500/5' },
]

function Stars({ score }: { score: number }) {
  return (
    <span className="text-[13px] tracking-wider text-amber-500">
      {'★'.repeat(score)}{'☆'.repeat(5 - score)}
    </span>
  )
}

function BookCover({ book }: { book: CatalogBook }) {
  const [imgError, setImgError] = useState(false)
  const cover = getCatalogCoverUrl(book.id)
  const genre = getBookGenre(book)

  if (!imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={cover} alt={book.title} className="w-full h-full object-cover" onError={() => setImgError(true)} />
    )
  }
  return (
    <div className={`w-full h-full flex items-center justify-center ${coverGradients[genre] || 'bg-gradient-to-br from-primary/20 to-primary/5'}`}>
      <BookOpen className="w-8 h-8 text-white/40" />
    </div>
  )
}

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

  const booksByGenre = useMemo(() => {
    const map: Record<string, CatalogBook[]> = {}
    for (const genre of Object.keys(GENRE_KEYWORDS)) {
      map[genre] = allBooks.filter((book) => getBookGenres(book).includes(genre))
    }
    return map
  }, [allBooks])

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <nav className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <BookOpen className="w-6 h-6 text-primary transition-transform group-hover:scale-110" />
            <span className="text-lg font-semibold tracking-tight text-foreground">
              Purplelica <span className="text-primary">Books</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> 홈으로
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-12 md:pt-40 md:pb-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] to-transparent" />
        <div className="container relative text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-primary text-xs font-medium mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            MBTI × Classic Literature
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            내 MBTI에 맞는 고전은?
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            16가지 성격 유형별로 엄선한 세계 고전 문학을 만나보세요.
            <br />당신의 MBTI를 선택해 주세요.
          </p>
        </div>
      </section>

      {/* MBTI Grid */}
      <section className="py-8">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {MBTI_GROUPS.map((group) => (
                <div key={group.label} className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground text-center mb-3">
                    {group.label}
                  </p>
                  {group.types.map((type) => {
                    const data = MBTI_DATA.find((m) => m.type === type)!
                    return (
                      <button
                        key={type}
                        onClick={() => setSelected(selected === type ? null : type)}
                        className={`w-full px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                          selected === type
                            ? 'bg-primary text-primary-foreground shadow-md scale-[1.02]'
                            : 'bg-secondary hover:bg-accent hover:scale-[1.01]'
                        }`}
                      >
                        <span className="font-bold">{type}</span>
                        <span className="ml-2 opacity-70">{data.title}</span>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <AnimatePresence mode="wait">
        {mbti && !loading && (
          <motion.section
            key={selected}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="py-10 bg-secondary/30"
          >
            <div className="container">
              {/* Type Header */}
              <div className="max-w-3xl mx-auto mb-10">
                <div className="flex items-center gap-5 mb-3">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl" style={{ background: `${mbti.color}20`, border: `2px solid ${mbti.color}` }}>
                    {mbti.emoji}
                  </div>
                  <div>
                    <div className="flex items-baseline gap-3">
                      <h2 className="text-2xl sm:text-3xl font-bold tracking-wide">{mbti.type}</h2>
                      <span className="text-[15px] font-semibold" style={{ color: mbti.color }}>{mbti.title}</span>
                    </div>
                    <p className="text-muted-foreground text-[15px] mt-1">{mbti.desc}</p>
                  </div>
                </div>
              </div>

              {/* Genre Recommendations */}
              <div className="max-w-3xl mx-auto space-y-6">
                {mbti.genres.map(({ genre, score, reason }, idx) => {
                  const books = booksByGenre[genre] ?? []
                  return (
                    <div key={genre} className="rounded-2xl bg-card p-5 sm:p-7 border border-border">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground text-[13px] font-bold w-6">{idx + 1}</span>
                          <h3 className="text-[17px] sm:text-[18px] font-semibold">{GENRE_LABELS[genre]}</h3>
                        </div>
                        <Stars score={score} />
                      </div>
                      <p className="text-muted-foreground text-[13px] ml-9 mb-5">{reason}</p>

                      {books.length > 0 ? (
                        <div className="ml-9 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-6">
                          {books.map((book) => (
                            <div key={book.id} onClick={() => router.push(`/book/${book.id}/info`)} className="group cursor-pointer">
                              <div className="aspect-[2/3] rounded-lg overflow-hidden shadow-sm group-hover:shadow-md group-hover:-translate-y-0.5 transition-all duration-200">
                                <BookCover book={book} />
                              </div>
                              <div className="mt-2">
                                <p className="text-[12px] font-semibold leading-tight line-clamp-2">{KOREAN_TITLES[String(book.id)] || book.title}</p>
                                <p className="text-muted-foreground text-[11px] mt-0.5 line-clamp-1">{book.author}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="ml-9 text-muted-foreground text-[13px]">이 장르의 도서가 곧 추가됩니다.</p>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* CTA */}
              <div className="mt-10 text-center">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  전체 도서 보기
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {!selected && !loading && (
        <div className="py-16 text-center flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-[15px]">위에서 MBTI를 선택하면 장르별 추천이 나타납니다</p>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-border bg-secondary/30">
        <div className="container py-8 text-center space-y-1">
          <p className="text-xs text-muted-foreground">
            본 서비스는{' '}
            <a href="https://www.gutenberg.org" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
              Project Gutenberg
            </a>
            에서 제공하는 저작권 만료 공개 도서를 활용합니다.
          </p>
          <p className="text-xs text-muted-foreground">&copy; 2026 Purplelica Books</p>
        </div>
      </footer>
    </div>
  )
}
