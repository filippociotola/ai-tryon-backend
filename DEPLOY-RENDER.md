# Deploy this backend to Render (beginner guide)

Follow the sections in order. You can keep this file open while you work.

---

## 1. Exactly what files are needed on GitHub

Render installs dependencies from **`package.json`** and starts your app with **`npm start`**, which runs **`server.js`**.

### Must be in your GitHub repository (committed)

| File / folder | Why |
|---------------|-----|
| **`package.json`** | Lists dependencies and the `start` script. |
| **`package-lock.json`** | Locks dependency versions so Render installs the same packages every time. |
| **`server.js`** | Your Express app. |
| **`.gitignore`** | Tells Git to **not** upload `node_modules`, `.env`, `uploads`, etc. |

### Must **not** be on GitHub (secrets and junk)

| Never commit | Why |
|--------------|-----|
| **`node_modules/`** | Render runs `npm install` for you. |
| **`.env`** | Contains secrets; use Render’s **Environment** tab instead. |
| **`uploads/`** | Local scratch files; also ignored. |

### Optional but useful (safe to commit)

| File | Why |
|------|-----|
| **`render.yaml`** | Optional “Blueprint” so Render knows build/start commands. You can ignore it and type the same settings in the dashboard. |
| **`.env.example`** | Documents variable names (`CORS_ORIGIN`, `REPLICATE_API_TOKEN`) for you and teammates. |
| **`README.md`**, **`test.html`**, **`framer-*.html`**, **`framer-generation.js`** | Fine to commit; Render does not need them to run the server. |

### After deploy, you set secrets only in Render

In the Render dashboard → your Web Service → **Environment**, add:

- **`CORS_ORIGIN`** — your published Framer URL, e.g. `https://yoursite.framer.website` (no trailing slash).
- **`REPLICATE_API_TOKEN`** — required for `/generate` (create at [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens)).

Render automatically sets **`PORT`**; your code already uses it.

---

## 2. How to push the project to GitHub (do not skip)

These steps assume the project folder is **`sitos`** on your PC (adjust the path if yours differs).

### 2.1 Install Git (once)

