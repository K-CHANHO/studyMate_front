<script setup>
import { ref, onMounted, watch } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import { useAuthStore } from '@/stores/auth'
import { useModalStore } from '@/stores/modal'
import api from '@/api'
import { getLabel, getName } from '@/utils/enumUtils'
import { SUBJECTS } from '@/utils/subjectUtils'

const authStore = useAuthStore()
const calendarRef = ref(null)

const fetchEvents = async (info, successCallback, failureCallback) => {
  if (!authStore.user?.userId) {
    failureCallback(new Error('User not logged in'))
    return
  }

  try {
    const toLocalISO = (date) => {
      const offset = date.getTimezoneOffset() * 60000
      return new Date(date.getTime() - offset).toISOString().slice(0, 19)
    }

    const startStr = toLocalISO(info.start)
    const endStr = toLocalISO(info.end)

    const response = await api.get('/schedules/range', {
      params: {
        userId: authStore.user.userId,
        start: startStr,
        end: endStr,
      },
    })

    // Ensure students are loaded to map ID to Name
    if (students.value.length === 0) {
      await fetchStudents()
    }

    const events = response.data.data.map((schedule) => {
      const student = students.value.find((s) => s.studentId === schedule.studentId)
      const studentName = student ? student.name : schedule.studentId

      return {
        id: schedule.scheduleId,
        title: `${studentName} - ${getLabel(schedule.subject, SUBJECTS)}`,
        start: schedule.classDate,
        end: new Date(new Date(schedule.classDate).getTime() + 60 * 60 * 1000).toISOString(),
        extendedProps: {
          scheduleId: schedule.scheduleId,
          content: schedule.content,
          location: schedule.classLocation,
          studentId: schedule.studentId,
          studentName: studentName,
          subject: schedule.subject,
          subjectLabel: getLabel(schedule.subject, SUBJECTS),
        },
      }
    })

    successCallback(events)
  } catch (error) {
    console.error('Failed to fetch schedules:', error)
    failureCallback(error)
  }
}

const calendarOptions = ref({
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
  initialView: window.innerWidth < 768 ? 'listWeek' : 'dayGridMonth',
  headerToolbar: false, // Disable default toolbar to use custom one
  locale: 'ko',
  views: {
    dayGridMonth: {
      displayEventTime: false,
      dayMaxEvents: false, // 일정 개수 제한 없음
      moreLinkClick: 'popover', // 더보기 클릭 시 팝오버
    },
  },
  events: fetchEvents,
  eventClick: (info) => {
    const props = info.event.extendedProps
    selectedEvent.value = {
      title: info.event.title,
      start: info.event.start,
      extendedProps: props,
      studentName: props.studentName,
      subjectLabel: props.subjectLabel,
    }
    showDetailModal.value = true
  },
  selectable: false, // 자동 선택 비활성화 (수동으로 클래스 관리)
  unselectAuto: false, // 자동 선택 해제 비활성화
  nowIndicator: true,
  height: 'auto',
  windowResize: (arg) => {
    if (arg.view.type === 'timeGridWeek' && window.innerWidth < 768) {
      arg.view.calendar.changeView('listWeek')
      currentView.value = 'listWeek'
    }
  },
  dayCellContent: (arg) => {
    return { html: arg.dayNumberText.replace('일', '') }
  },
  dayCellClassNames: (arg) => {
    // 선택된 날짜에만 fc-day-selected 클래스 추가
    if (selectedDate.value) {
      // 날짜를 YYYY-MM-DD 형식으로 변환 (시간대 무시)
      const cellDate = new Date(arg.date)
      const cellYear = cellDate.getFullYear()
      const cellMonth = String(cellDate.getMonth() + 1).padStart(2, '0')
      const cellDay = String(cellDate.getDate()).padStart(2, '0')
      const cellDateStr = `${cellYear}-${cellMonth}-${cellDay}`

      if (cellDateStr === selectedDate.value) {
        return ['fc-day-selected']
      }
    }
    return []
  },
  dateClick: (arg) => {
    // 날짜 클릭 시 선택된 날짜 저장 (YYYY-MM-DD 형식)
    const clickedDate = arg.dateStr

    if (selectedDate.value === clickedDate) {
      // 같은 날짜를 다시 클릭하면 선택 해제
      selectedDate.value = null
    } else {
      // 새 날짜 선택
      selectedDate.value = clickedDate
    }

    // FullCalendar가 클래스를 자동으로 업데이트하도록 렌더링
    if (calendarRef.value) {
      calendarRef.value.getApi().render()
    }
  },
  datesSet: (arg) => {
    currentTitle.value = arg.view.title
    // 뷰가 변경되면 선택된 날짜 초기화 (다른 달로 이동하면 선택 해제)
    selectedDate.value = null
  },
  noEventsContent: '수업이 없습니다.',
})

