import React, { useState, useEffect, useCallback } from 'react';
import { getTasks, createTask, updateTask, deleteTask, bulkDeleteTasks } from './api';
import './App.css';

function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState('medium');
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date'); // 'date', 'priority', 'title'
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [bulkMode, setBulkMode] = useState(false);

  // Keyboard shortcuts (only Escape)
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Escape to cancel operations
      if (e.key === 'Escape') {
        setEditingId(null);
        setDeleteConfirmId(null);
        setBulkMode(false);
        setSelectedTasks(new Set());
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Local storage backup
  useEffect(() => {
    if (tasks.length > 0) {
      localStorage.setItem('tasks_backup', JSON.stringify(tasks));
    }
  }, [tasks]);

  // Fetch all tasks on component mount
  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTasks();
      setTasks(data);
    } catch (err) {
      setError(err.message || 'Failed to load tasks');
      // Try to load from local storage on error
      const backup = localStorage.getItem('tasks_backup');
      if (backup) {
        try {
          setTasks(JSON.parse(backup));
          setError('Using cached data. Please refresh to sync with server.');
        } catch (e) {
          // Ignore parse errors
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Optimistic update helper
  const optimisticUpdate = useCallback((taskId, updates, rollback) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      )
    );
    return rollback;
  }, []);

  const handleAddTask = async (e) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Task title cannot be empty');
      return;
    }

    // Optimistic update
    const tempId = Date.now();
    const optimisticTask = {
      id: tempId,
      title: title.trim(),
      description: description.trim() || null,
      done: false,
      priority: priority,
      created_at: new Date().toISOString(),
      order: tasks.length,
    };
    
    setTasks([...tasks, optimisticTask]);
    const originalTitle = title;
    const originalDesc = description;
    const originalPriority = priority;
    setTitle('');
    setDescription('');
    setPriority('medium');

    try {
      setError(null);
      const createdTask = await createTask({
        title: originalTitle.trim(),
        description: originalDesc.trim() || null,
        done: false,
        priority: originalPriority,
        order: tasks.length,
      });
      setTasks(prevTasks => 
        prevTasks.map(task => task.id === tempId ? createdTask : task)
      );
      showSuccess('Task added successfully!');
    } catch (err) {
      // Rollback on error
      setTasks(prevTasks => prevTasks.filter(task => task.id !== tempId));
      setTitle(originalTitle);
      setDescription(originalDesc);
      setPriority(originalPriority);
      setError(err.message || 'Failed to create task');
    }
  };

  const handleToggleDone = async (task) => {
    const previousDone = task.done;
    
    // Optimistic update
    optimisticUpdate(task.id, { done: !task.done }, () => {
      optimisticUpdate(task.id, { done: previousDone }, null);
    });

    try {
      setError(null);
      const updatedTask = await updateTask(task.id, {
        ...task,
        done: !task.done,
      });
      setTasks(prevTasks => 
        prevTasks.map(t => t.id === task.id ? updatedTask : t)
      );
      showSuccess(task.done ? 'Task marked as incomplete!' : 'Task completed!');
    } catch (err) {
      // Rollback already handled by optimistic update
      setError(err.message || 'Failed to update task');
      fetchTasks(); // Refresh to get correct state
    }
  };

  const handleDelete = async (taskId) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    
    // Optimistic update
    setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId));
    setDeleteConfirmId(null);

    try {
      setError(null);
      await deleteTask(taskId);
      showSuccess('Task deleted successfully!');
    } catch (err) {
      // Rollback on error
      if (taskToDelete) {
        setTasks(prevTasks => [...prevTasks, taskToDelete]);
      }
      setError(err.message || 'Failed to delete task');
    }
  };

  const handleBulkDelete = async () => {
    const taskIds = Array.from(selectedTasks);
    const tasksToDelete = tasks.filter(t => taskIds.includes(t.id));
    
    // Optimistic update
    setTasks(prevTasks => prevTasks.filter(t => !taskIds.includes(t.id)));
    setSelectedTasks(new Set());
    setBulkMode(false);

    try {
      setError(null);
      await bulkDeleteTasks(taskIds);
      showSuccess(`${taskIds.length} task(s) deleted successfully!`);
    } catch (err) {
      // Rollback on error
      setTasks(prevTasks => [...prevTasks, ...tasksToDelete]);
      setError(err.message || 'Failed to delete tasks');
    }
  };

  const handleDeleteClick = (taskId) => {
    setDeleteConfirmId(taskId);
  };

  const handleCancelDelete = () => {
    setDeleteConfirmId(null);
  };

  const handleStartEdit = (task) => {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditPriority(task.priority || 'medium');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditDescription('');
    setEditPriority('medium');
  };

  const handleSaveEdit = async (taskId) => {
    if (!editTitle.trim()) {
      setError('Task title cannot be empty');
      return;
    }

    const originalTask = tasks.find(t => t.id === taskId);
    
    // Optimistic update
    optimisticUpdate(taskId, {
      title: editTitle.trim(),
      description: editDescription.trim() || null,
      priority: editPriority,
    }, () => {
      if (originalTask) {
        optimisticUpdate(taskId, originalTask, null);
      }
    });

    try {
      setError(null);
      const updatedTask = await updateTask(taskId, {
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        priority: editPriority,
        done: tasks.find(t => t.id === taskId).done,
      });
      setTasks(prevTasks => 
        prevTasks.map(t => t.id === taskId ? updatedTask : t)
      );
      setEditingId(null);
      setEditTitle('');
      setEditDescription('');
      setEditPriority('medium');
      showSuccess('Task updated successfully!');
    } catch (err) {
      setError(err.message || 'Failed to update task');
      fetchTasks(); // Refresh to get correct state
    }
  };

  const showSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleTaskSelect = (taskId) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedTasks.size === filteredTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(filteredTasks.map(t => t.id)));
    }
  };

  // Filter and search tasks
  const filteredTasks = tasks.filter((task) => {
    if (filter === 'active' && task.done) return false;
    if (filter === 'completed' && !task.done) return false;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        task.title.toLowerCase().includes(query) ||
        (task.description && task.description.toLowerCase().includes(query))
      );
    }
    
    return true;
  });

  // Sort tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'priority') {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
    }
    if (sortBy === 'title') {
      return a.title.localeCompare(b.title);
    }
    // Default: date (newest first)
    return new Date(b.created_at) - new Date(a.created_at);
  });

  // Calculate statistics
  const stats = {
    total: tasks.length,
    active: tasks.filter(t => !t.done).length,
    completed: tasks.filter(t => t.done).length,
    high: tasks.filter(t => t.priority === 'high' && !t.done).length,
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#dc3545';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  const getPriorityLabel = (priority) => {
    return priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : 'Medium';
  };

  return (
    <div className="App">
      <div className="container">
        <h1>Task Manager</h1>

        {/* Error message */}
        {error && <div className="error-message">{error}</div>}
        
        {/* Success message */}
        {success && <div className="success-message">{success}</div>}

        {/* Add Task Form */}
        <form onSubmit={handleAddTask} className="task-form">
          <div className="form-group">
            <label htmlFor="title">Task Title *</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
              className="input-field"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="description">Description (Optional)</label>
            <input
              type="text"
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter task description"
              className="input-field"
            />
          </div>
          <div className="form-group">
            <label htmlFor="priority">Priority</label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="priority-select"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <button type="submit" className="add-button">
            Add Task
          </button>
        </form>

        {/* Tasks List */}
        <div className="tasks-section">
          <div className="tasks-header">
            <h2>Tasks</h2>
            {!loading && tasks.length > 0 && (
              <div className="task-stats">
                <span className="stat-item">Total: <strong>{stats.total}</strong></span>
                <span className="stat-item">Active: <strong>{stats.active}</strong></span>
                <span className="stat-item">Completed: <strong>{stats.completed}</strong></span>
                {stats.high > 0 && (
                  <span className="stat-item high-priority">
                    🔥 High: <strong>{stats.high}</strong>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Search Engine - Always Visible */}
          {!loading && (
            <div className="search-engine-section">
              <div className="search-container">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search tasks by title or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="clear-search-btn"
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Filter and Sort */}
          {!loading && tasks.length > 0 && (
            <div className="controls-bar">
              <div className="filter-buttons">
                <button
                  onClick={() => setFilter('all')}
                  className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('active')}
                  className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
                >
                  Active
                </button>
                <button
                  onClick={() => setFilter('completed')}
                  className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
                >
                  Completed
                </button>
              </div>
              <div className="sort-bulk-bar">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="sort-select"
                >
                  <option value="date">Sort by Date</option>
                  <option value="priority">Sort by Priority</option>
                  <option value="title">Sort by Title</option>
                </select>
                {!bulkMode ? (
                  <button
                    onClick={() => setBulkMode(true)}
                    className="bulk-mode-btn"
                  >
                    Select Multiple
                  </button>
                ) : (
                  <div className="bulk-actions">
                    <button
                      onClick={handleSelectAll}
                      className="select-all-btn"
                    >
                      {selectedTasks.size === sortedTasks.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      disabled={selectedTasks.size === 0}
                      className="bulk-delete-btn"
                    >
                      Delete Selected ({selectedTasks.size})
                    </button>
                    <button
                      onClick={() => {
                        setBulkMode(false);
                        setSelectedTasks(new Set());
                      }}
                      className="cancel-bulk-btn"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {loading ? (
            <div className="loading-skeleton">
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton-item">
                  <div className="skeleton-line"></div>
                  <div className="skeleton-line short"></div>
                </div>
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="no-tasks">
              <div className="empty-state">
                <div className="empty-icon">📝</div>
                <h3>No tasks yet</h3>
                <p>Get started by adding your first task above!</p>
              </div>
            </div>
          ) : sortedTasks.length === 0 ? (
            <div className="no-tasks">
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <h3>No tasks found</h3>
                <p>Try adjusting your search or filter criteria.</p>
              </div>
            </div>
          ) : (
            <ul className="tasks-list">
              {sortedTasks.map((task) => (
                <li 
                  key={task.id} 
                  className={`task-item ${task.done ? 'done' : ''} ${selectedTasks.has(task.id) ? 'selected' : ''}`}
                >
                  {bulkMode && (
                    <input
                      type="checkbox"
                      checked={selectedTasks.has(task.id)}
                      onChange={() => handleTaskSelect(task.id)}
                      className="task-checkbox"
                    />
                  )}
                  {editingId === task.id ? (
                    <div className="task-edit-form">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="input-field"
                        placeholder="Task title"
                        autoFocus
                      />
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="input-field"
                        placeholder="Description (optional)"
                      />
                      <select
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value)}
                        className="priority-select"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                      <div className="edit-actions">
                        <button
                          onClick={() => handleSaveEdit(task.id)}
                          className="save-button"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="cancel-button"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="task-content">
                        <div className="task-header">
                          <h3 className="task-title">{task.title}</h3>
                          <span 
                            className="priority-badge"
                            style={{ backgroundColor: getPriorityColor(task.priority) }}
                          >
                            {getPriorityLabel(task.priority)}
                          </span>
                        </div>
                        {task.description && (
                          <p className="task-description">{task.description}</p>
                        )}
                        {task.created_at && (
                          <p className="task-date">Created: {formatDate(task.created_at)}</p>
                        )}
                      </div>
                      <div className="task-actions">
                        <button
                          onClick={() => handleToggleDone(task)}
                          className={`toggle-button ${task.done ? 'done' : 'undo'}`}
                        >
                          {task.done ? 'Undo' : 'Done'}
                        </button>
                        <button
                          onClick={() => handleStartEdit(task)}
                          className="edit-button"
                        >
                          Edit
                        </button>
                        {deleteConfirmId === task.id ? (
                          <div className="delete-confirm">
                            <span>Delete?</span>
                            <button
                              onClick={() => handleDelete(task.id)}
                              className="confirm-delete-button"
                            >
                              Yes
                            </button>
                            <button
                              onClick={handleCancelDelete}
                              className="cancel-delete-button"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleDeleteClick(task.id)}
                            className="delete-button"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
