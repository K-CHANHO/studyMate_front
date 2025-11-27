// Understanding ENUM을 한글로 변환하는 유틸리티

// 백엔드 ENUM에 label이 없을 경우를 위한 폴백 매핑
export const UNDERSTANDING_LABELS = {
  HIGH: '상',
  MEDIUM: '중',
  LOW: '하',
}

/**
 * Understanding을 한글 라벨로 변환
 * @param {Object|String} understanding - Understanding 객체 또는 ENUM 문자열
 * @returns {String} 한글 라벨
 */
export const getUnderstandingLabel = (understanding) => {
  // 백엔드에서 객체로 전달된 경우
  if (understanding && typeof understanding === 'object' && understanding.label) {
    return understanding.label
  }

  // 문자열로 전달된 경우
  if (typeof understanding === 'string') {
    return UNDERSTANDING_LABELS[understanding] || understanding
  }

  return understanding
}
