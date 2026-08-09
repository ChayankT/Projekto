import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { DataSyncProvider } from './context/DataSyncContext';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import CommandPalette from './components/ui/CommandPalette';
import ShortcutsHelp from './components/ui/ShortcutsHelp';
import GlobalHotkeys from './components/GlobalHotkeys';
import Dashboard from './pages/Dashboard';
import MyWork from './pages/MyWork';
import ProjectList from './pages/ProjectList';
import ProjectDetail from './pages/ProjectDetail';
import SprintDetail from './pages/SprintDetail';
import StoryDetail from './pages/StoryDetail';
import NotificationsPage from './pages/NotificationsPage';
import TeamPage from './pages/TeamPage';
import CalendarPage from './pages/CalendarPage';
import ArchivePage from './pages/ArchivePage';

const App = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AppProvider>
          <DataSyncProvider>
          <ToastProvider>
            <div className="app-layout">
              <Sidebar />
              <div className="main-content">
                <TopBar />
                <Routes>
                  <Route path="/" element={<main className="page-body"><Dashboard /></main>} />
                  <Route path="/my-work" element={<main className="page-body"><MyWork /></main>} />
                  <Route path="/projects" element={<main className="page-body"><ProjectList /></main>} />
                  <Route path="/projects/:id" element={<main className="kanban-page"><ProjectDetail /></main>} />
                  <Route path="/projects/:id/sprints/:sprintId" element={<main className="page-body"><SprintDetail /></main>} />
                  <Route path="/calendar" element={<main className="page-body"><CalendarPage /></main>} />
                  <Route path="/stories/:id" element={<main className="page-body"><StoryDetail /></main>} />
                  <Route path="/notifications" element={<main className="page-body"><NotificationsPage /></main>} />
                  <Route path="/team" element={<main className="page-body"><TeamPage /></main>} />
                  <Route path="/archive" element={<main className="page-body"><ArchivePage /></main>} />
                </Routes>
              </div>
            </div>
            <CommandPalette />
            <ShortcutsHelp />
            <GlobalHotkeys />
          </ToastProvider>
          </DataSyncProvider>
        </AppProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
