# equall - Split Bill Calculator

Split bill lebih mudah, adil, dan transparan.

## Setup

### 1. Supabase
1. Buat project baru di supabase.com
2. Buka SQL Editor dan jalankan isi file `supabase-setup.sql`
3. Copy Project URL dan anon key dari Settings > API

### 2. Environment Variables
Copy .env.example ke .env dan isi:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Install & Run
```
npm install
npm run dev
```

### 4. Deploy ke Netlify
1. Push ke GitHub
2. Connect repo di netlify.com
3. Build command: npm run build
4. Publish directory: dist
5. Add env vars: VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY
