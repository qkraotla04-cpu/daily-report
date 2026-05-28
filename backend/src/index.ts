import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import path from 'path'
import { env } from './config/env'
import { authRouter } from './modules/auth/auth.router'
import { reportsRouter } from './modules/reports/reports.router'
import { pasteRouter } from './modules/paste/paste.router'
import { aggregationRouter } from './modules/aggregation/aggregation.router'
import { weeklyRouter } from './modules/weekly/weekly.router'
import { adminRouter } from './modules/admin/admin.router'
import { errorHandler } from './middleware/errorHandler'

const app = express()

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
)
app.use(express.json())
app.use(cookieParser())

// 헬스체크
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API 라우터
app.use('/api/v1/auth', authRouter)
app.use('/api/v1/reports', reportsRouter)
app.use('/api/v1/paste', pasteRouter)
app.use('/api/v1/aggregation', aggregationRouter)
app.use('/api/v1/weekly', weeklyRouter)
app.use('/api/v1/admin', adminRouter)

// Production: serve frontend static files
if (env.NODE_ENV === 'production') {
  const staticPath = path.join(__dirname, '../../frontend/dist')
  app.use(express.static(staticPath))
  // SPA fallback — React Router 가 경로를 처리하도록 index.html 반환
  app.get('*', (_req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'))
  })
}

// 에러 핸들러 (마지막)
app.use(errorHandler)

app.listen(env.PORT, () => {
  console.log(`✅ Backend 서버 실행 중: http://localhost:${env.PORT}`)
  console.log(`   환경: ${env.NODE_ENV}`)
})
