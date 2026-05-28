export function successResponse<T>(data: T) {
  return { success: true, data }
}

export function errorResponse(code: string, message: string) {
  return { success: false, error: { code, message } }
}
