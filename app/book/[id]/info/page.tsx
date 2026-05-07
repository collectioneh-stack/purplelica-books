import type { Metadata } from 'next'
import { getCatalogCoverUrl } from '@/lib/catalog'
import koreanTitlesRaw from '@/lib/korean-titles.json'
import BookInfoClient from './BookInfoClient'

const KOREAN_TITLES: Record<string, string> = koreanTitlesRaw as Record<string, string>

// ─── 한국어 작가명 ─────────────────────────────────────────────────────────────
const KOREAN_AUTHORS: Record<string, string> = {
  '11':   '루이스 캐럴',
  '16':   'J.M. 배리',
  '35':   'H.G. 웰스',
  '41':   '워싱턴 어빙',
  '43':   '로버트 루이스 스티븐슨',
  '46':   '찰스 디킨스',
  '84':   '메리 셸리',
  '103':  '쥘 베른',
  '219':  '조지프 콘래드',
  '345':  '브램 스토커',
  '526':  '잭 런던',
  '721':  '조너선 스위프트',
  '1064': '오스카 와일드',
  '1080': '조너선 스위프트',
  '1342': '제인 오스틴',
  '1661': '아서 코난 도일',
  '1934': '윌리엄 블레이크',
  '1952': '샬럿 퍼킨스 길먼',
  '2500': '헤르만 헤세',
  '2542': '헨리크 입센',
  '2701': '허먼 멜빌',
  '5200': '프란츠 카프카',
}

