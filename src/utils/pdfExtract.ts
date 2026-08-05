import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { supabase } from './supabase'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  const textParts: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    textParts.push(pageText)
  }

  return textParts.join('\n')
}

export async function extractTextFromTxt(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.onerror = () => reject(new Error('Impossible de lire le fichier texte'))
    reader.readAsText(file, 'utf-8')
  })
}

export async function extractTextFromDocx(file: File): Promise<string> {
  const { default: mammoth } = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

// Redimensionne l'image (taille max ~1600px) et la convertit en JPEG base64,
// pour limiter le poids envoyé au serveur (photos de téléphone = plusieurs Mo).
function resizeImageToJpeg(file: File, maxDim = 1600, quality = 0.82): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      let { width, height } = img
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height)
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      URL.revokeObjectURL(url)
      if (!ctx) { reject(new Error('Impossible de traiter cette image.')); return }
      ctx.drawImage(img, 0, 0, width, height)
      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      resolve({ base64: dataUrl.split(',')[1] ?? '', mediaType: 'image/jpeg' })
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Impossible de lire cette image.')) }
    img.src = url
  })
}

// Transcrit une photo (page de livre, notes manuscrites...) en texte via la vision de Claude.
export async function extractTextFromImage(file: File): Promise<string> {
  const { base64, mediaType } = await resizeImageToJpeg(file)

  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-image-text`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ imageBase64: base64, mediaType }),
    }
  )
  if (!response.ok) throw new Error(`Erreur serveur: ${response.status}`)
  const data = await response.json() as { text?: string; error?: string }
  if (data.error) throw new Error(data.error)
  if (!data.text) throw new Error('Aucun texte détecté sur cette photo.')
  return data.text
}

export async function extractText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''

  if (ext === 'pdf') return extractTextFromPDF(file)
  if (['txt', 'md'].includes(ext)) return extractTextFromTxt(file)
  if (ext === 'docx') return extractTextFromDocx(file)
  if (ext === 'doc') throw new Error('Le format .doc (Word 97-2003) n\'est pas supporté — réenregistre le fichier en .docx.')
  if (['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext)) return extractTextFromImage(file)

  throw new Error(`Format "${ext}" non supporté. Utilise un fichier PDF, Word (.docx), TXT ou une photo.`)
}