1. Open [https://git-scm.com/download/win](https://git-scm.com/download/win).
2. Download and run the installer.
3. Accept the defaults unless you have a preference.
4. Close and reopen **PowerShell** (or **Terminal**) after installing.

### 2.2 Check Git works

```powershell
git --version
```

You should see a version number. If you see an error, Git is not on your PATH — restart the terminal or reinstall Git.

### 2.3 Go to your project folder

```powershell
cd "c:\Users\my pc\Desktop\sitos"
```

### 2.4 Turn the folder into a Git repository (first time only)

```powershell
git init
```

### 2.5 Tell Git your name and email (once per computer)

Use the same email as your GitHub account.

```powershell
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

### 2.6 Make sure `node_modules` is not tracked

Your **`.gitignore`** should already list `node_modules/`. Confirm:

```powershell
git status
```

If `node_modules` appears as **untracked** or **staged**, do **not** add it. Only stage the files listed in section 1.

### 2.7 Stage and commit your code

```powershell
git add package.json package-lock.json server.js .gitignore .env.example render.yaml
```

Optional: add other safe files (README, Framer snippets, test.html):

```powershell
git add README.md test.html framer-upload-page.html framer-result-page.html framer-embed.html framer-generation.js DEPLOY-RENDER.md
```

Commit:

```powershell
git commit -m "Initial backend for Render"
```

If Git says “nothing to commit”, you may have already committed — run `git status` to see.

### 2.8 Create a new empty repository on GitHub

1. Log in to [https://github.com](https://github.com).
2. Click **+** → **New repository**.
3. **Repository name:** e.g. `ai-image-gen-backend`.
4. Choose **Public** (or Private).
5. **Do not** add a README, .gitignore, or license (avoids merge conflicts).
6. Click **Create repository**.

GitHub will show you commands — use the **“push an existing repository”** path below instead if you already ran `git init` above.

### 2.9 Connect your PC to GitHub and push

On the GitHub page, copy the repository URL. It looks like:

`https://github.com/YOUR_USERNAME/ai-image-gen-backend.git`

In PowerShell (still inside `sitos`):

```powershell
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ai-image-gen-backend.git
git push -u origin main
```

- Replace **`YOUR_USERNAME`** and the repo name with yours.
- The first `git push` may open a browser or ask for a **Personal Access Token** instead of a password. If GitHub asks for a token: **GitHub → Settings → Developer settings → Personal access tokens** — create one with **repo** scope and paste it when Git asks for a password.

### 2.10 Confirm on GitHub

Refresh your repository page. You should see `server.js`, `package.json`, etc. You should **not** see `node_modules` or `.env`.

---

## 3. How to deploy on Render (step by step)

### 3.1 Create a Render account

1. Open [https://render.com](https://render.com).
2. Sign up (e.g. **Sign up with GitHub** is easiest).

### 3.2 Create a new Web Service

1. In the Render dashboard, click **New +**.
2. Click **Web Service**.
3. If asked, **Connect** your **GitHub** account and allow Render to access repositories.
4. Find your repo (e.g. `ai-image-gen-backend`) and click **Connect**.

### 3.3 Configure the service

Fill in:

| Field | What to enter |
|--------|----------------|
| **Name** | Anything, e.g. `ai-image-gen-backend`. |
| **Region** | Pick one close to you (e.g. Oregon / Frankfurt). |
| **Branch** | `main` (unless you use another default branch). |
| **Root Directory** | Leave **empty** if `package.json` is at the repo root. |
| **Runtime** | **Node** (Render picks Node automatically when it sees `package.json`). |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance type** | **Free** is fine to start. |

Click **Create Web Service** (or **Deploy**).

### 3.4 Wait for the first deploy

- Render shows **logs** while it installs packages and starts `node server.js`.
- When you see **Live** and a green check, the service is running.

If the build fails, read the red error in the logs (often a missing `package.json` or wrong root directory).

### 3.5 Set environment variables (important for Framer)

1. Open your service → **Environment** (left sidebar).
2. Click **Add Environment Variable** for each:

| Key | Value |
|-----|--------|
| `CORS_ORIGIN` | Your live Framer site origin only, e.g. `https://yoursite.framer.website` (must match the browser address exactly: `https`, no path, usually no trailing slash). |
| `REPLICATE_API_TOKEN` | Required for image generation (`r8_...` from Replicate). |

3. Click **Save Changes**. Render will **redeploy** automatically.

If `CORS_ORIGIN` is wrong, the browser will show CORS errors and Framer cannot load your API.

---

## 4. How to get the public backend URL

1. In Render, open your **Web Service** (not the database).
2. At the top you will see the **URL**, for example:

   `https://ai-image-gen-backend.onrender.com`

3. That is your **base URL**. Your generate endpoint is:

   **`https://YOUR-SERVICE-NAME.onrender.com/generate`**

   Example: `https://ai-image-gen-backend.onrender.com/generate`

4. Quick test: open **`https://YOUR-SERVICE-NAME.onrender.com/`** in a browser — you should see JSON like `{"ok":true,...}` from your health route.

**Free tier note:** the first request after idle can take **30–60 seconds** (“cold start”). That is normal.

---

## 5. How to replace `localhost` in your Framer code

Your Framer HTML/JS uses a variable like **`API_URL`** (or similar) pointing at `http://localhost:3000/generate`.

### 5.1 Use HTTPS and your Render hostname

1. Copy your full generate URL from section 4, e.g.  
   `https://ai-image-gen-backend.onrender.com/generate`
2. In **every** place you call the backend from Framer, replace:

   `http://localhost:3000/generate`  

   with  

   `https://YOUR-SERVICE.onrender.com/generate`

### 5.2 Where to edit in this project’s snippets

| File | What to change |
|------|----------------|
| **`framer-upload-page.html`** | Find `var API_URL = "http://localhost:3000/generate";` and set it to your **HTTPS** Render URL ending in `/generate`. |
| **`framer-embed.html`**, **`framer-generation.js`** | Same: replace the localhost URL with your Render URL. |

Published Framer sites use **HTTPS**; your API URL must be **`https://...`**, not `http://localhost`.

### 5.3 CORS must match

The value of **`CORS_ORIGIN`** in Render must be **exactly** the origin Framer uses in the browser, for example:

`https://yoursite.framer.website`

If Framer uses a **custom domain**, set `CORS_ORIGIN` to that origin instead (e.g. `https://www.mydomain.com`).

After changing env vars on Render, wait for the redeploy to finish, then test again.

---

## Checklist

- [ ] GitHub repo contains `package.json`, `package-lock.json`, `server.js`, `.gitignore` — no `node_modules`, no `.env`.
- [ ] Render Web Service: **Build** `npm install`, **Start** `npm start`.
- [ ] Render **Environment**: `CORS_ORIGIN` = your Framer `https://...` origin.
- [ ] Public URL: `https://....onrender.com/generate`.
- [ ] Framer: `API_URL` (or equivalent) uses that HTTPS URL, not localhost.

You are done when your Framer upload page can generate an image against the Render URL without CORS errors in the browser **Console** (F12 → Console).
