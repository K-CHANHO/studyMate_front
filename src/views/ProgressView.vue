<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useModalStore } from '@/stores/modal'
import api from '@/api'
import { toDateTimeLocal, formatDate } from '@/utils/dateUtils'

const authStore = useAuthStore()
const modalStore = useModalStore()

// State
const students = ref([])
const selectedStudentId = ref(null)
const selectedTextbookId = ref(null)
const showTextbookModal = ref(false)
const showProgressModal = ref(false)

// Dummy Data for UI Prototyping
const textbooks = ref([
  {
    id: 1,
    studentId: 1,
    title: '쎈 수학 (상)',
    subject: 'MATH',
    totalUnit: 15,
    currentUnit: 3,
    status: 'IN_PROGRESS', // IN_PROGRESS, COMPLETED
    lastUpdate: '2023-11-25',
  },
  {
    id: 2,
    studentId: 1,
    title: '개념원리 수학 (상)',
    subject: 'MATH',
    totalUnit: 12,
    currentUnit: 5,
    status: 'IN_PROGRESS',
    lastUpdate: '2023-11-26',
  },
  {
    id: 3,
    studentId: 2,
    title: '자이스토리 영어 독해',
    subject: 'ENGLISH',
    totalUnit: 20,
    currentUnit: 2,
    status: 'IN_PROGRESS',
    lastUpdate: '2023-11-24',
  },
])

const progressHistory = ref([
  {
    id: 1,
    textbookId: 1,
    date: '2023-11-25',
    unit: '2. 나머지정리',
    pageStart: 30,
    pageEnd: 35,
    understanding: 'HIGH', // HIGH, MEDIUM, LOW
    memo: '나머지정리 개념 완벽 이해함. 심화 문제 풀이 필요.',
  },
  {
    id: 2,
    textbookId: 1,
    date: '2023-11-20',
    unit: '1. 다항식의 연산',
    pageStart: 10,
    pageEnd: 29,
    understanding: 'MEDIUM',
    memo: '계산 실수가 조금 있음.',
  },
])

// Forms
const textbookForm = ref({
  title: '',
  subject: 'MATH',
  totalUnit: '',
})

const progressForm = ref({
  date: toDateTimeLocal(),
  unit: '',
  pageStart: '',
  pageEnd: '',
  understanding: 'MEDIUM',
  memo: '',
})

// Computed
const currentStudentTextbooks = computed(() => {
  return textbooks.value.filter((t) => t.studentId === selectedStudentId.value)
})

const currentTextbook = computed(() => {
  return textbooks.value.find((t) => t.id === selectedTextbookId.value)
})

const currentProgressList = computed(() => {
  return progressHistory.value
    .filter((p) => p.textbookId === selectedTextbookId.value)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
})

const progressPercentage = (textbook) => {
  if (!textbook.totalUnit || textbook.totalUnit === 0) return 0
  return Math.round((textbook.currentUnit / textbook.totalUnit) * 100)
}

// Methods
const fetchStudents = async () => {
  if (!authStore.user?.userId) return
  try {
    const response = await api.get(`/students?userId=${authStore.user.userId}`)
    students.value = response.data.data
    if (students.value.length > 0) {
      selectedStudentId.value = students.value[0].studentId
    }
  } catch (error) {
    console.error('Failed to fetch students:', error)
  }
}

const selectStudent = (id) => {
  selectedStudentId.value = id
  selectedTextbookId.value = null
}

const selectTextbook = (id) => {
  selectedTextbookId.value = id
}

const openTextbookModal = () => {
  textbookForm.value = { title: '', subject: 'MATH', totalUnit: '' }
  showTextbookModal.value = true
}

const openProgressModal = () => {
  progressForm.value = {
    date: toDateTimeLocal(),
    unit: '',
    pageStart: '',
    pageEnd: '',
    understanding: 'MEDIUM',
    memo: '',
  }
  showProgressModal.value = true
}

const saveTextbook = () => {
  // TODO: API Call
  const newId = Math.max(...textbooks.value.map((t) => t.id)) + 1
  textbooks.value.push({
    id: newId,
    studentId: selectedStudentId.value,
    ...textbookForm.value,
    currentUnit: 0,
    status: 'IN_PROGRESS',
    lastUpdate: new Date().toISOString().split('T')[0],
  })
  showTextbookModal.value = false
  modalStore.alert('교재가 추가되었습니다.')
}

const saveProgress = () => {
  // TODO: API Call
  const newId = Math.max(...progressHistory.value.map((p) => p.id), 0) + 1
  progressHistory.value.unshift({
    id: newId,
    textbookId: selectedTextbookId.value,
    ...progressForm.value,
    date: progressForm.value.date.split('T')[0],
  })

  // Update textbook current unit (simple logic for demo)
  const textbook = textbooks.value.find((t) => t.id === selectedTextbookId.value)
  if (textbook) {
    textbook.currentUnit += 1
    textbook.lastUpdate = new Date().toISOString().split('T')[0]
  }

  showProgressModal.value = false
  modalStore.alert('진도가 기록되었습니다.')
}