// ─── 머리말 없는 책 서머리 ───────────────────────────────────────────
const BOOK_SUMMARIES: Record<string, string> = {
  '11':   '앨리스가 토끼굴을 따라 들어간 이상한 나라의 모험. 일상의 논리가 완전히 뒤집힌 환상의 세계에서 앨리스는 트럼프 여왕, 모자 장수, 체셔 고양이 등 기묘한 존재들과 마주칩니다. 루이스 캐럴이 빚어낸 불멸의 동화로, 어른도 읽을수록 새로운 의미를 발견하는 작품입니다.',
  '16':   '어른이 되기 싫은 소년 피터 팬이 웬디와 그의 남동생들을 네버랜드로 이끕니다. 인디언, 해적, 요정 팅커벨이 가득한 섬에서 펼쳐지는 무한한 모험. J.M. 배리가 그린 영원한 동심의 세계입니다.',
  '41':   '잠자는 골짜기에 부임한 겁쟁이 교사 이카보드 크레인. 어느 밤, 그는 머리 없는 기사의 추격을 받습니다. 미국 최초의 공포 단편 중 하나로 꼽히는 워싱턴 어빙의 걸작입니다.',
  '43':   '런던의 존경받는 지킬 박사는 비밀 실험으로 또 다른 자아 하이드를 탄생시킵니다. 선과 악이 공존하는 인간 내면을 섬뜩하게 파헤친 심리 공포 소설. 이중 인격이라는 개념을 대중화한 스티븐슨의 불멸의 명작입니다.',
  '46':   '돈밖에 모르는 구두쇠 스크루지 영감. 크리스마스 전날 밤, 세 유령이 찾아와 그의 삶을 바꿉니다. 찰스 디킨스가 쓴 인류 역사상 가장 유명한 크리스마스 이야기입니다.',
  '84':   '젊은 과학자 빅터 프랑켄슈타인은 금기를 깨고 새 생명을 창조합니다. 그러나 자신이 만든 존재를 외면한 결과는 비극이었습니다. 메리 셸리가 19세에 쓴 근대 SF의 출발점이자 창조와 책임을 묻는 영원한 질문입니다.',
  '103':  '신비로운 선장 네모가 이끄는 잠수함 노틸러스호. 해양학자 아로낙스 교수는 강제 승선 후 바다 속 경이로운 세계를 탐험합니다. 쥘 베른의 과학적 상상력이 빚어낸 SF 모험의 고전입니다.',
  '219':  '런던에서 콩고 강으로 떠나는 말로우의 항해. 전설의 상아 무역상 커츠를 찾아가는 여정은 식민지의 잔혹함과 인간 내면의 어둠을 마주하는 과정이 됩니다. 조지프 콘래드의 대표작이자 제국주의를 비판한 문제작입니다.',
  '345':  '트란실바니아의 드라큘라 백작이 영국으로 건너옵니다. 서간문과 일기 형식으로 전개되는 뱀파이어 공포의 원전. 브램 스토커가 창조한 드라큘라는 이후 모든 뱀파이어 이야기의 원형이 되었습니다.',
  '526':  '알래스카의 혹독한 야생. 썰매 개 벅은 문명의 삶에서 끌려나와 야성의 부름에 응답합니다. 잭 런던이 그린 자연과 생존의 서사시입니다.',
  '721':  '외과 의사 걸리버는 소인국·거인국·하늘을 나는 섬·말의 나라를 차례로 여행합니다. 각 나라는 인간 사회의 축소판으로, 조너선 스위프트는 뛰어난 풍자로 18세기 영국 사회를 해부합니다.',
  '1064': '어니스트라는 이름을 둘러싼 두 청년의 거짓말 소동. 오스카 와일드의 재치와 기지가 빛나는 희곡으로, 빅토리아 시대 상류층의 위선을 날카롭게 풍자합니다. 읽는 내내 미소 짓게 되는 영문학의 보석 같은 작품입니다.',
  '1080': '아일랜드의 빈곤 문제를 해결하기 위해 아이들을 식량으로 쓰자는 제안. 물론 이것은 풍자입니다. 조너선 스위프트가 영국의 아일랜드 착취를 고발하기 위해 쓴, 문학사상 가장 충격적인 에세이입니다.',
  '1342': '영리하고 독립적인 엘리자베스 베넷과 오만한 다아시 씨. 첫 만남부터 어긋난 두 사람이 편견을 버리고 진심을 발견하는 과정. 제인 오스틴이 그린 영문학 최고의 로맨스입니다.',
  '1661': '221B 베이커 스트리트의 명탐정 셜록 홈즈. 12편의 단편에서 홈즈는 불가사의한 사건들을 오직 관찰과 추론만으로 해결합니다. 아서 코난 도일이 열어젖힌 추리 소설의 황금기입니다.',
  '1934': '인간의 순수한 영혼과 타락한 경험을 대비시킨 윌리엄 블레이크의 시집. 어린 양·호랑이·굴뚝 청소부·런던 등의 시편을 통해 산업화 시대의 빛과 그늘을 노래합니다. 영문학 낭만주의의 선구자적 걸작입니다.',
  '1952': '신경 쇠약으로 시골 저택에 갇힌 여성은 노란 벽지에서 점점 이상한 것을 봅니다. 가부장적 의료 시스템 안에서 서서히 무너지는 한 여성의 이야기. 샬럿 퍼킨스 길먼의 페미니스트 공포 소설입니다.',
  '2500': '브라만 청년 싯다르타는 모든 것을 버리고 깨달음을 찾아 떠납니다. 금욕, 쾌락, 사랑을 거쳐 강가에서 마침내 진리를 발견하는 헤르만 헤세의 정신적 여정입니다.',
  '2542': '완벽해 보이는 가정. 그러나 아내 노라는 남편에게 단 한 번도 진짜 자신이 될 수 없었습니다. 헨리크 입센이 쓴 근대 연극의 시작점이자, 여성의 자아를 선언한 혁명적 희곡입니다.',
  '2701': '흰 고래 모비딕에 한쪽 다리를 잃은 에이헤브 선장. 복수에 미친 선장과 포경선 피쿼드호의 항해. 허먼 멜빌이 그린 인간의 집착과 자연의 위력에 대한 대서사시입니다.',
  '5200': '어느 아침, 그레고르 잠자는 눈을 뜨니 거대한 벌레가 되어 있었습니다. 가족의 생계를 책임지던 그는 이제 방에 갇혀 천천히 잊혀집니다. 프란츠 카프카가 그린 소외와 인간 존재의 부조리입니다.',
}

