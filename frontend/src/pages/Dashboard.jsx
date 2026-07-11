import { useState, useEffect, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

function Dashboard() {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'admin';

  // Projects State
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null); // The full project object
  const [newProjectName, setNewProjectName] = useState('');
  
  // Invites State
  const [invitations, setInvitations] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStatus, setInviteStatus] = useState('');

  // Tasks & Activity
  const [tasks, setTasks] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  
  // Loading & Error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Forms
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskDependsOn, setNewTaskDependsOn] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('Low');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState('');

  // Modals
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [currentTaskHistory, setCurrentTaskHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user]);

  // Polling for real-time updates
  useEffect(() => {
    let interval;
    if (user && activeProject) {
      interval = setInterval(() => {
        fetchTasksAndActivity(activeProject._id, false);
      }, 5000); // 5 seconds polling
    }
    return () => clearInterval(interval);
  }, [user, activeProject]);

  const loadInitialData = async () => {
    setLoading(true);
    await Promise.all([fetchProjects(), fetchInvitations()]);
    setLoading(false);
  };

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data);
      // Auto-select first project if none selected
      if (res.data.length > 0 && !activeProject) {
        setActiveProject(res.data[0]);
        fetchTasksAndActivity(res.data[0]._id, true);
      }
    } catch (err) {
      setError('Failed to load projects');
    }
  };

  const fetchInvitations = async () => {
    if (isAdmin) return; // Admins don't need to check invitations in this setup
    try {
      const res = await api.get('/projects/invitations');
      setInvitations(res.data);
    } catch (err) {}
  };

  const fetchTasksAndActivity = async (projectId, showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const [tasksRes, activityRes] = await Promise.all([
        api.get(`/tasks?projectId=${projectId}`),
        api.get(`/projects/${projectId}/activity`)
      ]);
      setTasks(tasksRes.data);
      setActivityFeed(activityRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const handleProjectSelect = (projectId) => {
    const proj = projects.find(p => p._id === projectId);
    setActiveProject(proj);
    if (proj) fetchTasksAndActivity(proj._id, true);
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/projects', { name: newProjectName });
      setProjects([...projects, res.data]);
      setNewProjectName('');
      handleProjectSelect(res.data._id);
    } catch (err) {
      setError('Failed to create project');
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteStatus('');
    try {
      // 1. Search user
      const searchRes = await api.get(`/users/search?email=${inviteEmail}`);
      if (searchRes.data.length === 0) {
        setInviteStatus('User not found');
        return;
      }
      
      const userToInvite = searchRes.data[0];
      
      // 2. Send Invite
      await api.post(`/projects/${activeProject._id}/invite`, { userId: userToInvite._id });
      setInviteStatus('Invitation sent successfully');
      setInviteEmail('');
      fetchTasksAndActivity(activeProject._id); // Update activity log
    } catch (err) {
      setInviteStatus(err.response?.data?.message || 'Failed to send invitation');
    }
  };

  const handleAcceptInvite = async (inviteId) => {
    try {
      await api.post(`/projects/invitations/${inviteId}/accept`);
      loadInitialData();
    } catch (err) {
      setError('Failed to accept invite');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !activeProject) return;

    try {
      const payload = {
        title: newTaskTitle,
        description: newTaskDesc,
        priority: newTaskPriority,
        project: activeProject._id
      };
      if (newTaskDependsOn) payload.dependsOn = newTaskDependsOn;
      if (newTaskDueDate) payload.dueDate = newTaskDueDate;
      if (newTaskAssignedTo) payload.assignedTo = newTaskAssignedTo;

      await api.post('/tasks', payload);
      
      // Reset & Refresh
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskDependsOn('');
      setNewTaskPriority('Low');
      setNewTaskDueDate('');
      setNewTaskAssignedTo('');
      fetchTasksAndActivity(activeProject._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create task');
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await api.put(`/tasks/${id}`, { status: newStatus });
      fetchTasksAndActivity(activeProject._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update task status');
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      await api.delete(`/tasks/${id}`);
      fetchTasksAndActivity(activeProject._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete task');
    }
  };

  const openEditModal = (task) => {
    setEditingTask({
      _id: task._id,
      title: task.title,
      description: task.description || '',
      dependsOn: task.dependsOn?._id || '',
      priority: task.priority || 'Low',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      assignedTo: task.assignedTo?._id || ''
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: editingTask.title,
        description: editingTask.description,
        priority: editingTask.priority,
        dueDate: editingTask.dueDate || undefined,
        dependsOn: editingTask.dependsOn || undefined,
        assignedTo: editingTask.assignedTo || undefined
      };
      await api.put(`/tasks/${editingTask._id}`, payload);
      setEditModalOpen(false);
      setEditingTask(null);
      fetchTasksAndActivity(activeProject._id);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update task');
    }
  };

  const handleViewHistory = async (id) => {
    try {
      setHistoryModalOpen(true);
      setHistoryLoading(true);
      const res = await api.get(`/tasks/${id}/history`);
      setCurrentTaskHistory(res.data);
    } catch (err) {
      setError('Failed to load history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleRestoreVersion = async (taskId, versionNumber) => {
    try {
      await api.post(`/tasks/${taskId}/restore/${versionNumber}`);
      setHistoryModalOpen(false);
      fetchTasksAndActivity(activeProject._id);
    } catch (err) {
      setError('Failed to restore version');
    }
  };

  if (!user) return <Navigate to="/login" />;

  return (
    <div className="container" style={{ position: 'relative', maxWidth: '1400px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 className="title">Team Workspace</h1>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select 
            className="form-control" 
            style={{ width: 'auto', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}
            value={activeProject?._id || ''}
            onChange={(e) => handleProjectSelect(e.target.value)}
          >
            <option value="" disabled>Select a Project</option>
            {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Admin: Create Project */}
      {isAdmin && (
        <div className="dashboard-card" style={{ marginBottom: '1rem', padding: '1rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Create New Project</h3>
          <form onSubmit={handleCreateProject} style={{ display: 'flex', gap: '1rem' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Project Name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>Create</button>
          </form>
        </div>
      )}

      {/* User: Invitations */}
      {!isAdmin && invitations.length > 0 && (
        <div className="dashboard-card" style={{ marginBottom: '1rem', borderLeft: '4px solid var(--accent-primary)' }}>
          <h3>Pending Invitations</h3>
          {invitations.map(inv => (
            <div key={inv._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
              <span>You have been invited to join <strong>{inv.project?.name}</strong></span>
              <button className="btn btn-primary btn-sm" onClick={() => handleAcceptInvite(inv._id)}>Accept</button>
            </div>
          ))}
        </div>
      )}

      {/* ACTIVE PROJECT VIEW */}
      {activeProject ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* LEFT COL: TASKS */}
          <div>
            {/* Admin: Invite Users to Project */}
            {isAdmin && (
              <div className="dashboard-card" style={{ marginBottom: '1rem', padding: '1rem' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>Invite Member to {activeProject.name}</h3>
                <form onSubmit={handleInvite} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="User Email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                  <button type="submit" className="btn btn-secondary" style={{ width: 'auto', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>Invite</button>
                </form>
                {inviteStatus && <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: inviteStatus.includes('success') ? '#86efac' : '#fca5a5' }}>{inviteStatus}</div>}
              </div>
            )}

            {/* Admin: Create Task */}
            {isAdmin && (
              <div className="dashboard-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <h2 style={{ marginBottom: '1rem' }}>Create New Task</h2>
                <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <input type="text" className="form-control" placeholder="Task Title" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} required />
                    <input type="text" className="form-control" placeholder="Description (optional)" value={newTaskDesc} onChange={(e) => setNewTaskDesc(e.target.value)} />
                  </div>
                  
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 150px' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Assign To</label>
                      <select className="form-control" value={newTaskAssignedTo} onChange={(e) => setNewTaskAssignedTo(e.target.value)} style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                        <option value="">Unassigned</option>
                        {activeProject.members?.map(m => (
                          <option key={m._id} value={m._id}>{m.email}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ flex: '1 1 150px' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Dependency</label>
                      <select className="form-control" value={newTaskDependsOn} onChange={(e) => setNewTaskDependsOn(e.target.value)} style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                        <option value="">No Dependency</option>
                        {tasks.map(t => <option key={t._id} value={t._id}>{t.title}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: '1 1 150px' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Priority</label>
                      <select className="form-control" value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value)} style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                    <div style={{ flex: '1 1 150px' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Due Date</label>
                      <input type="date" className="form-control" value={newTaskDueDate} onChange={(e) => setNewTaskDueDate(e.target.value)} />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ flex: '0 1 auto', alignSelf: 'flex-end', marginTop: '0.5rem' }}>Add Task</button>
                  </div>
                </form>
              </div>
            )}

            {/* Task List */}
            {loading ? (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading tasks...</p>
            ) : tasks.length === 0 ? (
              <div className="dashboard-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                <h3 style={{ color: 'var(--text-secondary)' }}>No tasks in this project yet.</h3>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr' }}>
                {tasks.map(task => (
                  <div key={task._id} className="task-card" style={{ opacity: task.archived ? 0.7 : 1 }}>
                    <div className="task-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h3 className="task-title">
                        {task.title} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>v{task.versionNumber || 1}</span>
                      </h3>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {task.overdue && <span className="status-badge" style={{ backgroundColor: '#ff4d4f' }}>Overdue</span>}
                        {task.risk === 'High' && <span className="status-badge" style={{ backgroundColor: '#faad14' }}>High Risk</span>}
                        {task.archived && <span className="status-badge" style={{ backgroundColor: '#d9d9d9', color: '#000' }}>Archived</span>}
                        <span className={`status-badge ${task.status === 'Completed' ? 'status-completed' : 'status-pending'}`}>
                          {task.status || 'Pending'}
                        </span>
                      </div>
                    </div>
                    
                    <p className="task-desc">{task.description || 'No description provided.'}</p>
                    
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <span><strong>Priority:</strong> {task.priority || 'Low'}</span>
                      {task.dueDate && <span><strong>Due:</strong> {new Date(task.dueDate).toLocaleDateString()}</span>}
                      <span><strong>Assigned:</strong> {task.assignedTo?.email || 'Unassigned'}</span>
                    </div>

                    {task.dependsOn && (
                      <div style={{ margin: '0.5rem 0', fontSize: '0.9rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Depends On: </span>
                        <strong>{task.dependsOn.title}</strong>
                        {task.dependsOn.status !== 'Completed' && (
                          <div style={{ color: '#ff4d4f', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            🔒 Waiting for {task.dependsOn.title}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="task-footer" style={{ flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                      
                      <button onClick={() => handleViewHistory(task._id)} className="btn btn-secondary btn-sm" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                        History
                      </button>

                      {isAdmin && (
                        <>
                          <button onClick={() => openEditModal(task)} className="btn btn-secondary btn-sm" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                            Edit
                          </button>
                          <button onClick={() => handleDeleteTask(task._id)} className="btn btn-danger btn-sm">
                            Delete
                          </button>
                        </>
                      )}

                      {task.status !== 'Completed' && !task.archived && (
                        <button 
                          onClick={() => handleUpdateStatus(task._id, task.status === 'Pending' ? 'In Progress' : 'Completed')}
                          className="btn btn-primary btn-sm"
                          disabled={task.dependsOn && task.dependsOn.status !== 'Completed'}
                        >
                          {task.status === 'Pending' ? 'Start' : 'Complete'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT COL: ACTIVITY FEED */}
          <div className="dashboard-card" style={{ position: 'sticky', top: '100px', maxHeight: 'calc(100vh - 150px)', overflowY: 'auto', padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Activity Feed</h3>
            {activityFeed.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No recent activity.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {activityFeed.map(log => (
                  <div key={log._id} style={{ fontSize: '0.85rem' }}>
                    <div style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>{log.action}</div>
                    <div style={{ color: 'var(--text-primary)' }}>{log.details}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '2px' }}>
                      {log.user?.email} • {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="dashboard-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <h3 style={{ color: 'var(--text-secondary)' }}>Select or create a project to view tasks.</h3>
        </div>
      )}

      {/* Edit Task Modal (Admin Only) */}
      {editModalOpen && editingTask && isAdmin && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div className="dashboard-card" style={{ width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>Edit Task</h2>
              <button onClick={() => setEditModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Title</label>
                <input type="text" className="form-control" value={editingTask.title} onChange={(e) => setEditingTask({...editingTask, title: e.target.value})} required />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Description</label>
                <input type="text" className="form-control" value={editingTask.description} onChange={(e) => setEditingTask({...editingTask, description: e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Assign To</label>
                <select className="form-control" value={editingTask.assignedTo} onChange={(e) => setEditingTask({...editingTask, assignedTo: e.target.value})} style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                  <option value="">Unassigned</option>
                  {activeProject?.members?.map(m => (
                    <option key={m._id} value={m._id}>{m.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Dependency</label>
                <select className="form-control" value={editingTask.dependsOn} onChange={(e) => setEditingTask({...editingTask, dependsOn: e.target.value})} style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                  <option value="">No Dependency</option>
                  {tasks.filter(t => t._id !== editingTask._id).map(t => (
                    <option key={t._id} value={t._id}>{t.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Priority</label>
                <select className="form-control" value={editingTask.priority} onChange={(e) => setEditingTask({...editingTask, priority: e.target.value})} style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Due Date</label>
                <input type="date" className="form-control" value={editingTask.dueDate} onChange={(e) => setEditingTask({...editingTask, dueDate: e.target.value})} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>Save Changes</button>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div className="dashboard-card" style={{ width: '90%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>Task Version History</h2>
              <button onClick={() => setHistoryModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            
            {historyLoading ? (
              <p>Loading history...</p>
            ) : currentTaskHistory.length === 0 ? (
              <p>No history found for this task.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {currentTaskHistory.map((history, index) => (
                  <div key={history._id} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <strong style={{ fontSize: '1.1rem' }}>Version {history.versionNumber}</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(history.modifiedAt).toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
                      <p><strong>Title:</strong> {history.title}</p>
                      <p><strong>Priority:</strong> {history.priority}</p>
                      <p><strong>Status:</strong> {history.status}</p>
                      {history.dueDate && <p><strong>Due Date:</strong> {new Date(history.dueDate).toLocaleDateString()}</p>}
                    </div>
                    {isAdmin && (
                      <button className="btn btn-primary btn-sm" onClick={() => handleRestoreVersion(history.taskId, history.versionNumber)}>
                        Restore to V{history.versionNumber}
                      </button>
                    )}
                    {index < currentTaskHistory.length - 1 && (
                      <div style={{ position: 'absolute', bottom: '-1rem', left: '50%', transform: 'translateX(-50%)', color: 'var(--text-secondary)' }}>
                        ↑
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
