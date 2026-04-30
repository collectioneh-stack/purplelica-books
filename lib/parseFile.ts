'use client'

export async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  const textParts: string[] = []
  const maxPages = Math.min(pdf.numPages, 150) // 최대 150페이지

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items.map((item) => ('str' in item ? item.str : '')).join(' ')
    textParts.push(pageText)
  }

  return textParts.join('\n')
}

export async function extractTextFromEpub(file: File): Promise<string> {
  const ePub = (await import('epubjs')).default
  const arrayBuffer = await file.arrayBuffer()
  const book = ePub(arrayBuffer)
  await book.ready

  const spine = book.spine as unknown as { items: Array<{ href: string }> }
  const textParts: string[] = []

  for (const item of spine.items.slice(0, 80)) {
    try {
      const section = await book.load(item.href) as Document
      const text = section.body?.textContent ?? ''
      if (text.trim()) textParts.push(text.trim())
    } catch {
      // 일부 섹션 파싱 실패는 무시
    }
  }

  return textParts.join('\n')
}

export async function extractText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'epub') return extractTextFromEpub(file)
  if (ext === 'pdf') return extractTextFromPdf(file)
  throw new Error('PDF 또는 EPUB 파일만 지원합니다')
}
