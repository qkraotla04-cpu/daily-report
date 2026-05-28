import { z } from 'zod'

// 이메일로 로그인 (회사 이메일 방식)
export const loginSchema = z.object({
  email: z.string().email('올바른 이메일 형식을 입력해주세요.'),
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
})

// 첫 로그인 비밀번호 변경 (현재 비밀번호 불필요 — isFirstLogin=true 인 경우만 허용)
export const firstLoginChangeSchema = z.object({
  newPassword: z.string().min(4, '비밀번호는 4자 이상이어야 합니다.'),
})

export type LoginDto = z.infer<typeof loginSchema>
export type FirstLoginChangeDto = z.infer<typeof firstLoginChangeSchema>

export interface TokenPayload {
  userId: number
  employeeNo: string
  role: string
  name: string
  team: string
  iat?: number
  exp?: number
}
