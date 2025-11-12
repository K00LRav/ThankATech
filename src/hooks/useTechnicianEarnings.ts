import { useState, useEffect } from 'react';
import { logger } from '../lib/logger';

interface TechnicianEarnings {
  availableBalance: number;
  totalEarnings: number;
  pendingBalance: number;
  tipCount?: number;
}

export const useTechnicianEarnings = (technicianId: string | null) => {
  const [earnings, setEarnings] = useState<TechnicianEarnings>({
    availableBalance: 0,
    totalEarnings: 0,
    pendingBalance: 0,
  });
  
  const [loading, setLoading] = useState(false);

  const fetchEarnings = async () => {
    if (!technicianId) {
      return;
    }

    setLoading(true);
    try {
      // Use the NEW centralized dashboard loader instead of old getTechnicianEarnings
      const { loadTechnicianDashboard } = await import('../lib/technician-dashboard');
      
      const dashboardData = await loadTechnicianDashboard(technicianId);
      
      setEarnings({
        availableBalance: dashboardData.availableBalance || 0,
        totalEarnings: dashboardData.totalEarnings || 0,
        pendingBalance: 0, // Not currently used
        tipCount: dashboardData.transactionCount || 0,
      });
    } catch (error) {
      logger.error('Failed to fetch technician earnings:', error);
      // Fallback to zero earnings on error
      setEarnings({
        availableBalance: 0,
        totalEarnings: 0,
        pendingBalance: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
    
    // Refresh earnings every 30 seconds
    const interval = setInterval(fetchEarnings, 30000);
    return () => clearInterval(interval);
  }, [technicianId]);

  return { earnings, loading, refetch: fetchEarnings };
};