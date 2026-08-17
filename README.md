# Proctored Online Examination System

A pure HTML/CSS/JavaScript web application backed by Supabase for managing and conducting secure online examinations with browser-based proctoring.

---

## 🚀 Deployment Instructions for Cloudflare Pages

1. **Create Repository:**
   Push the files directly to your GitHub repository root:
   - `index.html`
   - `config.js`
   - `style.css`
   - `app.js`
   - `admin.js`
   - `exam.js`
   - `camera.js`

2. **Configure Supabase Credentials:**
   Edit `config.js` and input your project values:
   ```javascript
   const SUPABASE_URL = "https://kzutrwddzxpqjgfhhlhc.supabase.co/rest/v1/";
   const SUPABASE_ANON_KEY = "sb_publishable_3pQkQDCdjZgcABFzCVlGQA_NpivWNkl";
