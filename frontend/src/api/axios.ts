import axios from 'axios'

// 메모리 내 액세스 토큰 (XSS 방지용 - localStorage 미사용)
let _accessToken: string | null = null

export const getAccessToken = () => _accessToken
export const setAccessToken = (token: string | null) => {
  _accessToken = token
}

export const apiClient = axios.create({
  baseURL: '/api/v1',
  withCredentials: true, // HttpOnly refreshToken 쿠키 전송
})

// 요청 인터셉터: Authorization 헤더 추가
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 응답 인터셉터: 401 시 토큰 갱신 재시도
let isRefreshing = false
let failedQueue: Array<{ resolve: (v: unknown) => void; reject: (e: unknown) => void }> = []

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token)
  })
  failedQueue = []
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // refresh 엔드포인트 자체가 401이면 루프 방지
    if (error.response?.status === 401 && !originalRequest._retry &&
        !originalRequest.url?.includes('/auth/refresh')) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return apiClient(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const { data } = await apiClient.post('/auth/refresh')
        const newToken = data.data.accessToken
        setAccessToken(newToken)
        processQueue(null, newToken)
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        setAccessToken(null)
        // 로그인 페이지로 리다이렉트 (인증 비활성화 모드에서는 AuthContext 가 자동 재로그인하므로 스킵)
        if (import.meta.env.VITE_AUTH_BYPASS !== 'true') {
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)
