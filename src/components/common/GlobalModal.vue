<script setup>
import { useModalStore } from '@/stores/modal'

const modalStore = useModalStore()
</script>

<template>
  <div
    v-if="modalStore.isOpen"
    class="modal-overlay"
    @click.self="modalStore.type === 'confirm' ? null : modalStore.handleConfirm()"
  >
    <div class="modal-content alert-modal modal-scrollable">
      <div class="modal-header-fixed">
        <h3 class="modal-title">{{ modalStore.title }}</h3>
      </div>

      <div class="modal-body-scrollable">
        <p>{{ modalStore.message }}</p>
      </div>

      <div class="modal-actions" style="padding: 0 1.5rem 1.5rem; flex-shrink: 0;">
        <button
          v-if="modalStore.type === 'confirm'"
          class="btn btn-secondary btn-full"
          @click="modalStore.handleCancel"
        >
          취소
        </button>
        <button class="btn btn-primary btn-full" @click="modalStore.handleConfirm">확인</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.alert-modal {
  max-width: 400px;
  text-align: center;
}

.modal-header-fixed {
  justify-content: center;
  text-align: center;
}

.modal-body-scrollable {
  color: var(--color-text-sub);
  font-size: 1.05rem;
  line-height: 1.5;
  white-space: pre-wrap;
  text-align: center;
}

.modal-actions {
  justify-content: center;
}
</style>
