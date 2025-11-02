import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost', // localhost로 명시적으로 설정
    port: 5173, // 포트 번호 명시
    open: true, // 자동으로 브라우저 열기
  },
})
