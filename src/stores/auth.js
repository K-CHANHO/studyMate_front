import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useRouter } from 'vue-router'
import api from '@/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(JSON.parse(localStorage.getItem('user')) || null)
  const accessToken = ref(localStorage.getItem('accessToken') || null)
  const refreshToken = ref(localStorage.getItem('refreshToken') || null)
  const router = useRouter()

  async function login(userId, password) {
    try {
      const response = await api.post('/auth/login', { 
        userId, 
        password 
      })
      
      // Backend returns CommonResponse<LoginResponse>
      // response.data is CommonResponse
      // response.data.data is LoginResponse
      const loginData = response.data.data

      accessToken.value = loginData.accessToken
      refreshToken.value = loginData.refreshToken
      
      user.value = {
        userId: loginData.userId,
        role: loginData.role
      }

      localStorage.setItem('accessToken', accessToken.value)
      localStorage.setItem('refreshToken', refreshToken.value)
      localStorage.setItem('user', JSON.stringify(user.value))

      return true
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  function logout() {
    accessToken.value = null
    refreshToken.value = null
    user.value = null
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    router.push('/login')
  }

  async function signup(userData) {
    try {
      // Map frontend form data to backend DTO
      const requestData = {
        userId: userData.userId,
        password: userData.password,
        name: userData.name,
        email: userData.email,
        tel: userData.phone // Frontend uses 'phone', backend uses 'tel'
      }

      await api.post('/auth/signup', requestData)
      return true
    } catch (error) {
      console.error('Signup failed:', error)
      throw error
    }
  }

  return {
    user,
    accessToken,
    refreshToken,
    login,
    logout,
    signup
  }
})
