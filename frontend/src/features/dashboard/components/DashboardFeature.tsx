import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { axiosClient } from '@/api/axiosClient';
import { CoachDashboard } from './CoachDashboard';
import { PlayerDashboard } from './PlayerDashboard';
import { Loader2 } from 'lucide-react';

export const DashboardFeature = () => {
  const { user } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await axiosClient.get('/dashboard');
        setData(res.data.data);
      } catch (error) {
        console.error('Failed to fetch dashboard', error);
      } finally {
        setLoading(false);
      }
    };
    if (user?.teamId) fetchDashboard();
    else setLoading(false);
  }, [user]);

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div>;

  if (user?.role === 'COACH' || user?.role === 'ADMIN') {
    return <CoachDashboard apiData={data} />;
  }

  return <PlayerDashboard apiData={data} />;
};