import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import LeftSidebar from './components/LeftSidebar';
import { TopBar } from './components/TopBar';
import { RightSidebar } from './components/RightSidebar'; // Import thêm dòng này

const CoachLayout = () => {
  // Thêm state quản lý đóng mở
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <LeftSidebar />

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Truyền hàm toggle vào TopBar nếu bạn muốn bấm icon Message để mở */}
        <TopBar onToggleMessage={() => setIsRightSidebarOpen(!isRightSidebarOpen)} />
        
        <main className="flex-1 p-6 overflow-y-auto relative">
          <Outlet />
        </main>
      </div>

      {/* Hiển thị RightSidebar khi state = true */}
      {isRightSidebarOpen && <RightSidebar onClose={() => setIsRightSidebarOpen(false)} />}
    </div>
  );
};

export default CoachLayout;