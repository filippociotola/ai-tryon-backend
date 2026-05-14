/**
 * Framer / vanilla JS — send image to POST /generate
 *
 * BACKEND: http://localhost:3000/generate (change API_URL when deployed)
 * FIELD NAME: "image" (required by your Express + Multer setup)
 *
 * -----------------------------------------------------------------------------
 * REQUIRED HTML — each element MUST use this exact id (Framer HTML embed, or
 * custom code that injects this markup):
 *
 *   id="gen-file-input"   → <input type="file" accept="image/*" />
 *   id="gen-generate"     → <button type="button">Generate</button>
 *   id="gen-loading"      → any element to show/hide while waiting (e.g. <p>)
 *   id="gen-result"       → <img /> (returned image is set as .src)
 *   id="gen-download"     → <button type="button">Download</button>
 *
 * Optional (recommended): id="gen-error" → <p></p> for error messages
 * -----------------------------------------------------------------------------
 *
 * RESPONSE: uses first available of imageDataUrl, imageBase64, imageUrl
 */

(function () {
  var API_URL = "http://localhost:3000/generate";

  var fileInput = document.getElementById("gen-file-input");
  var generateBtn = document.getElementById("gen-generate");
  var loadingEl = document.getElementById("gen-loading");
  var errorEl = document.getElementById("gen-error");
  var resultImg = document.getElementById("gen-result");
  var downloadBtn = document.getElementById("gen-download");

  if (!fileInput || !generateBtn || !loadingEl || !resultImg || !downloadBtn) {
    console.error(
      "framer-generation.js: Missing required elements. Need ids: gen-file-input, gen-generate, gen-loading, gen-result, gen-download"
    );
    return;
  }

  var lastImageSrc = null;

  function setLoading(isLoading) {
    loadingEl.style.display = isLoading ? "block" : "none";
    generateBtn.disabled = isLoading;
  }

  function showError(message) {
    if (errorEl) {
      errorEl.textContent = message || "";
      errorEl.style.display = message ? "block" : "none";
    } else if (message) {
      alert(message);
    }
  }

  function pickImageSrc(data) {
    if (data.imageDataUrl) return data.imageDataUrl;
    if (data.imageBase64) return "data:image/png;base64," + data.imageBase64;
    if (data.imageUrl) return data.imageUrl;
    return null;
  }

  generateBtn.addEventListener("click", function () {
    showError("");
    lastImageSrc = null;
    downloadBtn.disabled = true;
    resultImg.style.display = "none";
    resultImg.removeAttribute("src");

    if (!fileInput.files || fileInput.files.length === 0) {
      showError("Please choose an image first.");
      return;
    }

    var form = new FormData();
    form.append("image", fileInput.files[0]);

    setLoading(true);

    fetch(API_URL, { method: "POST", body: form })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, status: res.status, data: data };
        });
      })
      .then(function (out) {
        if (!out.ok) {
          showError(
            out.data && out.data.error
              ? out.data.error
              : "Request failed (HTTP " + out.status + ")"
          );
          console.log("Response:", out.data);
          return;
        }

        var src = pickImageSrc(out.data);
        if (!src) {
          showError("No image in response (imageDataUrl, imageBase64, or imageUrl).");
          console.log("Response:", out.data);
          return;
        }

        lastImageSrc = src;
        resultImg.src = src;
        resultImg.style.display = "block";
        downloadBtn.disabled = false;
      })
      .catch(function (err) {
        showError("Network error — server running? CORS? (" + err.message + ")");
      })
      .finally(function () {
        setLoading(false);
      });
  });

  downloadBtn.addEventListener("click", function () {
    if (!lastImageSrc) return;
    var a = document.createElement("a");
    a.href = lastImageSrc;
    a.download = "generated-image.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
})();
