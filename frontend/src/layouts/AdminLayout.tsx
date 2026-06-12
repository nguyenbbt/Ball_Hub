import { NavLink, Outlet } from 'react-router-dom';
import { Shield } from 'lucide-react'; // Thêm icon cho đẹp

const AdminLayout = () => {
  return (
    // Đổi toàn bộ nền thành màu sáng (fafafa) và chữ màu tối (slate-900)
    <div className="min-h-screen bg-[#fafafa] text-slate-900 font-sans">
      <div className="flex min-h-screen">
        
        {/* Sidebar màu trắng tinh, viền xám nhạt */}
        <aside className="w-64 border-r border-slate-200 bg-white px-6 py-8">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <Shield size={16} strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">Admin Panel</span>
          </div>

          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 ml-2">
            Quản lý
          </div>
          
          <nav className="space-y-2">
            <NavLink
              to="/admin/pending-teams"
              className={({ isActive }) =>
                `block rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700' // Nút đang chọn: Nền xanh nhạt, chữ xanh đậm
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900' // Nút bình thường
                }`
              }
            >
              Danh sách đội bóng
            </NavLink>
            {/* Bạn có thể thêm các NavLink khác ở đây sau này */}
          </nav>
        </aside>

        {/* Khu vực nội dung chính */}
        {/* Bỏ padding ở đây vì trang PendingTeams đã tự có padding riêng rồi */}
        <main className="flex-1 overflow-x-hidden">
          <Outlet />
        </main>
        
      </div>
    </div>
  );
};

export default AdminLayout;