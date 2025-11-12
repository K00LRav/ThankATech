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
      // Dynamically import to avoid potential circular dependencies
      const firebaseModule = await import('../lib/firebase');
      
      const { getTechnicianEarnings } = firebaseModule;
      if (!getTechnicianEarnings) {
        throw new Error('getTechnicianEarnings function not found in firebase module');
      }
      
      const realEarnings: any = await getTechnicianEarnings(technicianId);
      
      setEarnings({
        availableBalance: realEarnings.availableBalance || 0,
        totalEarnings: realEarnings.totalEarnings || 0,
        pendingBalance: realEarnings.pendingBalance || 0,
        tipCount: realEarnings.tipCount || 0,
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