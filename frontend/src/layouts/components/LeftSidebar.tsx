import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useUIStore } from '@/store/useUIStore';
import { useAuthStore } from '@/store/useAuthStore';
import { disconnectSocket } from '@/features/messaging/socket';

const getMenuItems = (role: string) => {
  const base = role === 'PLAYER' ? '/player' : '/coach';
  
  const items = [
    { name: 'Dashboard', path: `${base}/dashboard`, icon: 'dashboard', roles: ['COACH', 'PLAYER'] },
    { name: 'Schedule', path: `${base}/schedule`, icon: 'calendar_today', roles: ['COACH', 'PLAYER'] },
    { name: 'Roster', path: `${base}/roster`, icon: 'groups', roles: ['COACH', 'PLAYER'] },
    { name: 'Match', path: `${base}/match`, icon: 'sports_basketball', roles: ['COACH', 'PLAYER'] },
    { name: 'Stats', path: `${base}/stats`, icon: 'leaderboard', roles: ['COACH'] },
    { name: 'Tactics', path: `${base}/tactics`, icon: 'strategy', roles: ['COACH'] },
    { name: 'Finance', path: `${base}/finance`, icon: 'payments', roles: ['COACH'] },
    { name: 'Inventory', path: `${base}/inventory`, icon: 'inventory_2', roles: ['COACH'] },
    { name: 'Tasks', path: `${base}/tasks`, icon: 'task_alt', roles: ['COACH', 'PLAYER'] },
  ];

  return items.filter(item => item.roles.includes(role));
};

const LeftSidebar = () => {
  const { leftSidebarOpen, setLeftSidebar } = useUIStore();
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = getMenuItems(user?.role || 'PLAYER');

  return (
    <aside
      className={`relative h-screen flex flex-col bg-slate-950 border-r border-slate-800/50 font-sans text-sm tracking-tight z-50 transition-all duration-300 ease-in-out shrink-0 ${
        leftSidebarOpen ? 'w-64' : 'w-20'
      }`}
    >
      {/* Logo Section - Giờ đây đóng vai trò là nút Toggle */}
      <div 
        className="p-6 h-24 flex items-center cursor-pointer hover:bg-slate-900/50 transition-colors"
        onClick={() => setLeftSidebar(!leftSidebarOpen)}
      >
        <div className="flex items-center gap-3 whitespace-nowrap">
          <div className="w-10 h-10 shrink-0 rounded-lg bg-gradient-to-br from-[#b7c4ff] to-[#0052ff] flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
              sports_basketball
            </span>
          </div>
          <div className={`transition-all duration-300 overflow-hidden ${leftSidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
            <h1 className="text-xl font-bold tracking-tighter text-slate-50">BallHub</h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Elite Performance</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto [&::-webkit-scrollbar]:hidden">
        {menuItems.map((item) => {
          const isActive = location.pathname.includes(item.path);

          return (
            <Link
              key={item.name}
              to={item.path}
              title={!leftSidebarOpen ? item.name : ''}
              className={`flex items-center px-4 py-2 rounded-lg transition-all duration-200 ease-in-out whitespace-nowrap ${
                isActive
                  ? 'text-blue-400 bg-blue-500/10 font-semibold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/50'
              } ${!leftSidebarOpen && 'justify-center px-0'}`}
            >
              <span className="material-symbols-outlined shrink-0" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                {item.icon}
              </span>
              <span className={`transition-all duration-300 overflow-hidden ${leftSidebarOpen ? 'opacity-100 max-w-[200px] ml-3' : 'opacity-0 max-w-0 ml-0'}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-4 mt-auto">
        <button
          onClick={() => {
            disconnectSocket();
            logout();
            navigate('/login', { replace: true });
          }}
          title={!leftSidebarOpen ? 'Logout' : ''}
          className={`flex items-center w-full px-4 py-2 rounded-lg transition-all duration-200 ease-in-out whitespace-nowrap text-red-400 hover:text-red-300 hover:bg-red-500/10 ${
            !leftSidebarOpen && 'justify-center px-0'
          }`}
        >
          <span className="material-symbols-outlined shrink-0">logout</span>
          <span className={`transition-all duration-300 overflow-hidden ${leftSidebarOpen ? 'opacity-100 max-w-[200px] ml-3' : 'opacity-0 max-w-0 ml-0'}`}>
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
};

export default LeftSidebar;