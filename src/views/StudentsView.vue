<script setup>
import { ref, onMounted } from 'vue'
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
    students.value = response.data.data
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
    studentId: '',
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
      // For creation, we need to generate a studentId or let the user input it.
      // Assuming user inputs it for now based on backend DTO
      if (!form.value.studentId) {
        errorMessage.value = '학생 ID를 입력해주세요.'
        return
      }

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
          <h3>{{ student.name }}</h3>
          <span class="student-id">ID: {{ student.studentId }}</span>
        </div>
        <div class="card-body">
          <p v-if="student.age"><strong>나이:</strong> {{ student.age }}세</p>
          <p v-if="student.tel"><strong>연락처:</strong> {{ student.tel }}</p>
          <p v-if="student.parentTel"><strong>부모님:</strong> {{ student.parentTel }}</p>
          <p v-if="student.memo" class="memo"><strong>메모:</strong> {{ student.memo }}</p>
        </div>
        <div class="card-footer">
          <button class="btn btn-secondary btn-edit" @click="openEditModal(student)">수정</button>
          <button class="btn btn-danger btn-delete" @click="handleDelete(student.studentId)">
            삭제
          </button>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">{{ isEditing ? '학생 정보 수정' : '새 학생 등록' }}</h3>
        </div>

        <form @submit.prevent="handleSubmit">
          <div class="form-group" v-if="!isEditing">
            <label>학생 ID <span class="required">*</span></label>
            <input v-model="form.studentId" type="text" placeholder="고유 ID 입력" required />
          </div>

          <div class="form-group">
            <label>이름 <span class="required">*</span></label>
            <input v-model="form.name" type="text" placeholder="이름 입력" required />
          </div>

          <div class="form-group">
            <label>나이</label>
            <input v-model="form.age" type="number" placeholder="나이 입력" />
          </div>

          <div class="form-group">
            <label>연락처</label>
            <input
              :value="form.tel"
              @input="(e) => formatPhoneNumber(e, 'tel')"
              type="tel"
              placeholder="010-0000-0000"
              maxlength="13"
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
            />
          </div>

          <div class="form-group">
            <label>메모</label>
            <textarea v-model="form.memo" placeholder="특이사항 등 메모"></textarea>
          </div>

          <div v-if="errorMessage" class="error-message">
            {{ errorMessage }}
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary btn-full" @click="closeModal">
              취소
            </button>
            <button type="submit" class="btn btn-primary btn-full">
              {{ isEditing ? '수정' : '등록' }}
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
}

.card-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-main);
}

.student-id {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  background: var(--color-bg-light);
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
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
</style>
