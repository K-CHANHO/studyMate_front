<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/api'

const authStore = useAuthStore()
const studentCount = ref(0)

const fetchDashboardData = async () => {
  if (!authStore.user?.userId) return

  try {
    // Fetch students count
    const studentsRes = await api.get(`/students?userId=${authStore.user.userId}`)
    studentCount.value = studentsRes.data.data.length
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error)
  }
}

onMounted(() => {
  fetchDashboardData()
})
</script>

<template>
  <div class="dashboard">
    <div class="stats-grid">
      <div class="stat-card card card-hover">
        <div class="stat-icon bg-blue">👥</div>
        <div class="stat-info">
          <h3>총 학생 수</h3>
          <p class="stat-value">{{ studentCount }}명</p>
        </div>
      </div>
      <div class="stat-card card card-hover">
        <div class="stat-icon bg-green">📅</div>
        <div class="stat-info">
          <h3>오늘 수업</h3>
          <p class="stat-value">3건</p>
        </div>
      </div>
      <div class="stat-card card card-hover">
        <div class="stat-icon bg-orange">💰</div>
        <div class="stat-info">
          <h3>이번 달 수익</h3>
          <p class="stat-value">₩1,200,000</p>
        </div>
      </div>
      <div class="stat-card card card-hover">
        <div class="stat-icon bg-red">⚠️</div>
        <div class="stat-info">
          <h3>미납 내역</h3>
          <p class="stat-value">1건</p>
        </div>
      </div>
    </div>

    <div class="recent-activity card">
      <h2>최근 활동</h2>
      <div class="activity-list">
        <div class="activity-item" v-for="i in 3" :key="i">
          <div class="activity-icon">📝</div>
          <div class="activity-details">
            <h4>김철수 학생 수업 일지 작성</h4>
            <p>2시간 전</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  border: none; /* Override default card border if needed, or keep it */
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.bg-blue {
  background-color: #e0e7ff;
  color: #4f46e5;
}
.bg-green {
  background-color: #d1fae5;
  color: #10b981;
}
.bg-orange {
  background-color: #fef3c7;
  color: #f59e0b;
}
.bg-red {
  background-color: #fee2e2;
  color: #ef4444;
}

.stat-info h3 {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-main);
}

.recent-activity h2 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  border-radius: var(--radius-md);
  background-color: var(--color-bg-light);
}

.activity-icon {
  width: 36px;
  height: 36px;
  background-color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.activity-details h4 {
  font-size: 0.9rem;
  font-weight: 500;
}

.activity-details p {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}
</style>
