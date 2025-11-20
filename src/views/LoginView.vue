<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const userId = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMessage = ref('')

const handleLogin = async () => {
  if (!userId.value || !password.value) {
    errorMessage.value = '아이디와 비밀번호를 모두 입력해주세요.'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    await authStore.login(userId.value, password.value)
    router.push('/')
  } catch (error) {
    errorMessage.value = '로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="login-container">
    <div class="login-card">
      <div class="brand-section">
        <h1 class="logo">MyStudent</h1>
        <p class="subtitle">프리미엄 과외 학생 관리 플랫폼</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="userId">아이디</label>
          <input 
            type="text" 
            id="userId" 
            v-model="userId" 
            placeholder="아이디를 입력하세요"
            required
            :disabled="isLoading"
          />
        </div>

        <div class="form-group">
          <label for="password">비밀번호</label>
          <input 
            type="password" 
            id="password" 
            v-model="password" 
            placeholder="비밀번호를 입력하세요"
            required
            :disabled="isLoading"
          />
        </div>

        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <button type="submit" class="btn-primary" :disabled="isLoading">
          <span v-if="isLoading">로그인 중...</span>
          <span v-else>로그인</span>
        </button>
      </form>

      <div class="divider">
        <span>또는</span>
      </div>

      <div class="social-login">
        <button class="btn-kakao" type="button">
          <span class="icon">💬</span> 카카오 로그인
        </button>
      </div>

      <div class="auth-links">
        <a href="#" class="link">비밀번호 찾기</a>
        <span class="separator">|</span>
        <RouterLink to="/signup" class="link">회원가입</RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  padding: 1rem;
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-radius: var(--radius-xl);
  padding: 2.5rem;
  box-shadow: var(--shadow-lg);
  border: 1px solid rgba(255, 255, 255, 0.5);
}

.brand-section {
  text-align: center;
  margin-bottom: 2.5rem;
}

.logo {
  font-size: 2rem;
  font-weight: 800;
  color: var(--color-primary);
  margin-bottom: 0.5rem;
  letter-spacing: -0.5px;
}

.subtitle {
  color: var(--color-text-muted);
  font-size: 0.95rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-main);
}

.form-group input {
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 1rem;
  transition: all 0.2s;
  background: white;
}

.form-group input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.btn-primary {
  margin-top: 0.5rem;
  padding: 0.875rem;
  background-color: var(--color-primary);
  color: white;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 1rem;
  transition: background-color 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error-message {
  color: var(--color-danger);
  font-size: 0.875rem;
  text-align: center;
  background-color: #FEF2F2;
  padding: 0.5rem;
  border-radius: var(--radius-sm);
}

.divider {
  margin: 2rem 0;
  display: flex;
  align-items: center;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid var(--color-border);
}

.divider span {
  padding: 0 1rem;
}

.social-login {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.btn-kakao {
  width: 100%;
  padding: 0.875rem;
  background-color: #FEE500;
  color: #000000;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: opacity 0.2s;
}

.btn-kakao:hover {
  opacity: 0.9;
}

.auth-links {
  margin-top: 2rem;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.link {
  color: var(--color-text-muted);
  transition: color 0.2s;
}

.link:hover {
  color: var(--color-primary);
  text-decoration: underline;
}

.separator {
  color: var(--color-border);
}

/* Responsive Adjustments */
@media (max-width: 480px) {
  .login-container {
    background: white;
    padding: 0;
  }

  .login-card {
    box-shadow: none;
    border: none;
    border-radius: 0;
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
}
</style>
