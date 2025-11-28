<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useModalStore } from '@/stores/modal'
import api from '@/api'
import { toDateTimeLocal, toLocalISOString, formatTime } from '@/utils/dateUtils'
import { getLabel, getName } from '@/utils/enumUtils'
import { SUBJECTS } from '@/utils/subjectUtils'
import {
  ATTENDANCE_STATUS,
  ATTENDANCE_STATUS_COLORS,
  getAttendanceStatusName,
  getAttendanceStatusColors,
} from '@/utils/attendanceStatusUtils'

const authStore = useAuthStore()
const modalStore = useModalStore()

const schedules = ref([])
const students = ref([])
const isLoading = ref(false)
const showAttendanceModal = ref(false)
const selectedSchedule = ref(null)
const attendanceForm = ref({
  status: 'ATTENDED',
  checkInTime: '',
  checkOutTime: '',
  memo: '',
})

// ATTENDANCE_STATUS는 utils에서 import

const todaySchedules = computed(() => {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  return schedules.value.filter((schedule) => {
    const scheduleDate = new Date(schedule.classDate).toISOString().split('T')[0]
    return scheduleDate === todayStr
  })
})

const fetchStudents = async () => {
  if (!authStore.user?.userId) return
  try {
    const response = await api.get(`/students?userId=${authStore.user.userId}`)
    students.value = response.data.data
  } catch (error) {
    console.error('Failed to fetch students:', error)
  }
}

const fetchTodaySchedules = async () => {
  if (!authStore.user?.userId) return

  isLoading.value = true
  try {
    const today = new Date()
    const startOfDay = new Date(today.setHours(0, 0, 0, 0))
    const endOfDay = new Date(today.setHours(23, 59, 59, 999))

    const response = await api.get('/schedules/range', {
      params: {
        userId: authStore.user.userId,
        start: toLocalISOString(startOfDay),
        end: toLocalISOString(endOfDay),
      },
    })

    const schedulesData = response.data.data

    // Fetch attendance for each schedule
    const schedulesWithAttendance = await Promise.all(
      schedulesData.map(async (schedule) => {
        try {
          const attendanceRes = await api.get(
            `/attendance/schedule/${schedule.scheduleId}/student/${schedule.studentId}`,
          )
          return {
            ...schedule,
            attendance: attendanceRes.data.data,
          }
        } catch {
          return {
            ...schedule,
            attendance: null,
          }
        }
      }),
    )

    schedules.value = schedulesWithAttendance
  } catch (error) {
    console.error('Failed to fetch schedules:', error)
    await modalStore.alert('오늘의 수업 목록을 불러오는데 실패했습니다.')
  } finally {
    isLoading.value = false
  }
}

const getStudentName = (studentId) => {
  const student = students.value.find((s) => s.studentId === studentId)
  return student ? student.name : studentId
}


const openAttendanceModal = (schedule) => {
  selectedSchedule.value = schedule

  if (schedule.attendance) {
    // Edit existing attendance
    const attendance = schedule.attendance
    attendanceForm.value = {
      status: getAttendanceStatusName(attendance.status),
      checkInTime: attendance.checkInTime
        ? toDateTimeLocal(new Date(attendance.checkInTime))
        : toDateTimeLocal(new Date()),
      checkOutTime: attendance.checkOutTime
        ? toDateTimeLocal(new Date(attendance.checkOutTime))
        : '',
      memo: attendance.memo || '',
    }
  } else {
    // Create new attendance
    attendanceForm.value = {
      status: 'ATTENDED',
      checkInTime: toDateTimeLocal(new Date()),
      checkOutTime: '',
      memo: '',
    }
  }

  showAttendanceModal.value = true
}

const closeAttendanceModal = () => {
  showAttendanceModal.value = false
  selectedSchedule.value = null
  attendanceForm.value = {
    status: 'ATTENDED',
    checkInTime: '',
    checkOutTime: '',
    memo: '',
  }
}

