<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useModalStore } from '@/stores/modal'
import api from '@/api'

const authStore = useAuthStore()
const modalStore = useModalStore()
const students = ref([])
const isLoading = ref(false)
const showModal = ref(false)
const isEditing = ref(false)
const errorMessage = ref('')

const isSubmitting = ref(false)

// Subject management
const showSubjectModal = ref(false)
const showSubjectFormModal = ref(false)
const selectedStudent = ref(null)
const studentSubjects = ref([])
const isLoadingSubjects = ref(false)
const subjectForm = ref({
  subject: '',
  price: null,
})
const editingSubjectId = ref(null)

import { getLabel, getName } from '@/utils/enumUtils'
import { SUBJECTS } from '@/utils/subjectUtils'

const availableSubjects = computed(() => {
  if (!selectedStudent.value || !studentSubjects.value) return []
  const existingSubjects = studentSubjects.value.map((s) => getName(s.subject))
  return Object.entries(SUBJECTS)
    .filter(([key]) => !existingSubjects.includes(key))
    .map(([key, label]) => ({ value: key, label }))
})

const form = ref({
  studentId: '',
  name: '',
  tel: '',
  age: null,
  memo: '',
  parentTel: '',
})

const fetchStudents = async () => {
  if (!authStore.user?.userId) return

  isLoading.value = true
  try {
    const response = await api.get(`/students?userId=${authStore.user.userId}`)
    const studentsData = response.data.data

    // Fetch subjects for each student
    const studentsWithSubjects = await Promise.all(
      studentsData.map(async (student) => {
        try {
          const subjectsRes = await api.get(
            `/api/student-subject/${student.studentId}/${authStore.user.userId}`,
          )
          const subjects = subjectsRes.data.data || []
          const totalFee = subjects.reduce((sum, subject) => sum + (subject.price || 0), 0)
          return {
            ...student,
            subjects,
            totalFee,
          }
        } catch (error) {
          console.error(`Failed to fetch subjects for student ${student.studentId}:`, error)
          return {
            ...student,
            subjects: [],
            totalFee: 0,
          }
        }
      }),
    )

    students.value = studentsWithSubjects
  } catch (error) {
    console.error('Failed to fetch students:', error)
    await modalStore.alert('학생 목록을 불러오는데 실패했습니다.')
  } finally {
    isLoading.value = false
  }
}

const openCreateModal = () => {
  isEditing.value = false
  form.value = {
    name: '',
    tel: '',
    age: null,
    memo: '',
    parentTel: '',
  }
  showModal.value = true
}

const openEditModal = (student) => {
  isEditing.value = true
  form.value = { ...student }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  errorMessage.value = ''
}

const handleSubmit = async () => {
  if (!form.value.name) {
    errorMessage.value = '이름을 입력해주세요.'
    return
  }

  isSubmitting.value = true

  try {
    if (isEditing.value) {
      await api.put(`/students/${form.value.studentId}/${authStore.user.userId}`, {
        name: form.value.name,
        tel: form.value.tel,
        age: form.value.age,
        memo: form.value.memo,
        parentTel: form.value.parentTel,
      })
      await modalStore.alert('학생 정보가 수정되었습니다.')
    } else {
      await api.post('/students', {
        ...form.value,
        userId: authStore.user.userId,
      })
      await modalStore.alert('학생이 등록되었습니다.')
    }
    closeModal()
    fetchStudents()
  } catch (error) {
    console.error('Operation failed:', error)
    errorMessage.value = error.response?.data?.message || '작업 중 오류가 발생했습니다.'
  } finally {
    isSubmitting.value = false
  }
}

const handleDelete = async (studentId) => {
  const confirmed = await modalStore.confirm('정말 이 학생을 삭제하시겠습니까?')
  if (!confirmed) return

  try {
    await api.delete(`/students/${studentId}/${authStore.user.userId}`)
    await modalStore.alert('학생이 삭제되었습니다.')
    fetchStudents()
  } catch (error) {
    console.error('Delete failed:', error)
    await modalStore.alert('삭제 중 오류가 발생했습니다.')
  }
}

const formatPhoneNumber = (event, field) => {
  let value = event.target.value.replace(/[^0-9]/g, '')
  if (value.length > 11) value = value.slice(0, 11)

  if (value.length > 3 && value.length <= 7) {
    value = value.replace(/(\d{3})(\d{1,4})/, '$1-$2')
  } else if (value.length >= 8) {
    value = value.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3')
  }

  form.value[field] = value
}