const getUnderstandingLabel = (level) => {
  const map = { HIGH: '상', MEDIUM: '중', LOW: '하' }
  return map[level] || level
}

const getUnderstandingColor = (level) => {
  const map = { HIGH: '#10b981', MEDIUM: '#f59e0b', LOW: '#ef4444' }
  return map[level] || '#6b7280'
}

onMounted(() => {
  fetchStudents()
})
</script>

<template>
  <div class="progress-view">
    <div class="layout-container">
      <!-- Left Sidebar: Student List -->
      <aside class="student-sidebar card">
        <h3>학생 목록</h3>
        <ul class="student-list">
          <li
            v-for="student in students"
            :key="student.studentId"
            class="student-item"
            :class="{ active: selectedStudentId === student.studentId }"
            @click="selectStudent(student.studentId)"
          >
            <div class="student-avatar">{{ student.name[0] }}</div>
            <div class="student-info">
              <span class="name">{{ student.name }}</span>
              <span class="school">{{ student.school }}</span>
            </div>
          </li>
        </ul>
      </aside>

      <!-- Main Content -->
      <main class="main-content">
        <div v-if="!selectedStudentId" class="empty-state">
          <p>학생을 선택해주세요.</p>
        </div>

        <div v-else class="content-wrapper">
          <!-- Textbook Section -->
          <section class="section-header">
            <h2>📚 사용 중인 교재</h2>
            <button class="btn btn-primary btn-sm" @click="openTextbookModal">+ 교재 추가</button>
          </section>

          <div class="textbook-grid">
            <div
              v-for="textbook in currentStudentTextbooks"
              :key="textbook.id"
              class="textbook-card card clickable"
              :class="{ active: selectedTextbookId === textbook.id }"
              @click="selectTextbook(textbook.id)"
            >
              <div class="textbook-header">
                <span class="subject-badge">{{ textbook.subject }}</span>
                <span
                  class="status-dot"
                  :class="{ completed: textbook.status === 'COMPLETED' }"
                ></span>
              </div>
              <h3>{{ textbook.title }}</h3>
              <div class="progress-info">
                <div class="progress-bar-bg">
                  <div
                    class="progress-bar-fill"
                    :style="{ width: progressPercentage(textbook) + '%' }"
                  ></div>
                </div>
                <span class="progress-text">{{ progressPercentage(textbook) }}% 완료</span>
              </div>
              <p class="last-update">최근 기록: {{ textbook.lastUpdate }}</p>
            </div>

            <div v-if="currentStudentTextbooks.length === 0" class="empty-textbook">
              <p>등록된 교재가 없습니다.</p>
            </div>
          </div>

          <!-- Progress History Section -->
          <div v-if="selectedTextbookId" class="history-section">
            <div class="section-header">
              <h3>📝 '{{ currentTextbook?.title }}' 진도 기록</h3>
              <button class="btn btn-primary" @click="openProgressModal">+ 진도 기록</button>
            </div>

            <div class="timeline">
              <div v-for="record in currentProgressList" :key="record.id" class="timeline-item">
                <div class="timeline-date">
                  <span class="date">{{ formatDate(record.date) }}</span>
                </div>
                <div class="timeline-content card">
                  <div class="record-header">
                    <span class="unit-badge">{{ record.unit }}</span>
                    <span
                      class="understanding-badge"
                      :style="{
                        backgroundColor: getUnderstandingColor(record.understanding) + '20',
                        color: getUnderstandingColor(record.understanding),
                      }"
                    >
                      이해도 {{ getUnderstandingLabel(record.understanding) }}
                    </span>
                  </div>
                  <div class="record-body">
                    <p class="pages">p.{{ record.pageStart }} ~ p.{{ record.pageEnd }}</p>
                    <p v-if="record.memo" class="memo">{{ record.memo }}</p>
                  </div>
                </div>
              </div>

              <div v-if="currentProgressList.length === 0" class="empty-history">
                <p>아직 기록된 진도가 없습니다.</p>
              </div>
            </div>
          </div>

          <div v-else-if="currentStudentTextbooks.length > 0" class="select-guide">
            <p>👆 진도 기록을 확인할 교재를 선택해주세요.</p>
          </div>
        </div>
      </main>
    </div>

    <!-- Textbook Modal -->
    <div v-if="showTextbookModal" class="modal-overlay" @click.self="showTextbookModal = false">
      <div class="modal-content">
        <h3>새 교재 추가</h3>
        <form @submit.prevent="saveTextbook">
          <div class="form-group">
            <label>과목</label>
            <select v-model="textbookForm.subject">
              <option value="MATH">수학</option>
              <option value="ENGLISH">영어</option>
              <option value="KOREAN">국어</option>
              <option value="SCIENCE">과학</option>
              <option value="SOCIAL">사회</option>
            </select>
          </div>
          <div class="form-group">
            <label>교재명</label>
            <input v-model="textbookForm.title" placeholder="예: 쎈 수학 (상)" required />
          </div>
          <div class="form-group">
            <label>총 단원 수</label>
            <input v-model="textbookForm.totalUnit" type="number" placeholder="예: 15" />
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="showTextbookModal = false">
              취소
            </button>
            <button type="submit" class="btn btn-primary">추가</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Progress Modal -->
    <div v-if="showProgressModal" class="modal-overlay" @click.self="showProgressModal = false">
      <div class="modal-content">
        <h3>진도 기록하기</h3>
        <form @submit.prevent="saveProgress">
          <div class="form-group">
            <label>날짜</label>
            <input v-model="progressForm.date" type="datetime-local" required />
          </div>
          <div class="form-group">
            <label>단원명</label>
            <input v-model="progressForm.unit" placeholder="예: 2. 나머지정리" required />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>시작 페이지</label>
              <input v-model="progressForm.pageStart" type="number" placeholder="30" />
            </div>
            <div class="form-group">
              <label>끝 페이지</label>
              <input v-model="progressForm.pageEnd" type="number" placeholder="35" />
            </div>
          </div>
          <div class="form-group">
            <label>이해도</label>
            <div class="radio-group">
              <label
                ><input type="radio" v-model="progressForm.understanding" value="HIGH" /> 상</label
              >
              <label
                ><input type="radio" v-model="progressForm.understanding" value="MEDIUM" />
                중</label
              >
              <label
                ><input type="radio" v-model="progressForm.understanding" value="LOW" /> 하</label
              >
            </div>
          </div>
          <div class="form-group">
            <label>메모</label>
            <textarea v-model="progressForm.memo" rows="3" placeholder="특이사항 입력"></textarea>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="showProgressModal = false">
              취소
            </button>
            <button type="submit" class="btn btn-primary">저장</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.progress-view {
  height: calc(100vh - 80px); /* Adjust based on header height */
  overflow: hidden;
}

