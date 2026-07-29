import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Spark, SparkMode } from '../types'

type Props = {
  open: boolean
  onClose: () => void
  onSave: (spark: Omit<Spark, 'id' | 'createdAt'>) => void
}

const MAX_AUDIO_SEC = 60

function pickMime(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm'
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
    return 'audio/webm;codecs=opus'
  }
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm'
  if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4'
  return ''
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export function SparkCapture({ open, onClose, onSave }: Props) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<SparkMode>('note')
  const [text, setText] = useState('')
  const [recording, setRecording] = useState(false)
  const [audioSec, setAudioSec] = useState(0)
  const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null)
  const [audioMime, setAudioMime] = useState('audio/webm')
  const [audioError, setAudioError] = useState<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)

  function stopTracks() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  function clearTimer() {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  async function stopRecording(): Promise<string | null> {
    const recorder = mediaRecorderRef.current
    clearTimer()
    setRecording(false)

    if (!recorder || recorder.state === 'inactive') {
      stopTracks()
      return audioDataUrl
    }

    return new Promise((resolve) => {
      recorder.onstop = () => {
        void (async () => {
          stopTracks()
          mediaRecorderRef.current = null
          const type = audioMime || chunksRef.current[0]?.type || 'audio/webm'
          const blob = new Blob(chunksRef.current, { type })
          chunksRef.current = []
          if (blob.size === 0) {
            resolve(audioDataUrl)
            return
          }
          try {
            const url = await blobToDataUrl(blob)
            setAudioDataUrl(url)
            setAudioMime(type)
            resolve(url)
          } catch {
            resolve(null)
          }
        })()
      }
      recorder.stop()
    })
  }

  useEffect(() => {
    if (!open) return
    setMode('note')
    setText('')
    setRecording(false)
    setAudioSec(0)
    setAudioDataUrl(null)
    setAudioError(null)
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#fffdf9'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
    }
  }, [open])

  useEffect(() => {
    return () => {
      clearTimer()
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
      stopTracks()
    }
  }, [])

  if (!open) return null

  function pointerPos(
    e: React.PointerEvent<HTMLCanvasElement>,
  ): { x: number; y: number } {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    drawing.current = true
    canvas.setPointerCapture(e.pointerId)
    const { x, y } = pointerPos(e)
    ctx.strokeStyle = '#1c2b24'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = pointerPos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = false
    canvasRef.current?.releasePointerCapture(e.pointerId)
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.fillStyle = '#fffdf9'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  async function startRecording() {
    setAudioError(null)
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setAudioError(t('sparkCapture.audio.unsupported'))
      return
    }

    const mime = pickMime()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream)
      chunksRef.current = []
      setAudioDataUrl(null)
      setAudioMime(recorder.mimeType || mime || 'audio/webm')
      setAudioSec(0)

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorderRef.current = recorder
      recorder.start(250)
      setRecording(true)

      timerRef.current = window.setInterval(() => {
        setAudioSec((s) => {
          if (s + 1 >= MAX_AUDIO_SEC) {
            void stopRecording()
            return MAX_AUDIO_SEC
          }
          return s + 1
        })
      }, 1000)
    } catch {
      stopTracks()
      setAudioError(t('sparkCapture.audio.micDenied'))
    }
  }

  async function switchMode(next: SparkMode) {
    if (recording) await stopRecording()
    setMode(next)
  }

  async function saveAndClose() {
    let audioUrl = audioDataUrl
    if (mode === 'audio' && recording) {
      audioUrl = await stopRecording()
    }

    if (mode === 'draw') {
      const dataUrl = canvasRef.current?.toDataURL('image/png')
      if (!dataUrl) {
        onClose()
        return
      }
      onSave({
        mode: 'draw',
        drawingDataUrl: dataUrl,
        text: text.trim() || undefined,
      })
      onClose()
      return
    }

    if (mode === 'audio') {
      if (!audioUrl) {
        setAudioError(t('sparkCapture.audio.noRecording'))
        return
      }
      onSave({
        mode: 'audio',
        audioDataUrl: audioUrl,
        audioMimeType: audioMime,
        text: text.trim() || undefined,
      })
      onClose()
      return
    }

    const trimmed = text.trim()
    if (!trimmed) {
      onClose()
      return
    }
    onSave({ mode: 'note', text: trimmed })
    onClose()
  }

  async function discardAndClose() {
    if (recording) await stopRecording()
    onClose()
  }

  return (
    <div
      className="spark-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t('sparkCapture.ariaLabel')}
    >
      <div className="spark-panel">
        <div className="spark-head">
          <h2>{t('sparkCapture.title')}</h2>
          <p>{t('sparkCapture.lead')}</p>
        </div>

        <div className="spark-tabs" role="tablist">
          {(
            [
              ['note', 'sparkCapture.tabs.note'],
              ['draw', 'sparkCapture.tabs.draw'],
              ['audio', 'sparkCapture.tabs.audio'],
            ] as const
          ).map(([id, labelKey]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              className={mode === id ? 'active' : ''}
              onClick={() => void switchMode(id)}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>

        {mode === 'note' && (
          <textarea
            className="spark-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('sparkCapture.notePlaceholder')}
            rows={4}
            autoFocus
          />
        )}

        {mode === 'draw' && (
          <div className="spark-draw">
            <canvas
              ref={canvasRef}
              width={480}
              height={280}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            />
            <button type="button" className="ghost sm" onClick={clearCanvas}>
              {t('sparkCapture.clearCanvas')}
            </button>
          </div>
        )}

        {mode === 'audio' && (
          <div className="spark-dictate">
            <p className="audio-status">
              {recording
                ? t('sparkCapture.audio.recording', {
                    sec: audioSec,
                    max: MAX_AUDIO_SEC,
                  })
                : audioDataUrl
                  ? t('sparkCapture.audio.ready', { sec: audioSec })
                  : t('sparkCapture.audio.idle', { max: MAX_AUDIO_SEC })}
            </p>
            {audioDataUrl && !recording && (
              <audio controls src={audioDataUrl} className="spark-audio" />
            )}
            <textarea
              className="spark-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('sparkCapture.audio.keywordPlaceholder')}
              rows={2}
            />
            {audioError && <p className="spark-error">{audioError}</p>}
            <button
              type="button"
              className={recording ? 'secondary' : 'primary'}
              onClick={() =>
                void (recording ? stopRecording() : startRecording())
              }
            >
              {recording
                ? t('sparkCapture.audio.stop')
                : audioDataUrl
                  ? t('sparkCapture.audio.rerecord')
                  : t('sparkCapture.audio.start')}
            </button>
          </div>
        )}

        <div className="spark-actions">
          <button type="button" className="ghost" onClick={() => void discardAndClose()}>
            {t('sparkCapture.discard')}
          </button>
          <button type="button" className="primary" onClick={() => void saveAndClose()}>
            {t('sparkCapture.park')}
          </button>
        </div>
      </div>
    </div>
  )
}
