import { z } from 'zod'
import dotenv from 'dotenv'

// .env 의 값이 외부 주입(PORT 등)보다 우선되도록 override 활성
// preview 도구가 launch.json 의 port 를 PORT 환경변수로 주입하기 때문에 명시적 처리 필요
dotenv.config({ override: true })

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ 환경 변수 설정 오류:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
