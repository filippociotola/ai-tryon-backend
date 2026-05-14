/**
 * Replicate image generation (used by POST /generate).
 *
 * - No clothing file: black-forest-labs/flux-kontext-pro (edit image with a text prompt).
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

const FLUX_MODEL = "black-forest-labs/flux-kontext-pro";
const VTON_MODEL = "cuuupid/idm-vton";

const DEFAULT_FLUX_PROMPT =
  "High-end fashion editorial photo, soft studio light, natural skin, keep the person's identity and pose.";

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
    // Virtual try-on: person + garment images (see Replicate model page for options).
    output = await replicate.run(VTON_MODEL, {
      input: {
        human_img: fs.createReadStream(opts.humanImagePath),
        garm_img: fs.createReadStream(opts.clothingImagePath),
        garment_des: prompt || "Garment from reference image",
        category: "upper_body",
        crop: true,
      },
    });
  } else {
    // Single image + text edit (no garment file).
    output = await replicate.run(FLUX_MODEL, {
      input: {
        input_image: fs.createReadStream(opts.humanImagePath),
        prompt: prompt || DEFAULT_FLUX_PROMPT,
      },
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