const currentView = ref(window.innerWidth < 768 ? 'listWeek' : 'dayGridMonth')
const currentTitle = ref('')
const showModal = ref(false)
const showDetailModal = ref(false)
const selectedEvent = ref(null)
const selectedDate = ref(null) // 선택된 날짜 저장
const students = ref([])
const modalStore = useModalStore()

// watch는 제거 - dateClick에서 직접 처리

const closeDetailModal = () => {
  showDetailModal.value = false
  selectedEvent.value = null
}

const formatDateTime = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const form = ref({
  subject: 'KOREAN',
  studentId: '',
  classDate: '',
  classTime: '',
  classLocation: '',
  content: '',
})

const studentSubjects = ref([])

// Fetch subjects for a given student
const loadStudentSubjects = async (studentId) => {
  if (!authStore.user?.userId) return
  try {
    const response = await api.get(`/api/student-subject/${studentId}/${authStore.user.userId}`)
    // response data is an array of subject objects
    studentSubjects.value = response.data.data || []
  } catch (error) {
    console.error(`Failed to fetch subjects for student ${studentId}:`, error)
    studentSubjects.value = []
  }
}

// Watch for changes in selected student ID to load subjects
watch(
  () => form.value.studentId,
  (newStudentId) => {
    if (newStudentId) {
      loadStudentSubjects(newStudentId)
    } else {
      studentSubjects.value = []
    }
  },
)

// Set default subject when studentSubjects are loaded
watch(
  () => studentSubjects.value,
  (newSubs) => {
    if (newSubs.length > 0) {
      // If current subject is not in the new list, reset to first
      const current = form.value.subject
      const currentSubjectName = typeof current === 'string' ? current : getName(current)
      const exists = newSubs.find((s) => getName(s.subject) === currentSubjectName)
      // 첫 번째 과목을 기본값으로 설정
      form.value.subject = exists ? current : getName(newSubs[0].subject)
    } else {
      form.value.subject = ''
    }
  },
)

const fetchStudents = async () => {
  if (!authStore.user?.userId) return
  try {
    const response = await api.get(`/students?userId=${authStore.user.userId}`)
    students.value = response.data.data
  } catch (error) {
    console.error('Failed to fetch students:', error)
  }
}

onMounted(() => {
  fetchStudents()
})

const changeView = (viewName) => {
  const calendarApi = calendarRef.value.getApi()
  calendarApi.changeView(viewName)
  currentView.value = viewName
}

const goPrev = () => {
  const calendarApi = calendarRef.value.getApi()
  calendarApi.prev()
}

const goNext = () => {
  const calendarApi = calendarRef.value.getApi()
  calendarApi.next()
}

const goToday = () => {
  const calendarApi = calendarRef.value.getApi()
  calendarApi.today()
}

const isEditing = ref(false)
const isLoading = ref(false)

const openCreateModal = () => {
  isEditing.value = false
  // 선택된 날짜가 있으면 그 날짜 사용, 없으면 오늘 날짜 사용
  let dateStr
  if (selectedDate.value) {
    dateStr = selectedDate.value
  } else {
    const now = new Date()
    dateStr = now.toISOString().split('T')[0]
  }
  const timeStr = new Date().toTimeString().slice(0, 5)

  form.value = {
    subject: '', // 과목은 학생 선택 후 첫 번째 과목으로 자동 설정됨
    studentId: students.value.length > 0 ? students.value[0].studentId : '',
    classDate: dateStr,
    classTime: timeStr,
    classLocation: '',
    content: '',
  }
  // Load subjects for the default student
  if (form.value.studentId) {
    loadStudentSubjects(form.value.studentId)
  }
  showModal.value = true
}

