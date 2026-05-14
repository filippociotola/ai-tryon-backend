/**
 * Replicate image generation (used by POST /generate).
 *
 * - No clothing file: stability-ai/stable-diffusion-img2img:15a3689ee13b0d2616e98820eca31d4c3abcd36672df6afce5cb6feb1d66087d (pinned; avoids 404).
 * - With clothing file: cuuupid/idm-vton (virtual try-on; non-commercial license on Replicate).
 *
 * Auth: set REPLICATE_API_TOKEN (see .env.example). AI_API_KEY is still read as a fallback.
 */

"use strict";

const fs = require("fs");
const Replicate = require("replicate");

/** Official token name; `AI_API_KEY` kept for older .env files. */
function getReplicateToken() {
  return process.env.REPLICATE_API_TOKEN || process.env.AI_API_KEY;
}

/**
 * Log the exact HTTP body Replicate returns on failure (e.g. 422 validation).
 * @param {unknown} err
 */
async function logReplicateApiError(err) {
  console.error("[Replicate] request failed:", err && err.name, err && err.message);

  const res = err && err.response;
  if (res && typeof res.clone === "function" && typeof res.text === "function") {
    try {
      const raw = await res.clone().text();
      console.error("[Replicate] error response body (exact):", raw);
      try {
        const parsed = JSON.parse(raw);
        console.error("[Replicate] error response body (parsed JSON):", JSON.stringify(parsed, null, 2));
      } catch {
        /* not JSON */
      }
    } catch (readErr) {
      console.error("[Replicate] could not read error response body:", readErr && readErr.message);
    }
  } else {
    console.error("[Replicate] non-HTTP error or missing response:", err);
  }
}

async function replicateRunLogged(replicate, model, input) {
  try {
    return await replicate.run(model, { input });
  } catch (err) {
    await logReplicateApiError(err);
    throw err;
  }
}

/**
 * Replicate returns a URL string, a FileOutput with .url(), or an array — normalize to one string URL.
 */
function normalizeImageOutput(output) {
  if (typeof output === "string") return output;
  if (output && typeof output === "object") {
    if (typeof output.url === "function") return String(output.url());
    if (typeof output.url === "string") return output.url;
  }
  if (Array.isArray(output) && output.length > 0) {
    const first = output[0];
    if (typeof first === "string") return first;
    if (first && typeof first.url === "function") return String(first.url());
    if (first && typeof first.url === "string") return first.url;
  }
  throw new Error("Unexpected Replicate output (expected a URL). Check the model README on Replicate.");
}

/**
 * Download the image so the browser can use a data URL (e.g. Framer localStorage) without hotlinking.
 */
async function urlToDataUrl(imageUrl) {
  const res = await fetch(imageUrl, { redirect: "follow" });
  if (!res.ok) throw new Error(`Failed to fetch output image: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const mime = res.headers.get("content-type") || "image/png";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

/** Pinned model (owner/name:version_id). Inputs: `image` stream + `prompt` string. */
const IMG2IMG_MODEL =
  "stability-ai/stable-diffusion-img2img:15a3689ee13b0d2616e98820eca31d4c3abcd36672df6afce5cb6feb1d66087d";
const VTON_MODEL = "cuuupid/idm-vton";

const DEFAULT_IMG2IMG_PROMPT =
  "photographic portrait, natural light, high detail, sharp focus, same person and pose";

/**
 * @param {object} opts
 * @param {string} opts.humanImagePath - absolute path to uploaded person image
 * @param {string | null} opts.clothingImagePath - absolute path to garment image, or null
 * @param {string} opts.prompt - optional text from multipart field `prompt`
 * @returns {Promise<{ imageUrl: string, imageDataUrl: string | null }>}
 */
async function runWithReplicate(opts) {
  const token = getReplicateToken();
  if (!token || token === "your_api_key_here") {
    const err = new Error(
      "Missing Replicate token. Add REPLICATE_API_TOKEN to .env (local) or Render Environment."
    );
    err.code = "NO_TOKEN";
    throw err;
  }

  const replicate = new Replicate({ auth: token });
  const prompt = (opts.prompt || "").trim();

  let output;
  if (opts.clothingImagePath) {
    output = await replicateRunLogged(replicate, VTON_MODEL, {
      human_img: fs.createReadStream(opts.humanImagePath),
      garm_img: fs.createReadStream(opts.clothingImagePath),
      garment_des: prompt || "Garment from reference image",
      category: "upper_body",
      crop: true,
    });
  } else {
    output = await replicateRunLogged(replicate, IMG2IMG_MODEL, {
      image: fs.createReadStream(opts.humanImagePath),
      prompt: prompt || DEFAULT_IMG2IMG_PROMPT,
      prompt_strength: 0.75,
      num_inference_steps: 25,
      guidance_scale: 7.5,
    });
  }

  const imageUrl = normalizeImageOutput(output);

  let imageDataUrl = null;
  try {
    imageDataUrl = await urlToDataUrl(imageUrl);
  } catch (e) {
    console.warn("Could not build imageDataUrl (imageUrl still valid):", e.message);
  }

  return { imageUrl, imageDataUrl };
}

module.exports = { runWithReplicate, getReplicateToken };
