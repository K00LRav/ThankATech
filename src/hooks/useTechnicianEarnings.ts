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
    if (!technicianId) {
      console.log('🔄 useTechnicianEarnings: No technicianId provided');
      return;
    }

    console.log('🔄 useTechnicianEarnings: Starting fetch for technicianId:', technicianId);

    const fetchEarnings = async () => {
      setLoading(true);
      try {
        console.log('🔄 useTechnicianEarnings: Importing getTechnicianEarnings...');
        // Dynamically import to avoid potential circular dependencies
        const firebaseModule = await import('../lib/firebase');
        console.log('🔄 useTechnicianEarnings: Firebase module imported:', Object.keys(firebaseModule));
        
        const { getTechnicianEarnings } = firebaseModule;
        if (!getTechnicianEarnings) {
          throw new Error('getTechnicianEarnings function not found in firebase module');
        }
        
        console.log('🔄 useTechnicianEarnings: Calling getTechnicianEarnings with:', technicianId);
        const realEarnings: any = await getTechnicianEarnings(technicianId);
        console.log('🔄 useTechnicianEarnings: Received earnings:', realEarnings);
        
        setEarnings({
          availableBalance: realEarnings.availableBalance || 0,
          totalEarnings: realEarnings.totalEarnings || 0,
          pendingBalance: realEarnings.pendingBalance || 0,
          tipCount: realEarnings.tipCount || 0,
        });
        
        console.log('🔄 useTechnicianEarnings: Earnings state updated');
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