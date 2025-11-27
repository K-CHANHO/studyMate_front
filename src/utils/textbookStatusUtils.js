// TextbookStatus ENUM을 한글로 변환하는 유틸리티

// 백엔드 ENUM에 label이 없을 경우를 위한 폴백 매핑
export const TEXTBOOK_STATUS_LABELS = {
  IN_PROGRESS: '진행중',
  COMPLETED: '완료',
}

/**
 * TextbookStatus를 한글 라벨로 변환
 * @param {Object|String} status - TextbookStatus 객체 또는 ENUM 문자열
 * @returns {String} 한글 라벨
 */
export const getTextbookStatusLabel = (status) => {
  // 백엔드에서 객체로 전달된 경우
  if (status && typeof status === 'object' && status.label) {
    return status.label
  }

  // 문자열로 전달된 경우
  if (typeof status === 'string') {
    return TEXTBOOK_STATUS_LABELS[status] || status
  }

  return status
}