const openEditModal = async () => {
  if (!selectedEvent.value) return

  isEditing.value = true
  const event = selectedEvent.value
  const props = event.extendedProps

  // Parse date and time from event start
  const start = new Date(event.start)
  // Adjust for timezone offset to get local date string correctly
  const offset = start.getTimezoneOffset() * 60000
  const localDate = new Date(start.getTime() - offset)
  const dateStr = localDate.toISOString().split('T')[0]
  const timeStr = localDate.toISOString().split('T')[1].slice(0, 5)

  // Load subjects for the student of this schedule
  if (props.studentId) {
    await loadStudentSubjects(props.studentId)
  }

  // Find student ID from name (This is tricky if we only have name, but we have studentId in extendedProps? No, we didn't put it there.
  // We need to put studentId in extendedProps in fetchEvents first!
  // Let's assume we will update fetchEvents to include studentId in extendedProps.
  // Wait, we need to do that first or now.
  // I will update fetchEvents in a separate call or assume it's there.
  // Actually, let's check fetchEvents. It puts studentName and subjectLabel. It DOES NOT put studentId.
  // I must update fetchEvents to include studentId.

  // For now let's write the logic assuming studentId is available in extendedProps.
  // I will update fetchEvents in the next step.

  form.value = {
    id: props.scheduleId,
    subject: props.subject,
    studentId: props.studentId,
    classDate: dateStr,
    classTime: timeStr,
    classLocation: props.location || '',
    content: props.content || '',
  }

  closeDetailModal()
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  isEditing.value = false
}

