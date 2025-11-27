<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useModalStore } from '@/stores/modal'
import api from '@/api'
import { toDateTimeLocal, formatDate } from '@/utils/dateUtils'
import { getSubjectLabel, getSubjectName } from '@/utils/subjectUtils'

const authStore = useAuthStore()
const modalStore = useModalStore()

// State
const students = ref([])
const selectedStudentId = ref(null)
const selectedTextbookId = ref(null)
const showTextbookModal = ref(false)
const showProgressModal = ref(false)

const textbooks = ref([])
const progressHistory = ref([])
const studentSubjects = ref([])

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
const currentTextbook = computed(() => {
  return textbooks.value.find((t) => t.id === selectedTextbookId.value)
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
      selectStudent(students.value[0].studentId)
    }
  } catch (error) {
    console.error('Failed to fetch students:', error)
  }
}

const fetchStudentSubjects = async (studentId) => {
  try {
    const response = await api.get(`/api/student-subject/${studentId}/${authStore.user.userId}`)
    studentSubjects.value = response.data.data || []
  } catch (error) {
    console.error('Failed to fetch student subjects:', error)
    studentSubjects.value = []
  }
}

const fetchTextbooks = async (studentId) => {
  try {
    const response = await api.get(`/textbooks`, {
      params: {
        studentId,
        userId: authStore.user.userId,
      },
    })
    textbooks.value = response.data.data || []
  } catch (error) {
    console.error('Failed to fetch textbooks:', error)
  }
}

const fetchProgressHistory = async (textbookId) => {
  try {
    const response = await api.get(`/progress/textbook/${textbookId}`)
    progressHistory.value = response.data.data || []
  } catch (error) {
    console.error('Failed to fetch progress history:', error)
  }
}

const selectStudent = (id) => {
  selectedStudentId.value = id
  selectedTextbookId.value = null
  progressHistory.value = []
  fetchStudentSubjects(id)
  fetchTextbooks(id)
}

const selectTextbook = (id) => {
  selectedTextbookId.value = id
  fetchProgressHistory(id)
}

