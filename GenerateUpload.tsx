/**
 * Framer: Code → New File → paste this file (or copy everything below the comments).
 *
 * What it does:
 * 1) User picks an image
 * 2) Clicks Generate → POST multipart field "image" to your Render backend
 * 3) Saves the returned image (imageDataUrl / imageBase64 / imageUrl) to localStorage
 * 4) Redirects the browser to /loading (create that page in Framer with the same slug)
 *
 * Drag the component from Assets onto your upload frame. Resize the frame as needed.
 */

import * as React from "react"

// Your live API (HTTPS). Change here if your backend URL changes.
const API_URL = "https://ai-tryon-backend-mr9q.onrender.com/generate"

// Must match your result / loading flow (same key as other snippets in this project).
const STORAGE_KEY = "aiGen_imageSrc_v1"

// Framer page path: create a page whose URL slug is "loading" (e.g. /loading).
const LOADING_PATH = "/loading"

/** Backend may return any of these — we use the first one that exists. */
function pickImageSrc(data: {
  imageDataUrl?: string
  imageBase64?: string
  imageUrl?: string
}): string | null {
  if (data.imageDataUrl) return data.imageDataUrl
  if (data.imageBase64) return "data:image/png;base64," + data.imageBase64
  if (data.imageUrl) return data.imageUrl
  return null
}

export default function GenerateUpload() {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleGenerate = React.useCallback(async () => {
    setError(null)

    const input = fileInputRef.current
    const file = input?.files?.[0]
    if (!file) {
      setError("Please choose an image first.")
      return
    }

    const form = new FormData()
    // Your Express + Multer backend expects the file under the field name "image".
    form.append("image", file)

    setLoading(true)
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        body: form,
      })

      const data = (await res.json()) as {
        success?: boolean
        error?: string
        imageDataUrl?: string
        imageBase64?: string
        imageUrl?: string
      }

      if (!res.ok) {
        setError(data.error || "Request failed (HTTP " + res.status + ")")
        return
      }

      const src = pickImageSrc(data)
      if (!src) {
        setError("No image in response. Expected imageDataUrl, imageBase64, or imageUrl.")
        return
      }

      try {
        localStorage.setItem(STORAGE_KEY, src)
      } catch {
        setError("Could not save image (file too large for localStorage?). Try a smaller image.")
        return
      }

      // Full navigation to your Framer "loading" page.
      window.location.assign(LOADING_PATH)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network error"
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Minimal black & white layout (inline styles = no extra CSS file).
  const box: React.CSSProperties = {
    width: "100%",
    maxWidth: 360,
    margin: "0 auto",
    padding: 16,
    fontFamily: "system-ui, sans-serif",
    color: "#111",
    background: "#fff",
    border: "1px solid #111",
    boxSizing: "border-box",
  }

  const label: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.02em",
    textTransform: "uppercase",
    marginBottom: 8,
  }

  const inputFile: React.CSSProperties = {
    width: "100%",
    fontSize: 13,
    color: "#111",
  }

  const button: React.CSSProperties = {
    marginTop: 16,
    width: "100%",
    padding: "12px 16px",
    fontSize: 14,
    fontWeight: 600,
    cursor: loading ? "wait" : "pointer",
    color: "#fff",
    background: loading ? "#444" : "#111",
    border: "1px solid #111",
  }

  const errorText: React.CSSProperties = {
    marginTop: 12,
    fontSize: 13,
    color: "#111",
    borderTop: "1px dashed #111",
    paddingTop: 12,
  }

  return (
    <div style={box}>
      <label style={label} htmlFor="generate-upload-input">
        Image
      </label>
      <input
        id="generate-upload-input"
        ref={fileInputRef}
        type="file"
        accept="image/*"
        disabled={loading}
        style={inputFile}
      />

      <button type="button" style={button} disabled={loading} onClick={handleGenerate}>
        {loading ? "Generating…" : "Generate"}
      </button>

      {error ? <p style={errorText}>{error}</p> : null}
    </div>
  )
}
