import { Matches } from '@/features/matches/components/MatchFeature';
import { useAuthStore } from '@/store/useAuthStore';

export default function MatchPage() {
  const role = useAuthStore(state => state.user?.role?.toLowerCase() || 'player');
  return <Matches role={role} />;
}