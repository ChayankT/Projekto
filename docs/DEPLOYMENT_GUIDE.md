# 🚀 Deployment Guide

This is a React frontend paired with a Node.js backend. The cheapest, simplest way to get it live is **Vercel** for the frontend and **Render** for the backend — both have workable free tiers.

## 🛠 Step 1: Deploy the Backend to Render.com

1. Head to [Render](https://render.com/) and sign up (GitHub login works fine).
2. Click **New +**, then **Web Service**.
3. Pick **"Build and deploy from a Git repository"** and point it at your repo (`kpit_sub_Nethrabalan`).
4. **Configuration**:
    - **Name**: `projekto-backend` (or anything you like)
    - **Root Directory**: `backend` (⚠️ don't skip this)
    - **Environment**: `Node`
    - **Build Command**: `npm install`
    - **Start Command**: `node server.js` (⚠️ make sure this overrides whatever `package.json` would otherwise run)
5. **Environment Variables**:
    - `MONGO_URI` — your MongoDB Atlas connection string
    - `PORT` — set to `5000`
6. Click **Create Web Service**.
7. Give it a few minutes to build. Once it's live, grab the public URL (something like `https://projekto-backend.onrender.com`).

*(Render's free tier spins services down after a period of inactivity, so the first request after a lull can take a few seconds to wake it back up.)*

---

## 🌐 Step 2: Deploy the Frontend to Vercel

Vercel is built for React/Vite apps and is quick to set up.

1. Go to [Vercel](https://vercel.com/) and sign in with GitHub.
2. Click **Add New...** → **Project**.
3. Import the same GitHub repo (`kpit_sub_Nethrabalan`).
4. **Configuration**:
    - **Project Name**: `projekto-frontend`
    - **Framework Preset**: `Vite` (should auto-detect)
    - **Root Directory**: use the "Edit" button to select the `frontend` folder (⚠️ don't skip this)
5. **Environment Variables**:
    - Name: `VITE_API_URL`
    - Value: the Render URL from Step 1, with `/api` appended (e.g. `https://projekto-backend.onrender.com/api`)
6. Click **Deploy** and let Vercel build the app.

---

## ✅ You're Done!

Once Vercel shows the green checkmark, the full Projekto stack is live.

- The **Vercel URL** is what you share to access the app.
- The **Render URL** is the backend, and also serves the Swagger docs at `/api-docs`.

### Pushing updates
Since both services are wired directly to the `main` branch of your GitHub repo, any `git push` triggers an automatic rebuild and redeploy on both Vercel and Render — no manual redeploy steps needed.
