// API 기본 설정 - 환경변수에서 백엔드 서버 주소 가져오기
// Vite에서는 import.meta.env를 사용하여 환경변수에 접근합니다
const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/todos`;

/**
 * HTTP 응답 에러를 처리하는 헬퍼 함수
 * @param {Response} response - Fetch API 응답 객체
 * @returns {Promise<never>} 에러를 throw
 */
async function handleResponseError(response) {
  let errorMessage = `서버 오류 (${response.status})`;
  let errorDetails = null;
  
  try {
    // 응답 본문을 텍스트로 먼저 읽어서 내용 확인
    const responseText = await response.clone().text();
    errorDetails = responseText;
    
    // JSON 형식인지 확인 후 파싱 시도
    try {
      const errorData = JSON.parse(responseText);
      errorMessage = errorData?.message || errorData?.error || errorMessage;
      // 추가 상세 정보가 있으면 포함
      if (errorData?.stack) {
        console.error('서버 에러 상세:', errorData.stack);
      }
    } catch {
      // JSON이 아닌 경우 텍스트 그대로 사용 (처음 200자만)
      if (responseText && responseText.length > 0) {
        errorMessage = responseText.substring(0, 200);
      }
    }
  } catch {
    // 응답 본문 읽기 실패 시 상태 코드에 따른 기본 메시지 사용
    if (response.status === 500) {
      errorMessage = '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    } else if (response.status === 404) {
      errorMessage = '요청한 리소스를 찾을 수 없습니다.';
    } else if (response.status === 400) {
      errorMessage = '잘못된 요청입니다. 입력값을 확인해주세요.';
    } else if (response.status === 401) {
      errorMessage = '인증이 필요합니다.';
    } else if (response.status === 403) {
      errorMessage = '접근 권한이 없습니다.';
    }
  }
  
  // 500 에러인 경우 추가 안내
  if (response.status === 500) {
    errorMessage += '\n\n서버 측 문제일 수 있습니다. 가능한 원인:\n';
    errorMessage += '1. 데이터베이스 연결 문제\n';
    errorMessage += '2. 서버 환경변수 설정 문제\n';
    errorMessage += '3. 서버 코드 오류\n\n';
    errorMessage += 'Heroku 로그를 확인하거나 잠시 후 다시 시도해주세요.';
    
    // 상세 정보가 있으면 콘솔에 출력
    if (errorDetails) {
      console.error('서버 응답 상세:', errorDetails);
    }
  }
  
  throw new Error(errorMessage);
}

// Todo 아이템 타입 (JavaScript에서는 JSDoc으로 타입 힌트 제공)
/**
 * @typedef {Object} TodoItem
 * @property {string} _id - 할일 ID
 * @property {string} title - 할일 제목 (필수)
 * @property {string} [description] - 할일 설명 (선택)
 * @property {Date|string} [dueDate] - 마감일 (선택)
 * @property {boolean} isCompleted - 완료 여부
 * @property {Date|string} [createdAt] - 생성일
 * @property {Date|string} [updatedAt] - 수정일
 */

/**
 * 모든 할일 조회
 * @param {boolean} [isCompleted] - 완료 여부로 필터링 (선택)
 * @returns {Promise<TodoItem[]>} 할일 목록
 */
export const fetchTodos = async (isCompleted = undefined) => {
  try {
    // 쿼리 파라미터 구성
    let url = API_BASE_URL;
    if (isCompleted !== undefined) {
      url += `?isCompleted=${isCompleted}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      await handleResponseError(response);
    }

    // 새 API는 배열을 직접 반환
    const todos = await response.json();
    return todos;
  } catch (error) {
    // 네트워크 에러 처리
    if (
      error instanceof TypeError &&
      (error.message.includes('fetch') ||
        error.message.includes('Failed to fetch') ||
        error.message.includes('network') ||
        error.message.includes('NetworkError'))
    ) {
      throw new Error(
        `백엔드 서버(${API_BASE_URL})에 연결할 수 없습니다.\n\n확인사항:\n1. 인터넷 연결 상태를 확인해주세요\n2. Heroku 서버가 정상 작동 중인지 확인해주세요\n3. 브라우저 개발자 도구의 네트워크 탭에서 에러를 확인해주세요`
      );
    }

    // 기존 에러 메시지가 있으면 그대로 사용
    if (error instanceof Error) {
      console.error('할일 목록 조회 에러:', error);
      throw error;
    }

    console.error('할일 목록 조회 에러:', error);
    throw new Error('알 수 없는 오류가 발생했습니다.');
  }
};

