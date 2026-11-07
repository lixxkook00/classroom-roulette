import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { DEFAULT_TEACHER_PIN, hashPin } from './src/pin.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Teacher password: set VITE_TEACHER_PIN in Vercel (Project → Settings → Environment Variables)
  // or in a local .env file. Only its hash goes into the app.
  const env = loadEnv(mode, process.cwd(), '')
  const pin = env.VITE_TEACHER_PIN || DEFAULT_TEACHER_PIN

  return {
    plugins: [react()],
    define: {
      __TEACHER_PIN_HASH__: JSON.stringify(hashPin(pin)),
    },
  }
})
