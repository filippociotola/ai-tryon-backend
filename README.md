# AI image generation backend

Simple **Node.js + Express** API for an AI image site. It accepts a user image plus optional text prompt, calls the **Hugging Face Inference API** (image-to-image), and returns **`imageUrl`** and **`imageDataUrl`**.

## Prerequisites

- [Node.js](https://nodejs.org/) **v18 or newer** (includes `npm`)

## Run locally (exact commands)

Open PowerShell or Terminal in this project folder (`sitos`), then run:

```bash
cd "c:\Users\my pc\Desktop\sitos"
```

Install dependencies:

```bash
npm install
```

Create your environment file from the example:

```bash
copy .env.example .env
```

On macOS/Linux use:

```bash
cp .env.example .env
```

Edit `.env` and set at least `CORS_ORIGIN` to your published Framer site URL (for example `https://your-project.framer.website`).

Start the server:

```bash
npm start
```

Optional — auto-restart when you edit `server.js` (Node 18+):

```bash
npm run dev
```

You should see: `Server listening on http://localhost:3000`

## Test the API

Replace `C:\path\to\photo.jpg` with a real image path on your machine.

**PowerShell:**

```powershell
curl.exe -X POST http://localhost:3000/generate -F "image=@C:\path\to\photo.jpg" -F "prompt=summer outfit" -F "clothing=@C:\path\to\shirt.jpg"
```

**Framer / browser:** your site must use the same origin you put in `CORS_ORIGIN`, and call `POST` with `multipart/form-data` and field names `image`, optional `clothing`, optional `prompt`.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check JSON |
| POST | `/generate` | Upload `image` (required), optional `clothing`, optional `prompt` |

## Environment variables

| Variable | Purpose |
|----------|---------|
| `PORT` | Server port (default `3000`) |
| `HF_TOKEN` | [Hugging Face](https://huggingface.co) access token (`hf_...`) — required for `/generate` |
| `HF_IMAGE2IMAGE_MODEL` | Optional — overrides default `timbrooks/instruct-pix2pix` |
| `CORS_ORIGIN` | Your Framer site origin (HTTPS URL), so the browser allows the request |

## Notes

- Uploaded files are saved under the `uploads/` folder for debugging.
- `/generate` uses the Hugging Face Inference API (`provider: hf-inference` only). See `huggingfaceGenerate.js`. Optional `clothing` upload is ignored.
