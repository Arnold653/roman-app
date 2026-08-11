'use client'

import { useEffect, useRef, useState } from 'react'

export default function LecteurPDF({ url }) {
  const canvasRef = useRef(null)
  const docRef = useRef(null)
  const [page, setPage] = useState(1)
  const [nbPages, setNbPages] = useState(0)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    let annule = false

    async function charger() {
      try {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

        const doc = await pdfjsLib.getDocument(url).promise
        if (annule) return
        docRef.current = doc
        setNbPages(doc.numPages)
        setChargement(false)
        rendrePage(1, doc)
      } catch (e) {
        if (!annule) { setErreur('Impossible de charger ce livre.'); setChargement(false) }
      }
    }

    async function rendrePage(numero, docParam) {
      const doc = docParam || docRef.current
      if (!doc) return
      const pageObj = await doc.getPage(numero)
      const conteneurLargeur = canvasRef.current?.parentElement?.clientWidth || 360
      const viewportBrut = pageObj.getViewport({ scale: 1 })
      const echelle = conteneurLargeur / viewportBrut.width
      const viewport = pageObj.getViewport({ scale: echelle })

      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = viewport.width
      canvas.height = viewport.height
      const contexte = canvas.getContext('2d')
      await pageObj.render({ canvasContext: contexte, viewport }).promise
    }

    charger()
    return () => { annule = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  async function allerA(numero) {
    if (numero < 1 || numero > nbPages || !docRef.current) return
    setPage(numero)
    const pageObj = await docRef.current.getPage(numero)
    const conteneurLargeur = canvasRef.current?.parentElement?.clientWidth || 360
    const viewportBrut = pageObj.getViewport({ scale: 1 })
    const echelle = conteneurLargeur / viewportBrut.width
    const viewport = pageObj.getViewport({ scale: echelle })
    const canvas = canvasRef.current
    canvas.width = viewport.width
    canvas.height = viewport.height
    const contexte = canvas.getContext('2d')
    await pageObj.render({ canvasContext: contexte, viewport }).promise
    canvas.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (erreur) return <p className="text-papier/40 text-sm font-mono py-6">{erreur}</p>

  return (
    <div>
      {chargement && <p className="text-papier/35 text-sm font-mono py-10">Chargement du livre...</p>}

      <div className="rounded-lg overflow-hidden border border-ligne bg-white">
        <canvas ref={canvasRef} className="w-full block" />
      </div>

      {nbPages > 0 && (
        <div className="flex items-center justify-between mt-5">
          <button
            onClick={() => allerA(page - 1)}
            disabled={page <= 1}
            className="text-sm font-mono text-papier/60 hover:text-or transition-colors disabled:opacity-30 disabled:hover:text-papier/60"
          >
            ← Page précédente
          </button>
          <span className="text-xs font-mono text-papier/40">{page} / {nbPages}</span>
          <button
            onClick={() => allerA(page + 1)}
            disabled={page >= nbPages}
            className="text-sm font-mono text-papier/60 hover:text-or transition-colors disabled:opacity-30 disabled:hover:text-papier/60"
          >
            Page suivante →
          </button>
        </div>
      )}
    </div>
  )
}
