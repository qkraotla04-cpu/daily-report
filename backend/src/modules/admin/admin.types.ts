import { z } from 'zod'

// 신규 사용자 — 비밀번호는 서버에서 0000 으로 고정 생성
export const createUserSchema = z.object({
  employeeNo: z.string().min(1).max(50),
  name:       z.string().min(1).max(50),
  role:       z.enum(['ADMIN', 'TEAM_LEAD', 'MEMBER']),
  team:       z.string().min(1).max(50),
  email:      z.string().email().optional().nullable(),
})

export const updateUserSchema = z.object({
  name:     z.string().min(1).max(50).optional(),
  role:     z.enum(['ADMIN', 'TEAM_LEAD', 'MEMBER']).optional(),
  team:     z.string().min(1).max(50).optional(),
  email:    z.string().email().optional().nullable(),
  isActive: z.boolean().optional(),
})

export type CreateUserDto = z.infer<typeof createUserSchema>
export type UpdateUserDto = z.infer<typeof updateUserSchema>