const handleSubmit = async () => {
  if (!form.value.studentId) {
    await modalStore.alert('학생을 선택해주세요.')
    return
  }
  if (!form.value.classDate || !form.value.classTime) {
    await modalStore.alert('날짜와 시간을 입력해주세요.')
    return
  }

  isLoading.value = true

  try {
    const dateTime = `${form.value.classDate}T${form.value.classTime}:00`

    const payload = {
      subject: form.value.subject,
      studentId: form.value.studentId,
      userId: authStore.user.userId,
      classDate: dateTime,
      classLocation: form.value.classLocation,
      content: form.value.content,
    }

    if (isEditing.value && form.value.id) {
      await api.put(`/schedules/${form.value.id}`, payload)
      await modalStore.alert('수업 일정이 수정되었습니다.')
    } else {
      await api.post('/schedules', payload)
      await modalStore.alert('수업 일정이 등록되었습니다.')
    }

    closeModal()
    // Refresh calendar
    const calendarApi = calendarRef.value.getApi()
    calendarApi.refetchEvents()
  } catch (error) {
    console.error('Failed to save schedule:', error)
    await modalStore.alert(
      isEditing.value ? '일정 수정에 실패했습니다.' : '일정 등록에 실패했습니다.',
    )
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="schedule-view">
    <div class="custom-header">
      <!-- Row 1: View Switcher -->
      <div class="view-switcher">
        <button
          class="btn-view"
          :class="{ active: currentView === 'dayGridMonth' }"
          @click="changeView('dayGridMonth')"
        >
          월
        </button>
        <button
          class="btn-view"
          :class="{ active: currentView === 'timeGridWeek' }"
          @click="changeView('timeGridWeek')"
        >
          주
        </button>
        <button
          class="btn-view"
          :class="{ active: currentView === 'listWeek' }"
          @click="changeView('listWeek')"
        >
          목록
        </button>
      </div>

      <!-- Row 2: Title -->
      <h2 class="calendar-title">{{ currentTitle }}</h2>

      <!-- Row 3: Navigation -->
      <div class="nav-buttons">
        <button class="btn-nav" @click="goPrev">
          <span class="icon">‹</span>
        </button>
        <button class="btn-nav" @click="goNext">
          <span class="icon">›</span>
        </button>
      </div>

      <!-- Row 4: Today Button (Right aligned) -->
      <div class="header-actions">
        <button class="btn btn-primary btn-sm" @click="openCreateModal">
          <span class="icon">+</span> 일정 등록
        </button>
        <button class="btn-today" @click="goToday">오늘</button>
      </div>
    </div>

    <div class="calendar-container card">
      <FullCalendar :options="calendarOptions" ref="calendarRef" />
    </div>

    <!-- Create/Edit Schedule Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="!isLoading && closeModal()">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">{{ isEditing ? '수업 일정 수정' : '새 수업 일정 등록' }}</h3>
        </div>

        <div v-if="isLoading" class="progress-bar">
          <div class="progress-value"></div>
        </div>

        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label>학생 <span class="required">*</span></label>
            <select v-model="form.studentId" required :disabled="isLoading">
              <option
                v-for="student in students"
                :key="student.studentId"
                :value="student.studentId"
              >
                {{ student.name }} ({{ student.studentId }})
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>과목 <span class="required">*</span></label>
            <select
              v-model="form.subject"
              required
              :disabled="isLoading || studentSubjects.length === 0"
            >
              <option v-if="studentSubjects.length === 0" value="" disabled>
                학생을 먼저 선택해주세요
              </option>
              <option
                v-for="sub in studentSubjects"
                :key="sub.studentSubjectId"
                :value="getName(sub.subject)"
              >
                {{ getLabel(sub.subject, SUBJECTS) }}
              </option>
            </select>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>날짜 <span class="required">*</span></label>
              <input v-model="form.classDate" type="date" required :disabled="isLoading" />
            </div>
            <div class="form-group">
              <label>시간 <span class="required">*</span></label>
              <input v-model="form.classTime" type="time" required :disabled="isLoading" />
            </div>
          </div>

          <div class="form-group">
            <label>장소</label>
            <input
              v-model="form.classLocation"
              type="text"
              placeholder="수업 장소 (선택)"
              :disabled="isLoading"
            />
          </div>

          <div class="form-group">
            <label>수업 내용</label>
            <textarea
              v-model="form.content"
              placeholder="수업 내용 메모"
              :disabled="isLoading"
            ></textarea>
          </div>

          <div class="modal-actions">
            <button
              type="button"
              class="btn btn-secondary btn-full"
              @click="closeModal"
              :disabled="isLoading"
            >
              취소
            </button>
            <button type="submit" class="btn btn-primary btn-full" :disabled="isLoading">
              {{ isEditing ? '수정' : '등록' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Event Detail Modal -->
    <div v-if="showDetailModal" class="modal-overlay" @click.self="closeDetailModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">수업 상세 정보</h3>
        </div>

        <div class="detail-body" v-if="selectedEvent">
          <div class="detail-item">
            <span class="label">과목</span>
            <span class="value badge">{{ selectedEvent.subjectLabel }}</span>
          </div>

          <div class="detail-item">
            <span class="label">학생</span>
            <span class="value badge">{{ selectedEvent.studentName }}</span>
          </div>

          <div class="detail-item">
            <span class="label">일시</span>
            <span class="value badge">{{ formatDateTime(selectedEvent.start) }}</span>
          </div>

          <div class="detail-item" v-if="selectedEvent.extendedProps.location">
            <span class="label">장소</span>
            <span class="value badge">{{ selectedEvent.extendedProps.location }}</span>
          </div>

          <div class="detail-item content-item" v-if="selectedEvent.extendedProps.content">
            <span class="label">내용</span>
            <div class="value content-box">{{ selectedEvent.extendedProps.content }}</div>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn btn-secondary btn-full" @click="openEditModal">수정</button>
          <button class="btn btn-primary btn-full" @click="closeDetailModal">확인</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.schedule-view {
  padding: 1rem;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.custom-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.view-switcher {
  display: flex;
  background: white;
  padding: 0.25rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
}

.btn-view {
  padding: 0.5rem 1.5rem;
  border: none;
  background: none;
  border-radius: var(--radius-md);
  font-weight: 600;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-view.active {
  background-color: var(--color-primary);
  color: white;
  box-shadow: var(--shadow-sm);
}

.calendar-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--color-text-main);
  font-family: 'Outfit', sans-serif;
}

.nav-buttons {
  display: flex;
  gap: 1rem;
}

.btn-nav {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--color-border);
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--color-text-main);
  font-size: 1.5rem;
  line-height: 1;
}

.btn-nav:hover {
  background-color: var(--color-bg-light);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.today-container {
  width: 100%;
  display: flex;
  justify-content: flex-end;
}

.btn-today {
  padding: 0.5rem 1.25rem;
  background-color: white;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-weight: 600;
  color: var(--color-text-main);
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: var(--shadow-sm);
}

.btn-today:hover {
  background-color: var(--color-bg-light);
  border-color: var(--color-text-muted);
}

.calendar-container {
  flex: 1;
  padding: 1.5rem;
  background: white;
  min-height: 600px;
  /* Ensure card border radius clips content */
  overflow: hidden;
}

/* FullCalendar Customization */
:deep(.fc) {
  font-family: 'Outfit', 'Inter', sans-serif;
  --fc-border-color: var(--color-border);
  --fc-today-bg-color: rgba(79, 70, 229, 0.05);
  --fc-neutral-bg-color: var(--color-bg-light);
}

/* Calendar Grid */
:deep(.fc-theme-standard td),
:deep(.fc-theme-standard th) {
  border-color: var(--color-border);
  overflow: hidden !important;
  position: relative !important;
}

/* 테이블 셀 내부 컨텐츠가 넘치지 않도록 */
:deep(.fc-daygrid-day) {
  overflow: hidden !important;
  contain: layout style paint; /* CSS containment으로 성능 향상 및 격리 */
}

:deep(.fc-col-header-cell) {
  padding: 1rem 0;
  background-color: #f9fafb;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  font-size: 0.85rem;
  border-bottom-width: 0;
}

/* 캘린더 그리드 셀 기본 스타일 */
:deep(.fc-daygrid-day) {
  position: relative !important;
  text-align: left !important;
  overflow: hidden !important;
  isolation: isolate; /* 새로운 stacking context 생성 */
}

:deep(.fc-daygrid-day-frame) {
  padding: 0.25rem !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: flex-start !important;
  height: 100%;
  min-height: 80px;
  overflow: hidden !important;
  position: relative !important;
  box-sizing: border-box !important;
}

/* 일자 숫자를 왼쪽 상단에 고정 */
:deep(.fc-daygrid-day-top) {
  display: flex !important;
  justify-content: flex-start !important;
  align-items: flex-start !important;
  padding: 0.25rem 0.5rem 0.15rem 0.5rem !important;
  width: 100% !important;
  flex-shrink: 0 !important;
  order: 1 !important;
  position: relative !important;
  left: 0 !important;
  right: auto !important;
  text-align: left !important;
}

:deep(.fc-daygrid-day-number) {
  font-size: 0.9rem !important;
  font-weight: 500;
  color: var(--color-text-main);
  padding: 0.15rem 0.4rem !important;
  border-radius: 50%;
  min-width: 24px !important;
  width: 24px !important;
  height: 24px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  text-decoration: none !important;
  margin: 0 !important;
  margin-left: 0 !important;
  margin-right: auto !important;
  position: static !important;
  float: none !important;
  left: 0 !important;
  right: auto !important;
}

/* 일정 리스트 영역 - 최대한 많이 보이도록 */
:deep(.fc-daygrid-day-events) {
  width: 100% !important;
  margin-top: 0.1rem !important;
  padding: 0 !important;
  order: 2 !important;
  flex: 1 !important;
  min-height: 0 !important;
  overflow: hidden !important; /* 넘치는 일정 숨김 */
  display: flex !important;
  flex-direction: column !important;
  align-items: flex-start !important;
}

:deep(.fc-daygrid-event) {
  margin: 1px 0 !important;
  padding: 2px 6px !important;
  font-size: 0.75rem !important;
  line-height: 1.2 !important;
  border-radius: 3px !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  width: calc(100% - 4px) !important;
  max-width: calc(100% - 4px) !important;
  cursor: pointer !important;
  text-align: left !important;
  box-sizing: border-box !important;
}

/* 일정이 날짜 셀을 넘어가지 않도록 */
:deep(.fc-daygrid-day-frame) {
  overflow: hidden !important;
}

:deep(.fc-daygrid-day) {
  overflow: hidden !important;
}

:deep(.fc-daygrid-event:hover) {
  opacity: 0.9;
  transform: translateX(1px);
}

/* 더보기 링크 스타일 */
:deep(.fc-more-link) {
  font-size: 0.7rem !important;
  padding: 2px 4px !important;
  margin-top: 2px !important;
  border-radius: 3px !important;
  text-align: left !important;
  width: calc(100% - 4px) !important;
}

/* 오늘 날짜 스타일 - 선택된 날짜가 아닐 때만 적용 */
:deep(.fc-day-today:not(.fc-day-selected) .fc-daygrid-day-number) {
  background-color: var(--color-primary);
  color: white;
}

/* 선택된 날짜 강조 - 오늘 날짜처럼 원형 배경 (오늘 날짜보다 우선순위 높음) */
:deep(.fc-day-selected) {
  background-color: rgba(79, 70, 229, 0.05) !important;
}

:deep(.fc-day-selected .fc-daygrid-day-frame) {
  background-color: rgba(79, 70, 229, 0.05) !important;
}

:deep(.fc-day-selected .fc-daygrid-day-number) {
  background-color: var(--color-primary) !important;
  color: white !important;
  font-weight: 600 !important;
}

/* 오늘 날짜이면서 선택된 날짜일 때 (선택된 날짜 스타일 우선) */
:deep(.fc-day-today.fc-day-selected .fc-daygrid-day-number) {
  background-color: var(--color-primary) !important;
  color: white !important;
  font-weight: 600 !important;
}

/* Events */
:deep(.fc-event) {
  border-radius: 6px;
  padding: 2px 4px;
  border: none;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  font-size: 0.85rem;
  font-weight: 500;
  margin-top: 2px;
}

:deep(.fc-daygrid-event) {
  background-color: #eef2ff; /* Light Indigo */
  color: var(--color-primary);
  border-left: 3px solid var(--color-primary);
}

:deep(.fc-daygrid-event:hover) {
  background-color: #e0e7ff;
  transform: translateY(-1px);
}

:deep(.fc-timegrid-event) {
  border-radius: var(--radius-md);
}

/* List View */
:deep(.fc-list) {
  border: none;
}

:deep(.fc-list-day-cushion) {
  background-color: #f9fafb;
}

:deep(.fc-list-empty) {
  background-color: white;
  color: var(--color-text-muted);
  font-family: 'Outfit', 'Inter', sans-serif;
  font-size: 1rem;
  padding: 3rem;
  text-align: center;
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .schedule-view {
    padding: 0.5rem;
  }

  .calendar-container {
    padding: 0.75rem;
    min-height: 500px;
  }

  .custom-header {
    gap: 0.75rem;
  }

  .view-switcher {
    width: 100%;
    justify-content: space-around;
    padding: 0.15rem;
  }

  .btn-view {
    padding: 0.4rem 1rem;
    font-size: 0.85rem;
  }

  .calendar-title {
    font-size: 1.25rem;
  }

  .nav-buttons {
    width: 100%;
    justify-content: center;
    gap: 0.5rem;
  }

  .btn-nav {
    width: 36px;
    height: 36px;
    font-size: 1.3rem;
  }

  .today-container {
    justify-content: center;
  }

  .btn-today {
    padding: 0.4rem 1rem;
    font-size: 0.85rem;
  }
}

.header-actions {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  align-items: center;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.form-row .form-group {
  flex: 1;
}

/* Detail Modal Styles */
.detail-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.detail-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  font-size: 0.95rem;
}

.detail-item .label {
  width: 60px;
  font-weight: 600;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.detail-item .value {
  color: var(--color-text-main);
  flex: 1;
  line-height: 1.5;
}

.detail-item .badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background-color: #eef2ff;
  color: var(--color-primary);
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
}

.content-box {
  background-color: var(--color-bg-light);
  padding: 0.75rem;
  border-radius: var(--radius-md);
  white-space: pre-wrap;
  font-size: 0.9rem;
  color: var(--color-text-sub);
}

.progress-bar {
  height: 4px;
  background-color: #e0e7ff;
  overflow: hidden;
  width: 100%;
  margin-bottom: 1rem;
  border-radius: 2px;
}

.progress-value {
  width: 100%;
  height: 100%;
  background-color: var(--color-primary);
  animation: indeterminate 1.5s infinite linear;
  transform-origin: 0% 50%;
}

@keyframes indeterminate {
  0% {
    transform: translateX(0) scaleX(0);
  }
  40% {
    transform: translateX(0) scaleX(0.4);
  }
  100% {
    transform: translateX(100%) scaleX(0.5);
  }
}
</style>