const handleSubmitAttendance = async () => {
  if (!selectedSchedule.value) return

  try {
    const payload = {
      scheduleId: selectedSchedule.value.scheduleId,
      studentId: selectedSchedule.value.studentId,
      userId: authStore.user.userId,
      status: getAttendanceStatusName(attendanceForm.value.status),
      checkInTime: toLocalISOString(attendanceForm.value.checkInTime),
      checkOutTime: toLocalISOString(attendanceForm.value.checkOutTime),
      memo: attendanceForm.value.memo,
    }

    if (selectedSchedule.value.attendance) {
      // Update existing attendance
      await api.put(`/attendance/${selectedSchedule.value.attendance.id}`, {
        status: payload.status,
        checkInTime: payload.checkInTime,
        checkOutTime: payload.checkOutTime,
        memo: payload.memo,
      })
      await modalStore.alert('출석 정보가 수정되었습니다.')
    } else {
      // Create new attendance
      await api.post('/attendance', payload)
      await modalStore.alert('출석 체크가 완료되었습니다.')
    }

    closeAttendanceModal()
    await fetchTodaySchedules()
  } catch (error) {
    console.error('Failed to save attendance:', error)
    await modalStore.alert('출석 체크 중 오류가 발생했습니다.')
  }
}

const handleEndClass = async (schedule) => {
  if (!schedule.attendance) {
    await modalStore.alert('먼저 출석 체크를 해주세요.')
    return
  }

  try {
    const checkOutTime = toLocalISOString(new Date())

    await api.put(`/attendance/${schedule.attendance.id}`, {
      status: getAttendanceStatusName(schedule.attendance.status),
      checkInTime: schedule.attendance.checkInTime,
      checkOutTime: checkOutTime,
      memo: schedule.attendance.memo,
    })

    await modalStore.alert('수업이 종료되었습니다.')
    await fetchTodaySchedules()
  } catch (error) {
    console.error('Failed to end class:', error)
    await modalStore.alert('수업 종료 중 오류가 발생했습니다.')
  }
}

onMounted(async () => {
  await fetchStudents()
  await fetchTodaySchedules()
})
</script>

