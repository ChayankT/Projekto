import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = axios.create({ baseURL: BASE });

// Users
export const getUsers = () => api.get('/users');
export const createUser = (data) => api.post('/users', data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);

// Projects
export const getProjects = () => api.get('/projects');
export const getProject = (id) => api.get(`/projects/${id}`);
export const createProject = (data) => api.post('/projects', data);
export const updateProject = (id, data) => api.put(`/projects/${id}`, data);
export const deleteProject = (id) => api.delete(`/projects/${id}`);

// Stories
export const getStories = (projectId) => api.get(`/stories?project=${projectId}`);
export const getAllStories = () => api.get('/stories');
export const getStory = (id) => api.get(`/stories/${id}`);
export const createStory = (data) => api.post('/stories', data);
export const updateStory = (id, data) => api.put(`/stories/${id}`, data);
export const deleteStory = (id) => api.delete(`/stories/${id}`);
export const archiveStory = (id) => api.put(`/stories/${id}`, { archived: true });
export const restoreStory = (id) => api.put(`/stories/${id}`, { archived: false });
export const getArchivedStories = () => api.get('/stories?archived=true');

// Tasks
export const getTasks = (storyId) => api.get(`/tasks?story=${storyId}`);
export const getAllTasks = () => api.get('/tasks');
export const createTask = (data) => api.post('/tasks', data);
export const updateTask = (id, data) => api.put(`/tasks/${id}`, data);
export const deleteTask = (id) => api.delete(`/tasks/${id}`);
export const archiveTask = (id) => api.put(`/tasks/${id}`, { archived: true });
export const restoreTask = (id) => api.put(`/tasks/${id}`, { archived: false });
export const getArchivedTasks = () => api.get('/tasks?archived=true');

// Sprints
export const getSprints = (projectId) => api.get(projectId ? `/sprints?project=${projectId}` : '/sprints');
export const getSprint = (id) => api.get(`/sprints/${id}`);
export const getSprintBurndown = (id) => api.get(`/sprints/${id}/burndown`);
export const getSprintVelocity = (projectId) => api.get(`/sprints/velocity/${projectId}`);
export const createSprint = (data) => api.post('/sprints', data);
export const updateSprint = (id, data) => api.put(`/sprints/${id}`, data);
export const deleteSprint = (id) => api.delete(`/sprints/${id}`);

// Notifications
export const getNotifications = (userId) => api.get(`/notifications?user=${userId}`);
export const getUnreadCount = (userId) => api.get(`/notifications/unread-count?user=${userId}`);
export const markNotificationRead = (id) => api.put(`/notifications/${id}/read`);
export const markAllNotificationsRead = (userId) => api.put('/notifications/mark-all-read', { user: userId });