.layout-container {
  display: flex;
  gap: 1.5rem;
  height: 100%;
}

/* Sidebar */
.student-sidebar {
  width: 280px;
  background: white;
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  border-right: 1px solid var(--color-border);
}

.student-list {
  list-style: none;
  padding: 0;
  margin-top: 1rem;
  overflow-y: auto;
}

.student-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 0.5rem;
}

.student-item:hover {
  background-color: var(--color-bg-light);
}

.student-item.active {
  background-color: #eef2ff;
  border-left: 4px solid var(--color-primary);
}

.student-avatar {
  width: 40px;
  height: 40px;
  background-color: var(--color-primary);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.student-info {
  display: flex;
  flex-direction: column;
}

.student-info .name {
  font-weight: 600;
  color: var(--color-text-main);
}

.student-info .school {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

/* Main Content */
.main-content {
  flex: 1;
  overflow-y: auto;
  padding-right: 1rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.textbook-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.textbook-card {
  padding: 1.25rem;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.textbook-card.active {
  border-color: var(--color-primary);
  background-color: #f8fafc;
}

.textbook-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.subject-badge {
  font-size: 0.75rem;
  background-color: #f1f5f9;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  color: var(--color-text-sub);
}

.progress-info {
  margin: 1rem 0;
}

.progress-bar-bg {
  height: 8px;
  background-color: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-bar-fill {
  height: 100%;
  background-color: var(--color-primary);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.85rem;
  color: var(--color-text-sub);
  font-weight: 600;
}

.last-update {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

/* Timeline */
.history-section {
  margin-top: 2rem;
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding-left: 1rem;
  border-left: 2px solid #e2e8f0;
  margin-left: 1rem;
}

.timeline-item {
  position: relative;
}

.timeline-item::before {
  content: '';
  position: absolute;
  left: -1.6rem;
  top: 1rem;
  width: 12px;
  height: 12px;
  background-color: var(--color-primary);
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 0 0 2px #e2e8f0;
}

.timeline-date {
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: var(--color-text-muted);
  font-weight: 500;
}

.timeline-content {
  padding: 1rem;
}

.record-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.unit-badge {
  font-weight: 600;
  color: var(--color-text-main);
}

.understanding-badge {
  font-size: 0.8rem;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-weight: 600;
}

.record-body .pages {
  font-size: 0.95rem;
  color: var(--color-text-sub);
  margin-bottom: 0.25rem;
}

.record-body .memo {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  background-color: #f8fafc;
  padding: 0.5rem;
  border-radius: 4px;
  margin-top: 0.5rem;
}

.select-guide {
  text-align: center;
  padding: 4rem;
  color: var(--color-text-muted);
  background-color: #f8fafc;
  border-radius: var(--radius-lg);
  border: 2px dashed #e2e8f0;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.form-row .form-group {
  flex: 1;
}

.radio-group {
  display: flex;
  gap: 1.5rem;
}

.radio-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}
</style>