// Subject management functions
const openSubjectModal = async (student) => {
  selectedStudent.value = student
  showSubjectModal.value = true
  await fetchStudentSubjects(student.studentId)
}

const closeSubjectModal = () => {
  showSubjectModal.value = false
  selectedStudent.value = null
  studentSubjects.value = []
  errorMessage.value = ''
}

const openSubjectFormModal = () => {
  editingSubjectId.value = null
  subjectForm.value = { subject: '', price: null }
  errorMessage.value = ''
  showSubjectFormModal.value = true
}

const closeSubjectFormModal = () => {
  showSubjectFormModal.value = false
  subjectForm.value = { subject: '', price: null }
  editingSubjectId.value = null
  errorMessage.value = ''
}

const fetchStudentSubjects = async (studentId) => {
  isLoadingSubjects.value = true
  try {
    console.log('Fetching subjects for studentId:', studentId, 'userId:', authStore.user.userId)
    const response = await api.get(`/api/student-subject/${studentId}/${authStore.user.userId}`)
    console.log('API Response:', response.data)
    const subjects = response.data.data || []
    studentSubjects.value = subjects
    console.log('Student subjects:', studentSubjects.value)

    // Update the main students list to reflect changes in real-time
    const studentIndex = students.value.findIndex((s) => s.studentId === studentId)
    if (studentIndex !== -1) {
      const totalFee = subjects.reduce((sum, subject) => sum + (subject.price || 0), 0)
      students.value[studentIndex] = {
        ...students.value[studentIndex],
        subjects,
        totalFee,
      }
    }
  } catch (error) {
    console.error('Failed to fetch subjects:', error)
    console.error('Error response:', error.response)
    await modalStore.alert('과목 목록을 불러오는데 실패했습니다.')
  } finally {
    isLoadingSubjects.value = false
  }
}

const handleAddSubject = async () => {
  if (!subjectForm.value.subject || !subjectForm.value.price) {
    errorMessage.value = '과목과 수업료를 입력해주세요.'
    return
  }

  isSubmitting.value = true
  try {
    if (editingSubjectId.value) {
      // Update existing subject
      await api.put(`/api/student-subject/${editingSubjectId.value}`, {
        subject: subjectForm.value.subject,
        price: subjectForm.value.price,
      })
      await modalStore.alert('과목이 수정되었습니다.')
    } else {
      // Create new subject
      await api.post('/api/student-subject', {
        studentId: selectedStudent.value.studentId,
        userId: authStore.user.userId,
        subject: subjectForm.value.subject,
        price: subjectForm.value.price,
      })
      await modalStore.alert('과목이 추가되었습니다.')
    }
    closeSubjectFormModal()
    await fetchStudentSubjects(selectedStudent.value.studentId)
  } catch (error) {
    console.error('Subject operation failed:', error)
    errorMessage.value = error.response?.data?.message || '작업 중 오류가 발생했습니다.'
  } finally {
    isSubmitting.value = false
  }
}

const handleEditSubject = (subject) => {
  editingSubjectId.value = subject.studentSubjectId
  subjectForm.value = {
    subject: subject.subject,
    price: subject.price,
  }
  showSubjectFormModal.value = true
}

const handleDeleteSubject = async (subjectId) => {
  const confirmed = await modalStore.confirm('정말 이 과목을 삭제하시겠습니까?')
  if (!confirmed) return

  try {
    await api.delete(`/api/student-subject/${subjectId}`)
    await modalStore.alert('과목이 삭제되었습니다.')
    await fetchStudentSubjects(selectedStudent.value.studentId)
  } catch (error) {
    console.error('Delete subject failed:', error)
    await modalStore.alert('삭제 중 오류가 발생했습니다.')
  }
}

const formatPrice = (price) => {
  return new Intl.NumberFormat('ko-KR').format(price)
}

onMounted(() => {
  fetchStudents()
})
</script>