<template>
  <div class="attendance-view">
    <div class="page-header">
      <h2>📋 오늘의 출석체크</h2>
      <button class="btn btn-primary" @click="fetchTodaySchedules">
        <span class="icon">🔄</span> 새로고침
      </button>
    </div>

    <div v-if="isLoading" class="loading">로딩 중...</div>

    <div v-else-if="todaySchedules.length === 0" class="empty-state">
      <p>오늘 예정된 수업이 없습니다.</p>
    </div>

    <div v-else class="schedule-list">
      <div v-for="schedule in todaySchedules" :key="schedule.scheduleId" class="schedule-card card">
        <div class="schedule-header">
          <div class="schedule-info">
            <h3>{{ getStudentName(schedule.studentId) }}</h3>
            <span class="subject-badge">{{ getLabel(schedule.subject, SUBJECTS) }}</span>
          </div>
          <div class="schedule-time">
            <span class="icon">🕐</span>
            {{ formatTime(schedule.classDate) }}
          </div>
        </div>

        <div class="schedule-body">
          <p v-if="schedule.classLocation"><strong>장소:</strong> {{ schedule.classLocation }}</p>
          <p v-if="schedule.content"><strong>내용:</strong> {{ schedule.content }}</p>
        </div>

        <div class="schedule-footer">
          <div v-if="schedule.attendance" class="attendance-status">
            <div class="status-info">
              <span
                class="status-badge"
                :style="getAttendanceStatusColors(schedule.attendance.status)"
              >
                {{ getLabel(schedule.attendance.status, ATTENDANCE_STATUS) }}
              </span>
              <span v-if="schedule.attendance.checkInTime" class="time-info">
                {{ formatTime(schedule.attendance.checkInTime) }}
              </span>
            </div>
            <div v-if="schedule.attendance.checkOutTime" class="status-info">
              <span class="status-badge" style="color: #6366f1; background-color: #e0e7ff">
                종료
              </span>
              <span class="time-info">
                {{ formatTime(schedule.attendance.checkOutTime) }}
              </span>
            </div>
            <span v-if="schedule.attendance.memo" class="memo-preview">
              {{ schedule.attendance.memo }}
            </span>
          </div>
          <div v-else class="attendance-status"></div>
          <div class="action-buttons">
            <button class="btn btn-primary" @click="openAttendanceModal(schedule)">
              {{ schedule.attendance ? '출석 수정' : '출석 체크' }}
            </button>
            <button
              v-if="schedule.attendance && !schedule.attendance.checkOutTime"
              class="btn btn-success"
              @click="handleEndClass(schedule)"
            >
              수업 종료
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Attendance Modal -->
    <div v-if="showAttendanceModal" class="modal-overlay" @click.self="closeAttendanceModal">
      <div class="modal-content modal-scrollable">
        <div class="modal-header-fixed">
          <h3 class="modal-title">출석 체크</h3>
        </div>

        <div class="modal-body-scrollable">
          <form @submit.prevent="handleSubmitAttendance">
          <div class="form-group">
            <label>출석 상태 <span class="required">*</span></label>
            <div class="status-buttons">
              <button
                v-for="(label, status) in ATTENDANCE_STATUS"
                :key="status"
                type="button"
                class="status-btn"
                :class="{ active: getAttendanceStatusName(attendanceForm.status) === status }"
                :style="{
                  borderColor:
                    getAttendanceStatusName(attendanceForm.status) === status
                      ? ATTENDANCE_STATUS_COLORS[status].color
                      : 'var(--color-border)',
                  backgroundColor:
                    getAttendanceStatusName(attendanceForm.status) === status
                      ? ATTENDANCE_STATUS_COLORS[status].bgColor
                      : 'transparent',
                  color:
                    getAttendanceStatusName(attendanceForm.status) === status
                      ? ATTENDANCE_STATUS_COLORS[status].color
                      : 'var(--color-text-main)',
                }"
                @click="attendanceForm.status = status"
              >
                {{ label }}
              </button>
            </div>
          </div>

          <div class="form-group">
            <label>등원 시간</label>
            <input v-model="attendanceForm.checkInTime" type="datetime-local" />
          </div>

          <div class="form-group">
            <label>하원 시간</label>
            <input v-model="attendanceForm.checkOutTime" type="datetime-local" />
          </div>

          <div class="form-group">
            <label>메모</label>
            <textarea
              v-model="attendanceForm.memo"
              placeholder="특이사항이나 사유를 입력하세요"
              rows="3"
            ></textarea>
          </div>

            <div class="modal-actions" style="margin-top: 0;">
              <button type="button" class="btn btn-secondary btn-full" @click="closeAttendanceModal">
                취소
              </button>
              <button type="submit" class="btn btn-primary btn-full">저장</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.attendance-view {
  padding: 1rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.page-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-main);
}

.loading {
  text-align: center;
  padding: 4rem;
  color: var(--color-text-muted);
}

.empty-state {
  text-align: center;
  padding: 4rem;
  color: var(--color-text-muted);
  background: var(--color-bg-light);
  border-radius: var(--radius-lg);
}

.schedule-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.schedule-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: transform 0.2s;
}

.schedule-card:hover {
  transform: translateY(-2px);
}

.schedule-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.schedule-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.schedule-info h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-main);
  margin: 0;
}

.subject-badge {
  font-size: 0.85rem;
  color: var(--color-primary);
  background-color: #eef2ff;
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-sm);
  font-weight: 500;
}

.schedule-time {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-text-sub);
}

.schedule-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.95rem;
  color: var(--color-text-sub);
}

.schedule-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.attendance-status {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.status-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-badge {
  padding: 0.35rem 0.85rem;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 0.9rem;
}

.time-info {
  font-size: 0.85rem;
  color: var(--color-text-sub);
  font-weight: 500;
}

.memo-preview {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  font-style: italic;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.btn-success {
  background-color: #10b981;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-success:hover {
  background-color: #059669;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.status-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.status-btn {
  padding: 0.75rem;
  border: 2px solid;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  background: transparent;
}

.status-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.status-btn.active {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

@media (max-width: 768px) {
  .attendance-view {
    padding: 0.5rem;
  }

  .page-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .schedule-header {
    flex-direction: column;
    gap: 0.5rem;
  }

  .schedule-footer {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .status-buttons {
    grid-template-columns: 1fr;
  }
}
</style>
