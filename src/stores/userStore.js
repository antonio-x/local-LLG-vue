import { defineStore } from 'pinia'
export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    userId: localStorage.getItem('userId') || '',
    role: localStorage.getItem('role') || '',
    phone: localStorage.getItem('phone') || '',
  }),
  actions: {
    setUser(info) {
      this.token = info.token
      this.userId = info.userId
      this.role = info.role
      this.phone = info.phone
      localStorage.setItem('token', info.token)
      localStorage.setItem('userId', info.userId)
      localStorage.setItem('role', info.role)
      localStorage.setItem('phone', info.phone)
    },
    logout() {
      this.token = ''
      this.userId = ''
      this.role = ''
      this.phone = ''
      localStorage.clear()
    },
  },
})
