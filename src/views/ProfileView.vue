<script setup>
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
</script>

<template>
  <div class="profile-view">
    <h2>내 프로필</h2>

    <div class="profile-card card">
      <div class="profile-header">
        <div class="avatar-large">
          {{ authStore.user?.name?.[0] || 'T' }}
        </div>
        <div class="profile-title">
          <h3>{{ authStore.user?.name || '사용자' }}</h3>
          <span class="role-badge">{{
            authStore.user?.role === 'TEACHER' ? '선생님' : '사용자'
          }}</span>
        </div>
      </div>

      <div class="profile-details">
        <div class="detail-item">
          <label>아이디</label>
          <div class="value">{{ authStore.user?.userId }}</div>
        </div>

        <div class="detail-item">
          <label>이름</label>
          <div class="value">{{ authStore.user?.name }}</div>
        </div>

        <!-- Add more fields if available in the future -->
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-view {
  max-width: 600px;
  margin: 0 auto;
}

h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-main);
  margin-bottom: 2rem;
}

.profile-card {
  /* Redundant styles removed */
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--color-border);
}

.avatar-large {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 700;
}

.profile-title h3 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-main);
  margin-bottom: 0.5rem;
}

.role-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background-color: var(--color-bg-light);
  color: var(--color-primary);
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 600;
}

.profile-details {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-item label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.detail-item .value {
  font-size: 1.1rem;
  color: var(--color-text-main);
  padding: 0.75rem;
  background-color: var(--color-bg-light);
  border-radius: var(--radius-md);
}
</style>
