// 출석 상태 ENUM을 한글로 변환하는 유틸리티

// 백엔드 ENUM에 label이 없을 경우를 위한 폴백 매핑
export const ATTENDANCE_STATUS = {
  ATTENDED: '출석',
  ABSENT: '결석',
  LATE: '지각',
  EARLY_LEAVE: '조퇴',
}

// 출석 상태별 색상 정보
export const ATTENDANCE_STATUS_COLORS = {
  ATTENDED: { color: '#10b981', bgColor: '#d1fae5' },
  ABSENT: { color: '#ef4444', bgColor: '#fee2e2' },
  LATE: { color: '#f59e0b', bgColor: '#fef3c7' },
  EARLY_LEAVE: { color: '#8b5cf6', bgColor: '#ede9fe' },
}

/**
 * 출석 상태의 ENUM 이름 추출
 * @param {Object|String} status - 출석 상태 객체 또는 ENUM 문자열
 * @returns {String} ENUM 이름 (예: 'ATTENDED')
 */
export const getAttendanceStatusName = (status) => {
  if (status && typeof status === 'object' && status.name) {
    return status.name
  }
  return status
}

/**
 * 출석 상태의 색상 정보 가져오기 (Vue style 바인딩용)
 * @param {Object|String} status - 출석 상태 객체 또는 ENUM 문자열
 * @returns {Object} { color, backgroundColor } CSS 스타일 객체
 */
export const getAttendanceStatusColors = (status) => {
  const statusName = getAttendanceStatusName(status)
  const colors = ATTENDANCE_STATUS_COLORS[statusName] || { color: '#6b7280', bgColor: '#f3f4f6' }
  return {
    color: colors.color,
    backgroundColor: colors.bgColor,
  }
}

