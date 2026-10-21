// A file from public/ under the app's base path: '/' locally and on Firebase Hosting,
// '/sakura-ecasino/' on GitHub Pages (BASE_PATH in vite.config.ts). Use it for every public/
// path in code; a bare '/hero/...' would miss the base and 404 on GitHub Pages.
export const publicUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
