import { useState, useEffect } from 'react';

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

  useEffect(() => {
    if (!technicianId) return;

    const fetchEarnings = async () => {
      setLoading(true);
      try {
        // Dynamically import to avoid potential circular dependencies
        console.log('💰 Fetching earnings for technician:', technicianId);
        
        const { getTechnicianEarnings } = await import('../lib/firebase');
        const realEarnings: any = await getTechnicianEarnings(technicianId);
        
        console.log('💰 Raw earnings data:', realEarnings);
        
        setEarnings({
          availableBalance: realEarnings.availableBalance || 0,
          totalEarnings: realEarnings.totalEarnings || 0,
          pendingBalance: realEarnings.pendingBalance || 0,
          tipCount: realEarnings.tipCount || 0,
        });
        
        console.log('💰 Set earnings state:', {
          availableBalance: realEarnings.availableBalance || 0,
          totalEarnings: realEarnings.totalEarnings || 0,
          pendingBalance: realEarnings.pendingBalance || 0,
          tipCount: realEarnings.tipCount || 0,
        });
      } catch (error) {
        console.error('❌ Failed to fetch technician earnings:', error);
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

    fetchEarnings();
    
    // Refresh earnings every 30 seconds
    const interval = setInterval(fetchEarnings, 30000);
    return () => clearInterval(interval);
  }, [technicianId]);

  return { earnings, loading };
};