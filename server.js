const express = require("express")
const cors = require("cors")
const multer = require("multer")
const path = require("path")
const fs = require("fs")

const app = express()

const PORT = process.env.PORT || 3000

const corsOrigin = process.env.CORS_ORIGIN || "*"

app.use(
  cors({
    origin: corsOrigin,
  })
)

app.use(express.json())

const uploadsDir = path.join(__dirname, "uploads")

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir)
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir)
  },

  filename: function (req, file, cb) {
    const unique =
      Date.now() + "-" + Math.round(Math.random() * 1e9)

    cb(null, unique + "-" + file.originalname)
  },
})

const upload = multer({ storage })

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Backend running",
  })
})

app.post(
  "/generate",
  upload.single("image"),
  async (req, res) => {
    try {
      const prompt =
        req.body.prompt ||
        "realistic fashion model wearing a stylish outfit, full body, studio lighting, high quality, fashion editorial photo"

      const imageUrl =
        "https://image.pollinations.ai/prompt/" +
        encodeURIComponent(prompt) +
        "?width=768&height=1024&model=flux&seed=" +
        Date.now()

      return res.json({
        success: true,
        imageUrl,
        imageDataUrl: "",
        message: "Generated with Pollinations free image API",
      })
    } catch (err) {
      console.error(err)

      return res.status(500).json({
        success: false,
        error: err.message || "Server error",
      })
    }
  }
)

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Server listening on port ${PORT} (bind 0.0.0.0)`
  )

  console.log(
    `CORS origin: ${
      corsOrigin || "(any — set CORS_ORIGIN)"
    }`
  )
})