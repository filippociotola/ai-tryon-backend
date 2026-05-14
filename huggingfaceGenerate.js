/**
 * Hugging Face Inference API — image-to-image.
 *
 * Uses InferenceClient.imageToImage with provider "hf-inference" only.
 * Optional env HF_IMAGE2IMAGE_MODEL overrides the default model id.
 */

"use strict";

const fs = require("fs");
const { InferenceClient } = require("@huggingface/inference");

/** Free / common instruct-based image edit model (image + text → image). */
const DEFAULT_MODEL = "lllyasviel/sd-controlnet-canny";

const DEFAULT_PROMPT =
  "Make this a polished, high-quality photograph with natural color and sharp detail.";

/**
 * @param {object} opts
 * @param {string} opts.imagePath - path to uploaded image file
 * @param {string} opts.prompt - optional user prompt (edit instruction)
 * @returns {Promise<{ imageUrl: string, imageDataUrl: string }>}
 */
async function runWithHuggingFace(opts) {
  const token = process.env.HF_TOKEN;
  if (!token || !String(token).trim()) {
    const err = new Error("Missing HF_TOKEN");
    err.code = "NO_HF_TOKEN";
    throw err;
  }

  const model = process.env.HF_IMAGE2IMAGE_MODEL || DEFAULT_MODEL;
  const client = new InferenceClient(token.trim());
  const bytes = fs.readFileSync(opts.imagePath);
  const inputs = new Blob([bytes]);

  let outBlob;
  try {
    outBlob = await client.imageToImage({
      model,
      provider: "hf-inference",
      inputs,
      parameters: {
        prompt: (opts.prompt || "").trim() || DEFAULT_PROMPT,
        guidance_scale: 7.5,
        num_inference_steps: 25,
      },
    });
  } catch (err) {
    console.error("[HF] imageToImage failed:", err && err.message);
    const res = err && err.response;
    if (res && typeof res.clone === "function" && typeof res.text === "function") {
      try {
        const raw = await res.clone().text();
        console.error("[HF] error response body (exact):", raw);
      } catch (readErr) {
        console.error("[HF] could not read error body:", readErr && readErr.message);
      }
    }
    throw err;
  }

  const outBuf = Buffer.from(await outBlob.arrayBuffer());
  const mime =
    outBlob && typeof outBlob.type === "string" && outBlob.type.startsWith("image/")
      ? outBlob.type
      : "image/png";
  const imageDataUrl = `data:${mime};base64,${outBuf.toString("base64")}`;

  // HF returns bytes only (no hosted CDN URL). Data URLs are valid for <img src> and Framer.
  return {
    imageUrl: imageDataUrl,
    imageDataUrl,
  };
}

module.exports = { runWithHuggingFace };
