/**
 * ENUM 데이터 처리 공통 유틸리티
 * 백엔드에서 {name, label} 형태로 오는 데이터와 기존 문자열 데이터를 모두 처리합니다.
 */

/**
 * ENUM의 표시 라벨(한글)을 가져옵니다.
 * @param {Object|String} value - 백엔드 데이터 (객체 또는 문자열)
 * @param {Object} [fallbackMap] - (선택) 백엔드가 문자열만 보낼 경우를 대비한 매핑 객체
 * @returns {String} 한글 라벨
 */
export const getLabel = (value, fallbackMap = {}) => {
  // 1. 백엔드에서 객체({name, label})로 보낸 경우 (권장)
  if (value && typeof value === 'object' && value.label) {
    return value.label
  }

  // 2. 문자열로 온 경우, fallbackMap에서 찾거나 그대로 반환
  if (typeof value === 'string') {
    return fallbackMap[value] || value
  }

  return value || ''
}

/**
 * 서버로 전송하기 위해 ENUM의 코드값(name)을 추출합니다.
 * @param {Object|String} value
 * @returns {String} ENUM name (예: 'MATH')
 */
export const getName = (value) => {
  if (value && typeof value === 'object' && value.name) {
    return value.name
  }
  return value
}