const openTextbookModal = () => {
  const defaultSubject = studentSubjects.value.length > 0 ? studentSubjects.value[0].subject : null
  textbookForm.value = { title: '', subject: defaultSubject, totalUnit: '' }
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

const saveTextbook = async () => {
  try {
    await api.post('/textbooks', {
      studentId: selectedStudentId.value,
      userId: authStore.user.userId,
      title: textbookForm.value.title,
      subject: getSubjectName(textbookForm.value.subject),
      totalUnit: textbookForm.value.totalUnit,
    })

    await fetchTextbooks(selectedStudentId.value)
    showTextbookModal.value = false
    modalStore.alert('교재가 추가되었습니다.')
  } catch (error) {
    console.error('Failed to save textbook:', error)
    modalStore.alert('교재 추가에 실패했습니다.')
  }
}

const saveProgress = async () => {
  try {
    // Convert local datetime string to ISO string with offset
    const toLocalISOString = (dateStr) => {
      if (!dateStr) return null
      const date = new Date(dateStr)
      const offset = date.getTimezoneOffset() * 60000
      const localDate = new Date(date.getTime() - offset)
      return localDate.toISOString().slice(0, 19)
    }

    await api.post('/progress', {
      textbookId: selectedTextbookId.value,
      studentId: selectedStudentId.value,
      userId: authStore.user.userId,
      lessonDate: toLocalISOString(progressForm.value.date),
      unit: progressForm.value.unit,
      pageStart: progressForm.value.pageStart,
      pageEnd: progressForm.value.pageEnd,
      understanding: progressForm.value.understanding,
      memo: progressForm.value.memo,
    })

    await fetchProgressHistory(selectedTextbookId.value)
    // Refresh textbooks to update current unit count
    await fetchTextbooks(selectedStudentId.value)

    showProgressModal.value = false
    modalStore.alert('진도가 기록되었습니다.')
  } catch (error) {
    console.error('Failed to save progress:', error)
    modalStore.alert('진도 기록에 실패했습니다.')
  }
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
              v-for="textbook in textbooks"
              :key="textbook.id"
              class="textbook-card card clickable"
              :class="{ active: selectedTextbookId === textbook.id }"
              @click="selectTextbook(textbook.id)"
            >
              <div class="textbook-header">
                <span class="subject-badge">{{ getSubjectLabel(textbook.subject) }}</span>
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

            <div v-if="textbooks.length === 0" class="empty-textbook">
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
              <div v-for="record in progressHistory" :key="record.progressId" class="timeline-item">
                <div class="timeline-date">
                  <span class="date">{{ formatDate(record.lessonDate) }}</span>
                </div>
                <div class="timeline-content card">
                  <div class="record-header">
                    <span class="unit-badge">{{ record.lessonCount }}회차 - {{ record.unit }}</span>
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

              <div v-if="progressHistory.length === 0" class="empty-history">
                <p>아직 기록된 진도가 없습니다.</p>
              </div>
            </div>
          </div>

          <div v-else-if="textbooks.length > 0" class="select-guide">
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
            <select v-model="textbookForm.subject" required>
              <option v-if="studentSubjects.length === 0" disabled value="">
                등록된 과목이 없습니다
              </option>
              <option
                v-for="subject in studentSubjects"
                :key="subject.studentSubjectId"
                :value="subject.subject"
              >
                {{ getSubjectLabel(subject.subject) }}
              </option>
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
            <button type="submit" class="btn btn-primary" :disabled="studentSubjects.length === 0">
              추가
            </button>
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

/* Responsive Design */
@media (max-width: 1024px) {
  .layout-container {
    flex-direction: column;
  }

  .student-sidebar {
    width: 100%;
    max-height: 200px;
    overflow-y: auto;
    border-right: none;
    border-bottom: 1px solid var(--color-border);
  }

  .student-list {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    padding-bottom: 0.5rem;
  }

  .student-item {
    flex-shrink: 0;
    min-width: 150px;
  }

  .textbook-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }
}

@media (max-width: 768px) {
  .progress-view {
    height: auto;
    min-height: calc(100vh - 80px);
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .section-header h2,
  .section-header h3 {
    font-size: 1.25rem;
  }

  .textbook-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .textbook-card {
    padding: 1rem;
  }

  .timeline {
    padding-left: 0.5rem;
    margin-left: 0.5rem;
  }

  .timeline-item::before {
    left: -1.25rem;
  }

  .select-guide {
    padding: 2rem 1rem;
  }

  .modal-content {
    margin: 1rem;
    padding: 1.5rem;
  }

  .form-row {
    flex-direction: column;
    gap: 0;
  }

  .radio-group {
    flex-direction: column;
    gap: 0.75rem;
  }
}

@media (max-width: 480px) {
  .student-sidebar {
    padding: 1rem;
  }

  .student-item {
    min-width: 120px;
    padding: 0.5rem;
  }

  .student-avatar {
    width: 32px;
    height: 32px;
    font-size: 0.9rem;
  }

  .student-info .name {
    font-size: 0.9rem;
  }

  .student-info .school {
    font-size: 0.75rem;
  }

  .main-content {
    padding-right: 0;
  }

  .section-header h2,
  .section-header h3 {
    font-size: 1.1rem;
  }

  .btn {
    padding: 0.6rem 1rem;
    font-size: 0.9rem;
  }

  .textbook-card h3 {
    font-size: 1rem;
  }

  .subject-badge {
    font-size: 0.7rem;
    padding: 0.15rem 0.4rem;
  }

  .progress-text {
    font-size: 0.8rem;
  }

  .timeline-content {
    padding: 0.75rem;
  }

  .unit-badge {
    font-size: 0.85rem;
  }

  .understanding-badge {
    font-size: 0.75rem;
    padding: 0.15rem 0.5rem;
  }

  .empty-state,
  .empty-textbook,
  .empty-history {
    font-size: 0.9rem;
  }
}
</style>
