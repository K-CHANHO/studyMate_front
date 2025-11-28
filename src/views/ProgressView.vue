<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useModalStore } from '@/stores/modal'
import api from '@/api'
import { toDateTimeLocal, formatDate, toLocalISOString, formatTime } from '@/utils/dateUtils'
import { getLabel, getName } from '@/utils/enumUtils'
import { getUnderstandingColor } from '@/utils/understandingUtils'

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
const schedules = ref([]) // 일정 목록

// Forms
const textbookForm = ref({
  title: '',
  subject: 'MATH',
  totalUnit: '',
})

const progressForm = ref({
  scheduleId: '', // 일정 ID
  date: toDateTimeLocal(),
  unit: '',
  pageStart: '',
  pageEnd: '',
  understanding: 'MEDIUM',
  memo: '',
  homeworks: [], // 숙제 리스트
})

const homeworkForm = ref({
  content: '',
  dueDate: '',
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

const fetchSchedules = async () => {
  console.log('fetchSchedules called, selectedStudentId:', selectedStudentId.value)
  if (!selectedStudentId.value) {
    console.log('No student selected, returning')
    return
  }
  try {
    const today = new Date()
    const start = new Date(today)
    start.setMonth(start.getMonth() - 2)
    const end = new Date(today)
    end.setMonth(end.getMonth() + 1)

    console.log('Fetching schedules with params:', {
      userId: authStore.user.userId,
      start: toLocalISOString(start),
      end: toLocalISOString(end),
    })

    const response = await api.get('/schedules/range', {
      params: {
        userId: authStore.user.userId,
        start: toLocalISOString(start),
        end: toLocalISOString(end),
      },
    })

    console.log('Schedules API response:', response.data.data)

    const filteredSchedules = response.data.data
      .filter((s) => s.studentId === selectedStudentId.value)
      .sort((a, b) => new Date(b.classDate) - new Date(a.classDate))

    console.log('Filtered schedules for student:', filteredSchedules)
    schedules.value = filteredSchedules
  } catch (error) {
    console.error('Failed to fetch schedules:', error)
  }
}

watch(
  () => progressForm.value.scheduleId,
  (newId) => {
    if (newId) {
      const schedule = schedules.value.find((s) => s.scheduleId === newId)
      if (schedule) {
        progressForm.value.date = toDateTimeLocal(new Date(schedule.classDate))
      }
    }
  },
)

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

const openProgressModal = async () => {
  await fetchSchedules()

  progressForm.value = {
    scheduleId: '',
    date: toDateTimeLocal(),
    unit: '',
    pageStart: '',
    pageEnd: '',
    understanding: 'MEDIUM',
    memo: '',
    homeworks: [],
  }
  homeworkForm.value = {
    content: '',
    dueDate: '',
  }
  showProgressModal.value = true
}

const addHomework = () => {
  if (homeworkForm.value.content.trim()) {
    progressForm.value.homeworks.push({
      content: homeworkForm.value.content,
      dueDate: homeworkForm.value.dueDate || null,
    })
    homeworkForm.value = {
      content: '',
      dueDate: '',
    }
  }
}

const removeHomework = (index) => {
  progressForm.value.homeworks.splice(index, 1)
}

const saveTextbook = async () => {
  try {
    await api.post('/textbooks', {
      studentId: selectedStudentId.value,
      userId: authStore.user.userId,
      title: textbookForm.value.title,
      subject: getName(textbookForm.value.subject),
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

    // Convert homework due dates
    const homeworks = progressForm.value.homeworks.map((hw) => ({
      content: hw.content,
      dueDate: hw.dueDate ? toLocalISOString(hw.dueDate) : null,
    }))

    await api.post('/progress', {
      textbookId: selectedTextbookId.value,
      studentId: selectedStudentId.value,
      scheduleId: progressForm.value.scheduleId || null,
      userId: authStore.user.userId,
      lessonDate: toLocalISOString(progressForm.value.date),
      unit: progressForm.value.unit,
      pageStart: progressForm.value.pageStart,
      pageEnd: progressForm.value.pageEnd,
      understanding: progressForm.value.understanding,
      memo: progressForm.value.memo,
      homeworks: homeworks.length > 0 ? homeworks : null,
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

const toggleHomeworkComplete = async (homeworkId, currentStatus) => {
  try {
    await api.put(
      `/homework/${homeworkId}`,
      {
        isCompleted: !currentStatus,
      },
      {
        headers: {
          UserId: authStore.user.userId,
        },
      },
    )

    // Refresh progress history to update UI
    await fetchProgressHistory(selectedTextbookId.value)
  } catch (error) {
    console.error('Failed to update homework:', error)
    modalStore.alert('숙제 상태 변경에 실패했습니다.')
  }
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
                <span class="subject-badge">{{ getLabel(textbook.subject) }}</span>
                <span
                  class="status-dot"
                  :class="{ completed: textbook.status === 'COMPLETED' }"
                  :title="getLabel(textbook.status)"
                ></span>
                <span class="status-text">{{ getLabel(textbook.status) }}</span>
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
                      이해도 {{ getLabel(record.understanding) }}
                    </span>
                  </div>
                  <div class="record-body">
                    <p class="pages">p.{{ record.pageStart }} ~ p.{{ record.pageEnd }}</p>
                    <p v-if="record.memo" class="memo">{{ record.memo }}</p>

                    <!-- 숙제 섹션 -->
                    <div
                      v-if="record.homeworks && record.homeworks.length > 0"
                      class="homework-section-card"
                    >
                      <div class="homework-header">
                        <span class="homework-title">📝 숙제 ({{ record.homeworks.length }})</span>
                      </div>
                      <div class="homework-items">
                        <div
                          v-for="homework in record.homeworks"
                          :key="homework.homeworkId"
                          class="homework-item-card"
                          :class="{ completed: homework.isCompleted }"
                        >
                          <div class="homework-item-content">
                            <button
                              class="homework-checkbox"
                              :class="{ checked: homework.isCompleted }"
                              @click="
                                toggleHomeworkComplete(homework.homeworkId, homework.isCompleted)
                              "
                              :title="homework.isCompleted ? '완료 취소' : '완료 처리'"
                            >
                              <span v-if="homework.isCompleted">✓</span>
                            </button>
                            <span
                              class="homework-text"
                              :class="{ completed: homework.isCompleted }"
                            >
                              {{ homework.content }}
                            </span>
                          </div>
                          <div v-if="homework.dueDate" class="homework-meta">
                            <span class="homework-due"
                              >기한: {{ formatDate(homework.dueDate) }}</span
                            >
                            <span v-if="homework.completedAt" class="homework-completed">
                              완료: {{ formatDate(homework.completedAt) }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
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
                {{ getLabel(subject.subject) }}
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
      <div class="modal-content modal-scrollable">
        <div class="modal-header-fixed">
          <h3>진도 기록하기</h3>
        </div>
        <div class="modal-body-scrollable">
          <form @submit.prevent="saveProgress">
            <div class="form-group">
              <label>수업 일정 선택 <span class="required">*</span></label>
              <select v-model="progressForm.scheduleId" required>
                <option value="" disabled>일정을 선택하세요</option>
                <option
                  v-for="schedule in schedules"
                  :key="schedule.scheduleId"
                  :value="schedule.scheduleId"
                >
                  {{ formatDate(schedule.classDate) }} {{ formatTime(schedule.classDate) }} ({{
                    getLabel(schedule.subject)
                  }})
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>날짜 (자동 입력)</label>
              <input v-model="progressForm.date" type="datetime-local" required readonly />
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
                <label :class="{ 'radio-checked': progressForm.understanding === 'HIGH' }">
                  <input type="radio" v-model="progressForm.understanding" value="HIGH" />
                  <span>상</span>
                </label>
                <label :class="{ 'radio-checked': progressForm.understanding === 'MEDIUM' }">
                  <input type="radio" v-model="progressForm.understanding" value="MEDIUM" />
                  <span>중</span>
                </label>
                <label :class="{ 'radio-checked': progressForm.understanding === 'LOW' }">
                  <input type="radio" v-model="progressForm.understanding" value="LOW" />
                  <span>하</span>
                </label>
              </div>
            </div>
            <div class="form-group">
              <label>메모</label>
              <textarea v-model="progressForm.memo" rows="3" placeholder="특이사항 입력"></textarea>
            </div>

            <!-- 숙제 섹션 -->
            <div class="form-group homework-section">
              <div class="section-header-small">
                <label>📝 숙제</label>
                <button type="button" class="btn btn-sm btn-outline" @click.prevent="addHomework">
                  + 추가
                </button>
              </div>

              <!-- 숙제 입력 폼 -->
              <div v-if="progressForm.homeworks.length < 5" class="homework-input-group">
                <input
                  v-model="homeworkForm.content"
                  type="text"
                  placeholder="숙제 내용을 입력하세요"
                  @keyup.enter="addHomework"
                />
                <input
                  v-model="homeworkForm.dueDate"
                  type="datetime-local"
                  placeholder="제출 기한 (선택)"
                />
                <button type="button" class="btn btn-sm btn-primary" @click="addHomework">
                  추가
                </button>
              </div>

              <!-- 숙제 리스트 -->
              <div v-if="progressForm.homeworks.length > 0" class="homework-list">
                <div
                  v-for="(homework, index) in progressForm.homeworks"
                  :key="index"
                  class="homework-item"
                >
                  <span class="homework-content">{{ homework.content }}</span>
                  <span v-if="homework.dueDate" class="homework-due-date">
                    {{ formatDate(homework.dueDate) }}
                  </span>
                  <button
                    type="button"
                    class="btn-icon"
                    @click="removeHomework(index)"
                    title="삭제"
                  >
                    ×
                  </button>
                </div>
              </div>
              <p v-else class="help-text">
                숙제를 추가하려면 위 입력란에 내용을 입력하고 추가 버튼을 클릭하세요.
              </p>
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
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
  color: var(--color-text-muted);
}

.status-text {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-left: 0.25rem;
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
  flex-wrap: wrap;
}

.radio-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}

.radio-group label input[type='radio'] {
  margin: 0;
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--color-primary);
}

.radio-group label span {
  user-select: none;
  pointer-events: none;
}

/* Modal 스타일 */
.modal-scrollable {
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow: hidden;
}

.modal-header-fixed {
  padding: 1.5rem 1.5rem 1rem;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
  background: white;
}

.modal-header-fixed h3 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text-main);
}

.modal-body-scrollable {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  min-height: 0; /* flex item이 스크롤 가능하도록 */
}

.modal-body-scrollable::-webkit-scrollbar {
  width: 8px;
}

.modal-body-scrollable::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.modal-body-scrollable::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.modal-body-scrollable::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
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
    padding: 0;
    max-height: calc(100vh - 2rem);
  }

  .modal-scrollable {
    max-height: 95vh;
  }

  .modal-header-fixed {
    padding: 1rem;
  }

  .modal-header-fixed h3 {
    font-size: 1.25rem;
  }

  .modal-body-scrollable {
    padding: 1rem;
  }

  .modal-header-fixed h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .modal-body-scrollable {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
  }

  .form-row {
    flex-direction: column;
    gap: 0;
  }

  .radio-group {
    flex-direction: row;
    gap: 1rem;
    justify-content: flex-start;
  }

  .radio-group label {
    flex: 0 0 auto;
    min-width: auto;
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

  .radio-group {
    gap: 0.5rem;
    justify-content: space-between;
  }

  .radio-group label {
    flex: 1;
    justify-content: center;
    padding: 0.75rem 0.5rem;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    background: white;
    transition: all 0.2s;
    min-width: 0;
  }

  .radio-group label:hover {
    background: #f8fafc;
    border-color: var(--color-primary);
  }

  .radio-group label input[type='radio']:checked + span {
    color: var(--color-primary);
    font-weight: 600;
  }

  /* :has() 선택자 대신 클래스 기반 접근 (더 나은 호환성) */
  .radio-group label.radio-checked {
    background: #eef2ff;
    border-color: var(--color-primary);
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

/* 숙제 관련 스타일 */
.homework-section {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e2e8f0;
}

.section-header-small {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.section-header-small label {
  font-weight: 600;
  color: var(--color-text-main);
}

.btn-sm {
  padding: 0.4rem 0.8rem;
  font-size: 0.85rem;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--color-primary);
  color: var(--color-primary);
}

.btn-outline:hover {
  background: var(--color-primary);
  color: white;
}

.homework-input-group {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.homework-input-group input[type='text'] {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 0.9rem;
}

.homework-input-group input[type='datetime-local'] {
  width: 180px;
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 0.9rem;
}

.homework-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.homework-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background-color: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.homework-content {
  flex: 1;
  font-size: 0.9rem;
  color: var(--color-text-main);
}

.homework-due-date {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  padding: 0.25rem 0.5rem;
  background-color: white;
  border-radius: 4px;
}

.btn-icon {
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-icon:hover {
  background-color: #fee2e2;
  color: #dc2626;
}

.help-text {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  font-style: italic;
  margin-top: 0.5rem;
}

/* 진도 기록 카드 내 숙제 스타일 */
.homework-section-card {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.homework-header {
  margin-bottom: 0.75rem;
}

.homework-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-main);
}

.homework-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.homework-item-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  background-color: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s;
}

.homework-item-card.completed {
  background-color: #f0fdf4;
  border-color: #86efac;
}

.homework-item-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.homework-checkbox {
  width: 20px;
  height: 20px;
  min-width: 20px;
  border: 2px solid #cbd5e1;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  color: white;
  font-size: 0.75rem;
  font-weight: bold;
}

.homework-checkbox:hover {
  border-color: var(--color-primary);
  background-color: #eef2ff;
}

.homework-checkbox.checked {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
}

.homework-text {
  flex: 1;
  font-size: 0.9rem;
  color: var(--color-text-main);
  line-height: 1.4;
}

.homework-text.completed {
  text-decoration: line-through;
  color: var(--color-text-muted);
}

.homework-meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-left: 2rem;
  font-size: 0.8rem;
}

.homework-due {
  color: var(--color-text-muted);
}

.homework-completed {
  color: #059669;
  font-weight: 500;
}

@media (max-width: 768px) {
  .homework-input-group {
    flex-direction: column;
  }

  .homework-input-group input[type='datetime-local'] {
    width: 100%;
  }

  .homework-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .homework-due-date {
    align-self: flex-start;
  }
}
</style>