// ─── 카탈로그에서 영문 제목 조회 (서버 사이드) ─────────────────────────────────
async function getBookFromCatalog(bookId: string) {
  const fs = await import('fs/promises')
  const path = await import('path')
  const catalogPath = path.join(process.cwd(), 'public', 'books', 'catalog.json')
  try {
    const raw = await fs.readFile(catalogPath, 'utf-8')
    const catalog = JSON.parse(raw) as Array<{ id: number; title: string; author: string; year: number }>
    return catalog.find(b => String(b.id) === bookId) ?? null
  } catch {
    return null
  }
}

// ─── SSR 메타데이터 생성 ─────────────────────────────────────────────────────
export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id: bookId } = await params

  const koTitle = KOREAN_TITLES[bookId] ?? null
  const koAuthor = KOREAN_AUTHORS[bookId] ?? null
  const summary = BOOK_SUMMARIES[bookId] ?? null
  const catalogBook = await getBookFromCatalog(bookId)

  const enTitle = catalogBook?.title ?? `Book #${bookId}`
  const enAuthor = catalogBook?.author ?? ''

  // 제목: "피터 팬 - Peter Pan | 영한 병렬 무료 읽기"
  const title = koTitle
    ? `${koTitle} - ${enTitle} | 영한 병렬 무료 읽기`
    : `${enTitle} | 영한 병렬 무료 읽기 - Purplelica Books`

  // 설명: 한국어 서머리 또는 기본 설명
  const description = summary
    ? `${summary.slice(0, 155)}...`
    : `${enTitle} by ${enAuthor} — 영어 원서를 한국어 번역과 함께 무료로 읽어보세요. AI 단어 풀이, 인물 관계도 제공.`

  const coverUrl = getCatalogCoverUrl(Number(bookId))
  const pageUrl = `https://books.purplelica.com/book/${bookId}/info`

  return {
    title,
    description,
    keywords: [
      koTitle, enTitle, koAuthor, enAuthor,
      '영어 원서', '무료 읽기', '영한 병렬', '한국어 번역',
      '고전 문학', 'AI 단어 풀이', '구텐베르크',
    ].filter(Boolean) as string[],
    authors: enAuthor ? [{ name: `${enAuthor}${koAuthor ? ` (${koAuthor})` : ''}` }] : undefined,
    openGraph: {
      title: koTitle ? `${koTitle} (${enTitle})` : enTitle,
      description,
      url: pageUrl,
      siteName: 'Purplelica Books',
      images: [{ url: coverUrl, width: 400, height: 600, alt: `${koTitle ?? enTitle} 표지` }],
      type: 'article',
      locale: 'ko_KR',
    },
    twitter: {
      card: 'summary_large_image',
      title: koTitle ? `${koTitle} - ${enTitle}` : enTitle,
      description,
      images: [coverUrl],
    },
    alternates: {
      canonical: pageUrl,
    },
  }
}

// ─── 페이지 컴포넌트 (서버) ─────────────────────────────────────────────────
export default async function BookInfoPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bookId } = await params

  const koTitle = KOREAN_TITLES[bookId] ?? null
  const koAuthor = KOREAN_AUTHORS[bookId] ?? null
  const summary = BOOK_SUMMARIES[bookId] ?? 'Project Gutenberg에서 무료로 제공하는 영문 고전 작품입니다.'
  const hasKoSummary = bookId in BOOK_SUMMARIES

  return (
    <BookInfoClient
      bookId={bookId}
      koTitle={koTitle}
      koAuthor={koAuthor}
      summary={summary}
      hasKoSummary={hasKoSummary}
    />
  )
}