<template>
  <div class="students-view">
    <div class="page-header">
      <h2>학생 관리</h2>
      <button class="btn btn-primary" @click="openCreateModal">
        <span class="icon">+</span> 학생 등록
      </button>
    </div>

    <div v-if="isLoading" class="loading">로딩 중...</div>

    <div v-else-if="students.length === 0" class="empty-state">
      <p>등록된 학생이 없습니다.</p>
    </div>

    <div v-else class="students-grid">
      <div
        v-for="student in students"
        :key="student.studentId"
        class="student-card card card-hover"
      >
        <div class="card-header">
          <div class="header-left">
            <h3>{{ student.name }}</h3>
            <div v-if="student.subjects && student.subjects.length > 0" class="subject-info-inline">
              <span
                v-for="subject in student.subjects"
                :key="subject.studentSubjectId"
                class="subject-badge-inline"
              >
                {{ getLabel(subject.subject) }}
              </span>
              <span class="fee-inline">₩{{ formatPrice(student.totalFee) }}</span>
            </div>
          </div>
          <span class="student-id">ID: {{ student.studentId }}</span>
        </div>
        <div class="card-body">
          <p v-if="student.age"><strong>나이:</strong> {{ student.age }}세</p>
          <p v-if="student.tel"><strong>연락처:</strong> {{ student.tel }}</p>
          <p v-if="student.parentTel"><strong>부모님:</strong> {{ student.parentTel }}</p>
          <p v-if="student.memo" class="memo"><strong>메모:</strong> {{ student.memo }}</p>
        </div>
        <div class="card-footer">
          <button class="btn btn-info btn-subjects" @click="openSubjectModal(student)">
            📚 과목
          </button>
          <button class="btn btn-secondary btn-edit" @click="openEditModal(student)">수정</button>
          <button class="btn btn-danger btn-delete" @click="handleDelete(student.studentId)">
            삭제
          </button>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="!isSubmitting && closeModal()">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">{{ isEditing ? '학생 정보 수정' : '새 학생 등록' }}</h3>
        </div>

        <div v-if="isSubmitting" class="progress-bar">
          <div class="progress-value"></div>
        </div>

        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label>이름 <span class="required">*</span></label>
            <input
              v-model="form.name"
              type="text"
              placeholder="이름 입력"
              required
              :disabled="isSubmitting"
            />
          </div>

          <div class="form-group">
            <label>나이</label>
            <input
              v-model="form.age"
              type="number"
              placeholder="나이 입력"
              :disabled="isSubmitting"
            />
          </div>

          <div class="form-group">
            <label>연락처</label>
            <input
              :value="form.tel"
              @input="(e) => formatPhoneNumber(e, 'tel')"
              type="tel"
              placeholder="010-0000-0000"
              maxlength="13"
              :disabled="isSubmitting"
            />
          </div>

          <div class="form-group">
            <label>부모님 연락처</label>
            <input
              :value="form.parentTel"
              @input="(e) => formatPhoneNumber(e, 'parentTel')"
              type="tel"
              placeholder="010-0000-0000"
              maxlength="13"
              :disabled="isSubmitting"
            />
          </div>

          <div class="form-group">
            <label>메모</label>
            <textarea
              v-model="form.memo"
              placeholder="특이사항 등 메모"
              :disabled="isSubmitting"
            ></textarea>
          </div>

          <div v-if="errorMessage" class="error-message">
            {{ errorMessage }}
          </div>

          <div class="modal-actions">
            <button
              type="button"
              class="btn btn-secondary btn-full"
              @click="closeModal"
              :disabled="isSubmitting"
            >
              취소
            </button>
            <button type="submit" class="btn btn-primary btn-full" :disabled="isSubmitting">
              {{ isEditing ? '수정' : '등록' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Subject List Modal -->
    <div
      v-if="showSubjectModal"
      class="modal-overlay"
      @click.self="!isSubmitting && closeSubjectModal()"
    >
      <div class="modal-content modal-medium">
        <div class="modal-header">
          <h3 class="modal-title">{{ selectedStudent?.name }} - 과목 관리</h3>
        </div>

        <div v-if="isLoadingSubjects" class="loading">과목 불러오는 중...</div>

        <div v-else class="subject-list-container">
          <div v-if="!studentSubjects || studentSubjects.length === 0" class="empty-state-small">
            등록된 과목이 없습니다.
          </div>
          <div v-else class="subjects-list">
            <div
              v-for="subject in studentSubjects"
              :key="subject.studentSubjectId"
              class="subject-item"
            >
              <div class="subject-info">
                <span class="subject-name">{{ SUBJECTS[subject.subject] }}</span>
                <span class="subject-price">₩{{ formatPrice(subject.price) }}</span>
              </div>
              <div class="subject-actions">
                <button
                  class="btn btn-sm btn-secondary"
                  @click="handleEditSubject(subject)"
                  :disabled="isSubmitting"
                >
                  수정
                </button>
                <button
                  class="btn btn-sm btn-danger"
                  @click="handleDeleteSubject(subject.studentSubjectId)"
                  :disabled="isSubmitting"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button
            type="button"
            class="btn btn-primary btn-full"
            @click="openSubjectFormModal"
            :disabled="isSubmitting"
          >
            + 과목 추가
          </button>
          <button
            type="button"
            class="btn btn-secondary btn-full"
            @click="closeSubjectModal"
            :disabled="isSubmitting"
          >
            닫기
          </button>
        </div>
      </div>
    </div>

    <!-- Subject Add/Edit Form Modal -->
    <div
      v-if="showSubjectFormModal"
      class="modal-overlay"
      @click.self="!isSubmitting && closeSubjectFormModal()"
    >
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">{{ editingSubjectId ? '과목 수정' : '과목 추가' }}</h3>
        </div>

        <form @submit.prevent="handleAddSubject">
          <div class="form-group">
            <label>과목 <span class="required">*</span></label>
            <select
              v-model="subjectForm.subject"
              required
              :disabled="isSubmitting || !!editingSubjectId"
            >
              <option value="">과목 선택</option>
              <option v-if="editingSubjectId" :value="subjectForm.subject">
                {{ SUBJECTS[subjectForm.subject] }}
              </option>
              <option
                v-else
                v-for="subject in availableSubjects"
                :key="subject.value"
                :value="subject.value"
              >
                {{ subject.label }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>수업료 <span class="required">*</span></label>
            <input
              v-model.number="subjectForm.price"
              type="number"
              placeholder="수업료 입력 (원)"
              required
              :disabled="isSubmitting"
              min="0"
              step="1000"
            />
          </div>

          <div v-if="errorMessage" class="error-message">
            {{ errorMessage }}
          </div>

          <div class="modal-actions">
            <button
              type="button"
              class="btn btn-secondary btn-full"
              @click="closeSubjectFormModal"
              :disabled="isSubmitting"
            >
              취소
            </button>
            <button type="submit" class="btn btn-primary btn-full" :disabled="isSubmitting">
              {{ editingSubjectId ? '수정' : '추가' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.students-view {
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

.students-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.student-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.card-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-main);
  margin: 0;
}

.subject-info-inline {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-top: 0.25rem;
  flex-wrap: wrap;
}

.subject-badge-inline {
  font-size: 0.75rem;
  color: #3b82f6;
  background-color: #dbeafe;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-sm);
  font-weight: 500;
}

.fee-inline {
  font-size: 0.75rem;
  color: #059669;
  background-color: #d1fae5;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-sm);
  font-weight: 600;
}

.student-id {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  background: var(--color-bg-light);
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  white-space: nowrap;
}

.card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.95rem;
  color: var(--color-text-sub);
}

.memo {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px dashed var(--color-border);
  font-size: 0.9rem;
}

.card-footer {
  display: flex;
  gap: 0.5rem;
  margin-top: auto;
}

.btn-edit,
.btn-delete {
  flex: 1;
}

.empty-state {
  text-align: center;
  padding: 4rem;
  color: var(--color-text-muted);
  background: var(--color-bg-light);
  border-radius: var(--radius-lg);
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

/* Subject Management Styles */
.btn-subjects {
  background-color: #3b82f6;
  color: white;
}

.btn-subjects:hover {
  background-color: #2563eb;
}

.btn-info {
  background-color: #06b6d4;
  color: white;
}

.btn-info:hover {
  background-color: #0891b2;
}

.modal-large {
  max-width: 700px;
  max-height: 85vh;
  overflow-y: auto;
}

.modal-medium {
  max-width: 550px;
  max-height: 80vh;
  overflow-y: auto;
}

.subject-list-container {
  padding: 1rem 0;
}

.subject-management {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 1rem 0;
}

.subjects-section,
.subject-form-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.subjects-section h4,
.subject-form-section h4 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text-main);
  margin: 0;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--color-border);
}

.subjects-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.subject-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: var(--color-bg-light);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  transition: all 0.2s;
}

.subject-item:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.subject-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.subject-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-main);
}

.subject-price {
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.subject-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-sm {
  padding: 0.4rem 0.8rem;
  font-size: 0.85rem;
}

.subject-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.form-actions button {
  flex: 1;
}

.empty-state-small {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-muted);
  background-color: var(--color-bg-light);
  border-radius: var(--radius-md);
  font-size: 0.9rem;
}

.card-footer {
  display: grid;
  grid-template-columns: auto 1fr 1fr;
  gap: 0.5rem;
}

@media (max-width: 640px) {
  .card-footer {
    grid-template-columns: 1fr;
  }

  .subject-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .subject-actions {
    width: 100%;
  }

  .subject-actions button {
    flex: 1;
  }
}
</style>
