import axios from 'axios'
import { useUserStore } from '../stores/userStore'

const service = axios.create({
  baseURL: 'http://127.0.0.1:3000',
  timeout: 120000,
})

// 请求拦截：带上Bearer token
service.interceptors.request.use((config) => {
  const userStore = useUserStore()
  if (userStore.token) {
    config.headers.Authorization = `Bearer ${userStore.token}`
  }
  return config
})

// 响应拦截，401跳转登录
service.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const userStore = useUserStore()
      userStore.logout()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default service
