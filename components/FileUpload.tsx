'use client'

import { useRef, useState } from 'react'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  isLoading: boolean
}

export default function FileUpload({ onFileSelect, isLoading }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'pdf' && ext !== 'epub') {
      alert('PDF 또는 EPUB 파일만 업로드할 수 있습니다')
      return
    }
    onFileSelect(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onClick={() => !isLoading && inputRef.current?.click()}
      style={{
        borderColor: isDragging ? '#f59e0b' : '#44403c',
        backgroundColor: isDragging ? 'rgba(245,158,11,0.05)' : 'rgba(28,25,23,0.8)',
        boxShadow: isDragging ? '0 0 32px rgba(245,158,11,0.15)' : 'none',
      }}
      className={`
        w-full border-2 border-dashed rounded-3xl p-14
        flex flex-col items-center gap-5 transition-all duration-200
        ${isLoading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-stone-500'}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.epub"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {isLoading ? (
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-stone-700" />
            <div className="absolute inset-0 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-2xl">📖</div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-white font-semibold">AI가 인물을 분석 중입니다</div>
            <div className="text-stone-500 text-sm">소설 길이에 따라 30초~2분 소요됩니다</div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-stone-800 flex items-center justify-center text-3xl">
            📚
          </div>
          <div className="text-center space-y-1.5">
            <div className="text-white font-semibold text-base">
              PDF 또는 EPUB 파일을 올려주세요
            </div>
            <div className="text-stone-500 text-sm">드래그 앤 드롭 또는 클릭하여 선택</div>
          </div>
          <div className="flex gap-2 mt-1">
            {['.PDF', '.EPUB'].map((ext) => (
              <span key={ext} className="text-xs text-stone-600 bg-stone-800 px-3 py-1 rounded-full border border-stone-700">
                {ext}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
