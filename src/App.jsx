import { useState, useEffect } from 'react';
import { fetchTodos, createTodo, updateTodo, deleteTodo } from './api/todoApi';
import './App.css';

function App() {
  // 할일 목록 상태
  const [todos, setTodos] = useState([]);
  // 새 할일 입력 상태
  const [titleInput, setTitleInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [dueDateInput, setDueDateInput] = useState('');
  // 수정 중인 할일 ID
  const [editingTodoId, setEditingTodoId] = useState(null);
  // 수정 중인 내용
  const [editingData, setEditingData] = useState({ title: '', description: '', dueDate: '', isCompleted: false });
  // 로딩 상태
  const [isLoading, setIsLoading] = useState(false);
  // 에러 메시지
  const [errorMessage, setErrorMessage] = useState('');
  // 필터 상태 (전체/완료/미완료)
  const [filter, setFilter] = useState('all'); // 'all', 'completed', 'pending'

  // 컴포넌트 마운트 시 할일 목록 가져오기
  useEffect(() => {
    loadTodos();
  }, [filter]);

  // 할일 목록 불러오기
  const loadTodos = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      // 필터에 따라 쿼리 파라미터 전달
      let todosData;
      if (filter === 'completed') {
        todosData = await fetchTodos(true);
      } else if (filter === 'pending') {
        todosData = await fetchTodos(false);
      } else {
        todosData = await fetchTodos();
      }
      setTodos(todosData);
    } catch (error) {
      // 에러 메시지 추출
      const errorMessage = error instanceof Error 
        ? error.message 
        : '할일 목록을 불러오는데 실패했습니다.';
      setErrorMessage(errorMessage);
      console.error('할일 목록 로드 에러:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 새 할일 추가
  const handleAddTodo = async (e) => {
    e.preventDefault();
    
    // 입력값 검증
    if (!titleInput.trim()) {
      setErrorMessage('할일 제목을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    try {
      // dueDate 문자열을 Date 객체로 변환
      const dueDate = dueDateInput ? new Date(dueDateInput) : null;
      const newTodo = await createTodo(titleInput, descriptionInput, dueDate, false);
      setTodos([newTodo, ...todos]); // 최신순으로 맨 앞에 추가
      // 입력 필드 초기화
      setTitleInput('');
      setDescriptionInput('');
      setDueDateInput('');
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : '할일 추가에 실패했습니다.';
      setErrorMessage(errorMessage);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // 수정 모드 시작
  const handleStartEdit = (todo) => {
    setEditingTodoId(todo._id);
    // 마감일을 입력 필드 형식으로 변환 (YYYY-MM-DDTHH:mm) - datetime-local 형식
    let dueDateStr = '';
    if (todo.dueDate) {
      const date = new Date(todo.dueDate);
      // 로컬 시간으로 변환하여 datetime-local 형식으로 맞춤
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      dueDateStr = `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    setEditingData({
      title: todo.title,
      description: todo.description || '',
      dueDate: dueDateStr,
      isCompleted: todo.isCompleted || false,
    });
  };

  // 수정 취소
  const handleCancelEdit = () => {
    setEditingTodoId(null);
    setEditingData({ title: '', description: '', dueDate: '', isCompleted: false });
  };

  // 할일 수정 저장
  const handleSaveEdit = async (todoId) => {
    // 입력값 검증
    if (!editingData.title.trim()) {
      setErrorMessage('할일 제목을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    try {
      const updateData = {
        title: editingData.title,
        description: editingData.description,
        isCompleted: editingData.isCompleted,
      };

      // 마감일과 시간이 있으면 추가
      if (editingData.dueDate) {
        // datetime-local 형식의 문자열을 Date 객체로 변환
        updateData.dueDate = new Date(editingData.dueDate).toISOString();
      }

      const updatedTodo = await updateTodo(todoId, updateData);
      // 목록에서 해당 할일 업데이트
      setTodos(todos.map(todo => 
        todo._id === todoId ? updatedTodo : todo
      ));
      // 수정 모드 종료
      setEditingTodoId(null);
      setEditingData({ title: '', description: '', dueDate: '', isCompleted: false });
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : '할일 수정에 실패했습니다.';
      setErrorMessage(errorMessage);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // 완료 상태 토글
  const handleToggleComplete = async (todo) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const updatedTodo = await updateTodo(todo._id, {
        isCompleted: !todo.isCompleted,
      });
      setTodos(todos.map(t => 
        t._id === todo._id ? updatedTodo : t
      ));
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : '상태 변경에 실패했습니다.';
      setErrorMessage(errorMessage);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // 할일 삭제
  const handleDeleteTodo = async (todoId) => {
    // 삭제 확인
    if (!confirm('정말로 이 할일을 삭제하시겠습니까?')) {
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    try {
      await deleteTodo(todoId);
      // 목록에서 해당 할일 제거
      setTodos(todos.filter(todo => todo._id !== todoId));
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : '할일 삭제에 실패했습니다.';
      setErrorMessage(errorMessage);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // 날짜와 시간 포맷팅 함수
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="app-container">
      <div className="todo-app">
        <h1 className="app-title">📝 할일 관리</h1>

        {/* 에러 메시지 표시 */}
        {errorMessage && (
          <div className="error-message">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* 필터 버튼 */}
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
            disabled={isLoading}
          >
            전체
          </button>
          <button
            className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
            disabled={isLoading}
          >
            미완료
          </button>
          <button
            className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
            disabled={isLoading}
          >
            완료
          </button>
        </div>

        {/* 새 할일 추가 폼 */}
        <form onSubmit={handleAddTodo} className="add-todo-form">
          <div className="form-group">
            <input
              type="text"
              className="input-field"
              placeholder="할일 제목 *"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              disabled={isLoading}
              required
            />
            <textarea
              className="input-field textarea-field"
              placeholder="설명 (선택)"
              value={descriptionInput}
              onChange={(e) => setDescriptionInput(e.target.value)}
              disabled={isLoading}
              rows="2"
            />
            <input
              type="datetime-local"
              className="input-field"
              value={dueDateInput}
              onChange={(e) => setDueDateInput(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? '추가 중...' : '✓ 추가하기'}
          </button>
        </form>

        {/* 할일 목록 */}
        <div className="todo-list">
          {isLoading && todos.length === 0 ? (
            <div className="loading-message">로딩 중...</div>
          ) : todos.length === 0 ? (
            <div className="empty-message">
              할일이 없습니다. 새로운 할일을 추가해보세요! 🎉
            </div>
          ) : (
            todos.map((todo) => (
              <div 
                key={todo._id} 
                className={`todo-item ${todo.isCompleted ? 'completed' : ''}`}
              >
                {editingTodoId === todo._id ? (
                  // 수정 모드
                  <div className="todo-edit-mode">
                    <input
                      type="text"
                      className="input-field edit-input"
                      placeholder="할일 제목 *"
                      value={editingData.title}
                      onChange={(e) => setEditingData({...editingData, title: e.target.value})}
                      disabled={isLoading}
                      autoFocus
                      required
                    />
                    <textarea
                      className="input-field textarea-field edit-input"
                      placeholder="설명"
                      value={editingData.description}
                      onChange={(e) => setEditingData({...editingData, description: e.target.value})}
                      disabled={isLoading}
                      rows="2"
                    />
                    <div className="edit-row">
                      <input
                        type="datetime-local"
                        className="input-field"
                        value={editingData.dueDate}
                        onChange={(e) => setEditingData({...editingData, dueDate: e.target.value})}
                        disabled={isLoading}
                      />
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={editingData.isCompleted}
                          onChange={(e) => setEditingData({...editingData, isCompleted: e.target.checked})}
                          disabled={isLoading}
                        />
                        완료
                      </label>
                    </div>
                    <div className="todo-actions">
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleSaveEdit(todo._id)}
                        disabled={isLoading}
                      >
                        💾 저장
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={handleCancelEdit}
                        disabled={isLoading}
                      >
                        ✕ 취소
                      </button>
                    </div>
                  </div>
                ) : (
                  // 일반 모드
                  <>
                    <div className="todo-content">
                      <div className="todo-header">
                        <h3 className={`todo-title ${todo.isCompleted ? 'strikethrough' : ''}`}>
                          {todo.title}
                        </h3>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={todo.isCompleted || false}
                            onChange={() => handleToggleComplete(todo)}
                            disabled={isLoading}
                          />
                          완료
                        </label>
                      </div>
                      {todo.description && (
                        <p className="todo-description">{todo.description}</p>
                      )}
                      <div className="todo-meta">
                        {todo.dueDate && (
                          <span className="todo-date">
                            📅 {formatDate(todo.dueDate)}
                          </span>
                        )}
                        {todo.createdAt && (
                          <span className="todo-created">
                            생성: {formatDate(todo.createdAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="todo-actions">
                      <button
                        className="btn btn-warning btn-sm"
                        onClick={() => handleStartEdit(todo)}
                        disabled={isLoading}
                      >
                        ✏️ 수정
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteTodo(todo._id)}
                        disabled={isLoading}
                      >
                        🗑️ 삭제
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* 할일 개수 표시 */}
        {todos.length > 0 && (
          <div className="todo-count">
            전체 할일: <strong>{todos.length}개</strong>
            {todos.filter(t => t.isCompleted).length > 0 && (
              <> | 완료: <strong>{todos.filter(t => t.isCompleted).length}개</strong></>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
