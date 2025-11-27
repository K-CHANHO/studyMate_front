// 과목 ENUM을 한글로 변환하는 유틸리티

// 백엔드 ENUM에 label이 없을 경우를 위한 폴백 매핑
export const SUBJECTS = {
  KOREAN: '국어',
  ENGLISH: '영어',
  MATH: '수학',
}

/**
 * Subject를 한글 라벨로 변환
 * @param {Object|String} subject - Subject 객체 또는 ENUM 문자열
 * @returns {String} 한글 라벨
 */
export const getSubjectLabel = (subject) => {
  // 백엔드에서 객체로 전달된 경우 (JsonFormat.Shape.OBJECT)
  if (subject && typeof subject === 'object' && subject.label) {
    return subject.label
  }

  // 문자열로 전달된 경우 (기존 방식)
  if (typeof subject === 'string') {
    return SUBJECTS[subject] || subject
  }

  return subject
}

/**
 * Subject의 ENUM 이름 추출
 * @param {Object|String} subject - Subject 객체 또는 ENUM 문자열
 * @returns {String} ENUM 이름 (예: 'MATH')
 */
export const getSubjectName = (subject) => {
  if (subject && typeof subject === 'object' && subject.name) {
    return subject.name
  }
  return subject
}

export const getSubjectOptions = () => {
  return Object.entries(SUBJECTS).map(([value, label]) => ({ value, label }))
}