/**
 * 새로운 할일 생성
 * @param {string} title - 할일 제목 (필수)
 * @param {string} [description] - 할일 설명 (선택)
 * @param {Date|string} [dueDate] - 마감일 (선택)
 * @param {boolean} [isCompleted] - 완료 여부 (기본값: false)
 * @returns {Promise<TodoItem>} 생성된 할일
 */
export const createTodo = async (title, description = '', dueDate = null, isCompleted = false) => {
  try {
    // 요청 데이터 구성
    const requestData = {
      title: title.trim(),
    };

    // 선택적 필드 추가
    if (description && description.trim()) {
      requestData.description = description.trim();
    }

    if (dueDate) {
      requestData.dueDate = dueDate instanceof Date ? dueDate.toISOString() : dueDate;
    }

    if (typeof isCompleted === 'boolean') {
      requestData.isCompleted = isCompleted;
    }

    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      await handleResponseError(response);
    }

    // 새 API는 객체를 직접 반환
    const createdTodo = await response.json();
    return createdTodo;
  } catch (error) {
    // 네트워크 에러 처리
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
    }
    console.error('할일 생성 에러:', error);
    throw error;
  }
};

/**
 * 할일 수정 (부분 수정)
 * @param {string} id - 할일 ID
 * @param {Object} updateData - 수정할 데이터
 * @param {string} [updateData.title] - 할일 제목
 * @param {string} [updateData.description] - 할일 설명
 * @param {Date|string} [updateData.dueDate] - 마감일
 * @param {boolean} [updateData.isCompleted] - 완료 여부
 * @returns {Promise<TodoItem>} 수정된 할일
 */
export const updateTodo = async (id, updateData) => {
  try {
    // ID 유효성 검사
    if (!id || id === 'undefined' || id === 'null') {
      throw new Error('유효하지 않은 할일 ID입니다');
    }

    // 요청 데이터 구성 (전달된 필드만 포함)
    const requestData = {};

    if (updateData.title !== undefined) {
      requestData.title = typeof updateData.title === 'string' ? updateData.title.trim() : updateData.title;
    }

    if (updateData.description !== undefined) {
      requestData.description =
        typeof updateData.description === 'string'
          ? updateData.description.trim()
          : updateData.description;
    }

    if (updateData.dueDate !== undefined) {
      requestData.dueDate =
        updateData.dueDate instanceof Date
          ? updateData.dueDate.toISOString()
          : updateData.dueDate;
    }

    if (updateData.isCompleted !== undefined) {
      requestData.isCompleted = Boolean(updateData.isCompleted);
    }

    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      await handleResponseError(response);
    }

    // 새 API는 객체를 직접 반환
    const updatedTodo = await response.json();
    return updatedTodo;
  } catch (error) {
    // 네트워크 에러 처리
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
    }
    console.error('할일 수정 에러:', error);
    throw error;
  }
};

/**
 * 할일 삭제
 * @param {string} id - 할일 ID
 * @returns {Promise<void>}
 */
export const deleteTodo = async (id) => {
  try {
    // ID 유효성 검사
    if (!id || id === 'undefined' || id === 'null') {
      throw new Error('유효하지 않은 할일 ID입니다');
    }

    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'DELETE',
    });

    // DELETE는 204 응답이므로 본문이 없을 수 있음
    if (!response.ok && response.status !== 204) {
      await handleResponseError(response);
    }

    // 204 No Content는 성공
  } catch (error) {
    // 네트워크 에러 처리
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
    }
    console.error('할일 삭제 에러:', error);
    throw error;
  }
};


