# MyStudent Frontend 프로젝트 규칙

## 프로젝트 개요

- **프레임워크**: Vue 3 (Composition API)
- **빌드 도구**: Vite 7
- **상태 관리**: Pinia
- **라우팅**: Vue Router 4
- **HTTP 클라이언트**: Axios
- **Node 버전**: ^20.19.0 || >=22.12.0

## 코딩 컨벤션

### 1. 파일 구조

- 컴포넌트: `src/components/` (공통 컴포넌트는 `common/` 하위)
- 뷰: `src/views/`
- 스토어: `src/stores/`
- 유틸리티: `src/utils/`
- API: `src/api/index.js`

### 2. Vue 컴포넌트 작성 규칙

- **Composition API 사용 필수** (`<script setup>` 권장)
- 컴포넌트명은 PascalCase (예: `UserProfile.vue`)
- Props는 `defineProps()`로 정의
- Emits는 `defineEmits()`로 정의
- 반응형 데이터는 `ref()` 또는 `reactive()` 사용

### 3. 스토어 (Pinia) 규칙

- 스토어는 `defineStore()` 사용
- Composition API 스타일 (`setup()` 함수) 사용
- 스토어명은 camelCase (예: `useAuthStore`)
- 파일명은 kebab-case (예: `auth.js`)

### 4. API 호출 규칙

- 모든 API 호출은 `src/api/index.js`에서 export된 `api` 인스턴스 사용
- Axios 인터셉터가 자동으로 토큰 추가 및 갱신 처리
- 백엔드 응답은 `CommonResponse<T>` 형태: `response.data.data`로 실제 데이터 접근

### 5. 경로 별칭

- `@/` → `src/` 디렉토리
- 예: `import api from '@/api'`

### 6. 스타일링

- CSS는 컴포넌트별로 `<style scoped>` 사용
- 공통 스타일은 `src/assets/` 디렉토리 활용

### 7. 환경 변수

- `.env` 파일에 `VITE_API_URL` 설정
- 환경 변수는 `import.meta.env.VITE_*` 형태로 접근

### 8. 에러 처리

- API 호출 시 try-catch 사용
- 에러는 console.error로 로깅
- 사용자에게는 적절한 에러 메시지 표시

### 9. 네이밍 규칙

- 변수/함수: camelCase
- 컴포넌트: PascalCase
- 상수: UPPER_SNAKE_CASE
- 파일명: kebab-case (컴포넌트는 PascalCase)

### 10. 백엔드 연동

- 백엔드 API는 `http://localhost:8080` (개발 환경)
- Vite 프록시 설정으로 `/auth`, `/students`, `/schedules` 등 자동 프록시
- JWT 토큰은 localStorage에 저장 (`accessToken`, `refreshToken`)
- 토큰은 Authorization 헤더에 `Bearer {token}` 형태로 전송

## 개발 명령어

- `npm run dev`: 개발 서버 실행
- `npm run build`: 프로덕션 빌드
- `npm run lint`: ESLint 실행 및 자동 수정
- `npm run format`: Prettier로 포맷팅

## 주의사항

- 백엔드와의 데이터 구조 일치 확인 (CommonResponse 패턴)
- 토큰 만료 시 자동 갱신 로직이 인터셉터에 구현되어 있음
- 로그아웃 시 localStorage의 토큰 및 사용자 정보 삭제 필수
