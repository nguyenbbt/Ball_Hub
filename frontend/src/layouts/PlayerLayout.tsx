import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import LeftSidebar from './components/LeftSidebar';
import { TopBar } from './components/TopBar';
import { RightSidebar } from './components/RightSidebar';

const PlayerLayout = () => {
  // State quản lý đóng mở Messenger
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <LeftSidebar />

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Nút bấm ở TopBar sẽ mở Messenger */}
        <TopBar onToggleMessage={() => setIsRightSidebarOpen(!isRightSidebarOpen)} />
        
        <main className="flex-1 p-6 md:p-8 overflow-y-auto relative">
          <Outlet />
        </main>
      </div>

      {/* Hiển thị Messenger (RightSidebar) khi state = true */}
      {isRightSidebarOpen && <RightSidebar onClose={() => setIsRightSidebarOpen(false)} />}
    </div>
  );
};

export default PlayerLayout;