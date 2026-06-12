import { DashboardFeature } from '@/features/dashboard/components/DashboardFeature';

const DashboardPage = () => {
  return (
    <div className="p-6 md:p-8 animate-in fade-in duration-500">
      <DashboardFeature />
    </div>
  );
};

export default DashboardPage;