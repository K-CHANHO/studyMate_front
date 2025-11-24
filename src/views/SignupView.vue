<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const form = ref({
  userId: '',
  name: '',
  password: '',
  passwordConfirm: '',
  phone: ''
})

const isLoading = ref(false)
const errorMessage = ref('')

const isPasswordMatch = computed(() => {
  return form.value.password === form.value.passwordConfirm
})

const handleSignup = async () => {
  if (!isPasswordMatch.value) {
    errorMessage.value = '비밀번호가 일치하지 않습니다.'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    await authStore.signup(form.value)
    alert('회원가입이 완료되었습니다. 로그인해주세요.')
    router.push('/login')
  } catch (error) {
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage.value = error.response.data.message
    } else {
      errorMessage.value = '회원가입 중 오류가 발생했습니다.'
    }
  } finally {
    isLoading.value = false
  }
}

const formatPhoneNumber = (event) => {
  let value = event.target.value.replace(/[^0-9]/g, '')
  
  if (value.length > 11) {
    value = value.slice(0, 11)
  }

  if (value.length > 3 && value.length <= 7) {
    value = value.replace(/(\d{3})(\d{1,4})/, '$1-$2')
  } else if (value.length >= 8) {
    value = value.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3')
  }

  form.value.phone = value
}
</script>

<template>
  <div class="signup-container">
    <div class="signup-card">
      <div class="brand-section">
        <h1 class="logo">MyStudent</h1>
        <p class="subtitle">선생님 회원가입</p>
      </div>

      <form @submit.prevent="handleSignup" class="signup-form">
        <div class="form-group">
          <label for="userId">아이디</label>
          <input 
            type="email" 
            id="userId" 
            v-model="form.userId" 
            placeholder="example@email.com"
            required
            :disabled="isLoading"
          />
        </div>

        <div class="form-group">
          <label for="name">이름</label>
          <input 
            type="text" 
            id="name" 
            v-model="form.name" 
            placeholder="실명을 입력해주세요"
            required
            :disabled="isLoading"
          />
        </div>

        <div class="form-group">
          <label for="phone">핸드폰 번호</label>
          <input 
            type="tel" 
            id="phone" 
            v-model="form.phone" 
            @input="formatPhoneNumber"
            placeholder="010-0000-0000"
            maxlength="13"
            required
            :disabled="isLoading"
          />
        </div>

        <div class="form-group">
          <label for="password">비밀번호</label>
          <input 
            type="password" 
            id="password" 
            v-model="form.password" 
            placeholder="8자 이상 입력해주세요"
            minlength="8"
            required
            :disabled="isLoading"
          />
        </div>

        <div class="form-group">
          <label for="passwordConfirm">비밀번호 확인</label>
          <input 
            type="password" 
            id="passwordConfirm" 
            v-model="form.passwordConfirm" 
            placeholder="비밀번호를 다시 입력해주세요"
            required
            :disabled="isLoading"
            :class="{ 'error-border': form.passwordConfirm && !isPasswordMatch }"
          />
          <span v-if="form.passwordConfirm && !isPasswordMatch" class="error-text">
            비밀번호가 일치하지 않습니다.
          </span>
        </div>

        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <button type="submit" class="btn-primary" :disabled="isLoading">
          <span v-if="isLoading">가입 처리 중...</span>
          <span v-else>가입하기</span>
        </button>
      </form>

      <div class="auth-links">
        <span>이미 계정이 있으신가요?</span>
        <RouterLink to="/login" class="link">로그인하기</RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.signup-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  padding: 2rem 1rem;
}

.signup-card {
  width: 100%;
  max-width: 480px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-radius: var(--radius-xl);
  padding: 2.5rem;
  box-shadow: var(--shadow-lg);
  border: 1px solid rgba(255, 255, 255, 0.5);
}

.brand-section {
  text-align: center;
  margin-bottom: 2rem;
}

.logo {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--color-primary);
  margin-bottom: 0.25rem;
  letter-spacing: -0.5px;
}

.subtitle {
  color: var(--color-text-muted);
  font-size: 1rem;
  font-weight: 500;
}

.signup-form {
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

.form-group input.error-border {
  border-color: var(--color-danger);
}

.error-text {
  font-size: 0.8rem;
  color: var(--color-danger);
}

.btn-primary {
  margin-top: 1rem;
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

.auth-links {
  margin-top: 2rem;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.link {
  color: var(--color-primary);
  font-weight: 600;
  transition: color 0.2s;
}

.link:hover {
  text-decoration: underline;
}

/* Responsive Adjustments */
@media (max-width: 480px) {
  .signup-container {
    background: white;
    padding: 0;
    align-items: flex-start;
  }

  .signup-card {
    box-shadow: none;
    border: none;
    border-radius: 0;
    min-height: 100vh;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
}
</style>
