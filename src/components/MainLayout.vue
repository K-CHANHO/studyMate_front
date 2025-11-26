<script setup>
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const isSidebarOpen = ref(false)
const isClassMenuOpen = ref(true) // Default open or closed as preferred

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}

const handleLogout = () => {
  if (confirm('로그아웃 하시겠습니까?')) {
    authStore.logout()
  }
}

// Close sidebar on route change (for mobile)
router.afterEach(() => {
  isSidebarOpen.value = false
})
</script>

<template>
  <div class="layout">
    <!-- Mobile Overlay -->
    <div class="mobile-overlay" v-if="isSidebarOpen" @click="isSidebarOpen = false"></div>

    <aside class="sidebar" :class="{ open: isSidebarOpen }">
      <div class="logo">
        <h2>MyStudent</h2>
      </div>
      <nav class="nav">
        <RouterLink to="/" class="nav-item" active-class="active">
          <span class="icon">📊</span>
          대시보드
        </RouterLink>
        <RouterLink to="/students" class="nav-item" active-class="active">
          <span class="icon">👨‍🎓</span>
          학생 관리
        </RouterLink>

        <!-- Class Management Submenu -->
        <div class="nav-group">
          <button class="nav-item nav-group-toggle" @click="isClassMenuOpen = !isClassMenuOpen">
            <div class="nav-item-content">
              <span class="icon">📚</span>
              수업 관리
            </div>
            <span class="arrow" :class="{ rotated: isClassMenuOpen }">▼</span>
          </button>
          <div class="nav-subitems" v-show="isClassMenuOpen">
            <RouterLink to="/attendance" class="nav-item sub-item" active-class="active">
              <span class="icon">✅</span>
              출석체크
            </RouterLink>
            <RouterLink to="/progress" class="nav-item sub-item" active-class="active">
              <span class="icon">📈</span>
              진도기록
            </RouterLink>
            <RouterLink to="/homework" class="nav-item sub-item" active-class="active">
              <span class="icon">📝</span>
              숙제관리
            </RouterLink>
          </div>
        </div>

        <RouterLink to="/schedule" class="nav-item" active-class="active">
          <span class="icon">📅</span>
          수업 일정
        </RouterLink>
        <RouterLink to="/settings" class="nav-item" active-class="active">
          <span class="icon">⚙️</span>
          설정
        </RouterLink>
      </nav>
      <div class="nav-footer" style="margin-top: auto">
        <button @click="handleLogout" class="nav-item logout-btn">
          <span class="icon">🚪</span>
          로그아웃
        </button>
      </div>
    </aside>
    <main class="main-content">
      <header class="header">
        <div class="header-left">
          <button class="menu-btn" @click="toggleSidebar">
            <span class="icon">☰</span>
          </button>
          <h1 class="page-title">환영합니다, {{ authStore.user?.name || '' }} 선생님!</h1>
        </div>
        <div class="user-profile" @click="router.push('/profile')">
          <div class="avatar">{{ authStore.user?.name?.[0] || 'T' }}</div>
        </div>
      </header>
      <div class="content-area">
        <slot></slot>
      </div>
    </main>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
  background-color: var(--color-bg-light);
}

.mobile-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 40;
  display: none;
}

.sidebar {
  width: 260px;
  background-color: var(--color-bg-white);
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  transition: transform 0.3s ease;
  z-index: 50;
}

.logo {
  margin-bottom: 2rem;
  color: var(--color-primary);
  font-family: 'Outfit', sans-serif;
  font-weight: 700;
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  font-weight: 500;
  transition: all 0.2s ease;
}

.nav-item:hover {
  background-color: var(--color-bg-light);
  color: var(--color-primary);
}

.nav-item.active {
  background-color: var(--color-primary);
  color: white;
}

.nav-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.nav-group-toggle {
  justify-content: space-between;
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: inherit;
}

.nav-item-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.arrow {
  font-size: 0.7rem;
  transition: transform 0.2s;
}

.arrow.rotated {
  transform: rotate(180deg);
}

.nav-subitems {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding-left: 1rem; /* Indent sub-items */
  margin-bottom: 0.5rem;
}

.sub-item {
  font-size: 0.95rem;
  padding: 0.5rem 1rem;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0; /* Prevent flex child overflow */
}

.header {
  height: 64px;
  background-color: var(--color-bg-white);
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.menu-btn {
  display: none;
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--color-text-main);
  padding: 0.25rem;
}

.page-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-main);
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: var(--radius-md);
  transition: background-color 0.2s;
}

.user-profile:hover {
  background-color: var(--color-bg-light);
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.content-area {
  padding: 2rem;
  flex: 1;
  overflow-y: auto;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .mobile-overlay {
    display: block;
  }

  .sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    transform: translateX(-100%);
    box-shadow: var(--shadow-lg);
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .menu-btn {
    display: flex;
  }

  .header {
    padding: 0 1rem;
  }

  .page-title {
    font-size: 1.1rem;
  }

  .user-name {
    display: none; /* Hide name on small screens */
  }

  .content-area {
    padding: 1rem;
  }
}

.logout-btn {
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  font-size: inherit;
}
</style>
