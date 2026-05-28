import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { errorResponse } from '../utils/response'

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    res.status(400).json(
      errorResponse('VALIDATION_ERROR', err.errors.map((e) => e.message).join(', '))
    )
    return
  }

  console.error('[ErrorHandler]', err)
  res.status(500).json(errorResponse('INTERNAL_ERROR', '서버 오류가 발생했습니다.'))
}
