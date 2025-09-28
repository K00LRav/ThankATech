import { useState, useEffect } from 'react';

interface TechnicianEarnings {
  availableBalance: number;
  totalEarnings: number;
  pendingBalance: number;
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
        // For now, using mock data - in real implementation this would:
        // 1. Check Stripe Express account balance
        // 2. Calculate total earnings from Firebase transactions
        // 3. Get pending payments from Stripe
        
        // Mock earnings calculation
        const mockEarnings: TechnicianEarnings = {
          availableBalance: Math.random() * 50 + 10, // $10-60 range
          totalEarnings: Math.random() * 200 + 50,   // $50-250 range
          pendingBalance: Math.random() * 20,        // $0-20 range
        };
        
        setEarnings(mockEarnings);
      } catch (error) {
        console.error('Failed to fetch technician earnings:', error);
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