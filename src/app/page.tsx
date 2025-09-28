"use client";
// @ts-nocheck

import { useState, useEffect, useCallback } from 'react';
import { fetchTechnicians, getUserLocation } from '../lib/techniciansApi.js';
import { sendThankYou, sendTip, auth, authHelpers, getTechnician, getUser } from '../lib/firebase';
import { TECHNICIAN_CATEGORIES, getCategoryById, mapLegacyCategoryToNew } from '../lib/categories';
import Registration from '../components/Registration';
import SignIn from '../components/SignIn';
import { TipModal } from '../components/TipModal';
import Footer from '../components/Footer';
import Link from 'next/link';
import { useTechnicianEarnings } from '../hooks/useTechnicianEarnings';

// Utility function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

interface Technician {
  id: string;
  name: string;
  title: string;
  about: string;
  image: string;
  photoURL?: string; // Google profile photo URL
  points: number;
  category: string;
  rating?: number;
  phone?: string;
  address?: string;
  businessName?: string;
  businessPhone?: string;
  businessEmail?: string;
  website?: string;
  businessAddress?: string;
  serviceArea?: string;
  hourlyRate?: string;
  availability?: string;
  experience?: string;
  certifications?: string;
  isSample?: boolean;
  totalThankYous?: number;
  totalTips?: number;
  totalTipAmount?: number;
  coordinates?: {lat: number, lng: number};
  distance?: number;
  isNearby?: boolean;
}

export default function Home() {
  const [profiles, setProfiles] = useState<Technician[]>([]);
  const [currentProfileIndex, setCurrentProfileIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRegistration, setShowRegistration] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [thankYouMessage, setThankYouMessage] = useState('');
  const [showThankYou, setShowThankYou] = useState(false);
  const [expandedCard, setExpandedCard] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt' | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTipModal, setShowTipModal] = useState(false);
  const [filteredProfiles, setFilteredProfiles] = useState<Technician[]>([]);
  const [allProfiles, setAllProfiles] = useState<Technician[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Hook to fetch technician earnings for header display
  const { earnings, loading: earningsLoading } = useTechnicianEarnings(
    currentUser?.userType === 'technician' ? currentUser?.uid : null
  );
  
  const profile = (profiles[currentProfileIndex] || {
    name: '',
    title: '',
    category: '',
    image: '',
    points: 0,
    totalThankYous: 0,
    totalTips: 0,
    rating: 5.0
  }) as any;

  // Calculate dynamic rating based on thank yous and tips
  const calculateRating = (thankYous: number, tips: number, tipAmount: number) => {
    // Base algorithm: convert engagement to 1-5 star rating
    const totalEngagement = thankYous + (tips * 2); // Tips count double
    const baseRating = 3.0; // Everyone starts at 3 stars
    const engagementBonus = Math.min(totalEngagement / 30, 2.0); // Max 2 extra stars
    return Math.min(baseRating + engagementBonus, 5.0);
  };

  // Get dynamic rating for current profile
  const dynamicRating = profile.totalThankYous && profile.totalTips 
    ? calculateRating(profile.totalThankYous, profile.totalTips, profile.totalTips * 5)
    : profile.rating || 5.0;

  // Achievement badges based on milestones
  const getAchievementBadges = (profile: Technician) => {
    const badges = [];
    const totalThankYous = profile.totalThankYous || 0;
    const totalTips = profile.totalTips || 0;

    // Thank you milestones
    if (totalThankYous >= 100) badges.push({ icon: '🏆', text: 'Thank You Champion', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' });
    else if (totalThankYous >= 50) badges.push({ icon: '🥉', text: 'Community Hero', color: 'bg-orange-100 text-orange-800 border-orange-300' });
    else if (totalThankYous >= 25) badges.push({ icon: '⭐', text: 'Rising Star', color: 'bg-blue-100 text-blue-800 border-blue-300' });
    else if (totalThankYous >= 10) badges.push({ icon: '👋', text: 'Appreciated', color: 'bg-green-100 text-green-800 border-green-300' });

    // Tip milestones
    if (totalTips >= 50) badges.push({ icon: '💎', text: 'Diamond Earner', color: 'bg-blue-100 text-blue-800 border-blue-300' });
    else if (totalTips >= 25) badges.push({ icon: '🥇', text: 'Gold Standard', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' });
    else if (totalTips >= 10) badges.push({ icon: '🥈', text: 'Silver Pro', color: 'bg-gray-100 text-gray-800 border-gray-300' });
    else if (totalTips >= 5) badges.push({ icon: '💰', text: 'Tip Earner', color: 'bg-green-100 text-green-800 border-green-300' });

    // Rating milestones
    if (dynamicRating >= 4.8) badges.push({ icon: '🌟', text: 'Excellence', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' });
    else if (dynamicRating >= 4.5) badges.push({ icon: '✨', text: 'Outstanding', color: 'bg-blue-100 text-blue-800 border-blue-300' });

    // Experience badges (based on profile data)
    if (profile.experience?.includes('10+')) badges.push({ icon: '🧙‍♂️', text: 'Master Tech', color: 'bg-blue-100 text-blue-800 border-blue-300' });
    else if (profile.experience?.includes('5+')) badges.push({ icon: '🔧', text: 'Expert', color: 'bg-blue-100 text-blue-800 border-blue-300' });

    // Certification badge
    if (profile.certifications) badges.push({ icon: '📜', text: 'Certified', color: 'bg-green-100 text-green-800 border-green-300' });

    return badges.slice(0, 3); // Show max 3 badges to keep clean
  };

  // Get category icon based on category/title
  const getCategoryIcon = (category: string, title: string) => {
    // First try to find by exact category ID or name
    const categoryObj = getCategoryById(category) || 
                       TECHNICIAN_CATEGORIES.find(cat => 
                         cat.name.toLowerCase() === category.toLowerCase()
                       );
    
    if (categoryObj) {
      return categoryObj.icon;
    }
    
    // Fallback to legacy mapping for existing data
    const mappedCategory = mapLegacyCategoryToNew(category || title || '');
    const mappedCategoryObj = getCategoryById(mappedCategory);
    
    return mappedCategoryObj ? mappedCategoryObj.icon : '🔧';
  };

  // Format category name with proper capitalization
  const formatCategory = (category: string) => {
    if (category.toLowerCase() === 'hvac') {
      return 'HVAC';
    }
    // Capitalize first letter of each word
    return category.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  // Format website URL for display as a readable title
  const formatWebsiteTitle = (website: string) => {
    try {
      const url = new URL(website.startsWith('http') ? website : `https://${website}`);
      let hostname = url.hostname.replace('www.', '');
      
      // Handle specific domains from our sample data
      if (hostname.includes('janesdoeautoshop')) return "Jane's Auto Shop";
      if (hostname.includes('johndoeelectric')) return "John Doe Electric";
      if (hostname.includes('smithplumbingpro')) return "Smith Plumbing Pro";
      if (hostname.includes('chenheatingcooling')) return "Chen Heating & Cooling";
      if (hostname.includes('carlostech')) return "Carlos Tech Solutions";
      if (hostname.includes('johnsonappliances')) return "Johnson Appliances";
      if (hostname.includes('kimsecurityservices')) return "Kim Security Services";
      if (hostname.includes('gonzalezbuilders')) return "Gonzalez Builders";
      if (hostname.includes('wilsonhandymanservices')) return "Wilson Handyman Services";
      if (hostname.includes('leeroofingatl')) return "Lee Roofing Atlanta";
      if (hostname.includes('brownlandscapes')) return "Brown Landscapes";
      if (hostname.includes('daviscleaningservices')) return "Davis Cleaning Services";
      if (hostname.includes('taylorpainting')) return "Taylor Painting";
      
      // Convert common patterns to readable names
      if (hostname.includes('appliance')) return 'Appliance Services';
      if (hostname.includes('heating') || hostname.includes('cooling')) return 'HVAC Services';
      if (hostname.includes('plumbing')) return 'Plumbing Services';
      if (hostname.includes('electric')) return 'Electrical Services';
      if (hostname.includes('security')) return 'Security Services';
      if (hostname.includes('builder') || hostname.includes('construction')) return 'Construction Services';
      if (hostname.includes('handyman')) return 'Handyman Services';
      if (hostname.includes('roofing')) return 'Roofing Services';
      if (hostname.includes('landscape')) return 'Landscaping Services';
      if (hostname.includes('cleaning')) return 'Cleaning Services';
      if (hostname.includes('painting')) return 'Painting Services';
      
      // Otherwise, capitalize the domain name nicely
      const domainName = hostname.split('.')[0];
      return domainName.charAt(0).toUpperCase() + domainName.slice(1);
    } catch {
      const cleaned = website.replace(/^https?:\/\/(www\.)?/, '');
      const domainName = cleaned.split('.')[0];
      return domainName.charAt(0).toUpperCase() + domainName.slice(1);
    }
  };

  // Search filter function
  const filterTechnicians = useCallback((query: string, category: string = selectedCategory) => {
    let filtered = allProfiles;
    
    // Apply category filter
    if (category && category !== 'all') {
      filtered = filtered.filter(technician => {
        const techCategory = technician.category || '';
        
        // Direct match (for legacy categories)
        if (techCategory.toLowerCase() === category.toLowerCase()) {
          return true;
        }
        
        // Check if the category matches a main category ID
        const categoryObj = getCategoryById(category);
        if (categoryObj) {
          // Check if technician's category matches the category name
          if (techCategory.toLowerCase() === categoryObj.name.toLowerCase()) {
            return true;
          }
          
          // Check if technician's legacy category maps to this main category
          const mappedCategory = mapLegacyCategoryToNew(techCategory);
          return mappedCategory === category;
        }
        
        return false;
      });
    }
    
    // Apply search query filter
    if (query.trim()) {
      const searchTerm = query.toLowerCase();
      filtered = filtered.filter(technician => {
        // Basic fields search
        const basicMatch = 
          technician.name.toLowerCase().includes(searchTerm) ||
          technician.category.toLowerCase().includes(searchTerm) ||
          technician.title.toLowerCase().includes(searchTerm) ||
          technician.businessName?.toLowerCase().includes(searchTerm) ||
          technician.businessAddress?.toLowerCase().includes(searchTerm) ||
          technician.serviceArea?.toLowerCase().includes(searchTerm);
        
        if (basicMatch) return true;
        
        // Search in subcategories - find the main category and search its subcategories
        const techCategory = technician.category || '';
        const mappedCategoryId = mapLegacyCategoryToNew(techCategory);
        const categoryObj = getCategoryById(mappedCategoryId);
        
        if (categoryObj) {
          return categoryObj.subcategories.some(sub => 
            sub.toLowerCase().includes(searchTerm)  
          );
        }
        
        return false;
      });
    }
    
    setFilteredProfiles(filtered);
    setProfiles(filtered);
    setCurrentProfileIndex(0);
  }, [allProfiles, selectedCategory]);

  // Handle search query changes
  useEffect(() => {
    filterTechnicians(searchQuery);
  }, [searchQuery, filterTechnicians]);

  // Handle category changes
  useEffect(() => {
    filterTechnicians(searchQuery, selectedCategory);
  }, [selectedCategory, filterTechnicians, searchQuery]);

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = authHelpers.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in, restore their profile data
        try {
          // Try to get user data from either technicians or users collection
          let userData: any = await getTechnician(firebaseUser.uid);
          if (!userData) {
            userData = await getUser(firebaseUser.uid);
          }

          if (userData) {
            setCurrentUser({
              id: userData.id,
              uid: firebaseUser.uid,
              name: userData.name || userData.displayName || firebaseUser.displayName,
              email: userData.email || firebaseUser.email,
              displayName: userData.displayName || firebaseUser.displayName,
              photoURL: userData.photoURL || firebaseUser.photoURL,
              userType: userData.userType || 'customer'
            });
          } else {
            // Firebase user exists but no profile data, create basic user object
            setCurrentUser({
              id: firebaseUser.uid,
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              userType: 'customer'
            });
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
          // Still set basic user data from Firebase auth
          setCurrentUser({
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            userType: 'customer'
          });
        }
      } else {
        // User is signed out
        setCurrentUser(null);
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const achievementBadges = getAchievementBadges(profile);

  // Get available categories - show all main categories plus any that have active technicians
  const getAvailableCategories = useCallback(() => {
    // Always show "All Categories" first
    const categories = [{ value: 'all', label: 'All Categories' }];
    
    // Add all main categories from our configuration
    TECHNICIAN_CATEGORIES.forEach(cat => {
      categories.push({
        value: cat.id,
        label: cat.name
      });
    });
    
    // Also check for any legacy categories from existing profiles that don't match our main categories
    const existingCategories = allProfiles.map(p => p.category);
    const uniqueExistingCategories = [...new Set(existingCategories)];
    
    uniqueExistingCategories.forEach(existingCat => {
      if (existingCat && !TECHNICIAN_CATEGORIES.some(cat => 
        cat.id === existingCat || cat.name.toLowerCase() === existingCat.toLowerCase()
      )) {
        // This is a legacy category, add it
        categories.push({
          value: existingCat,
          label: formatCategory(existingCat)
        });
      }
    });
    
    return categories;
  }, [allProfiles]);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  // Request user location
  const requestUserLocation = () => {
    return new Promise<{lat: number, lng: number} | null>((resolve) => {
      if (!navigator.geolocation) {
        setLocationPermission('denied');
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
          setLocationPermission('granted');
          resolve(location);
        },
        (error) => {
          setLocationPermission('denied');
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  };

  // Get technician data
  useEffect(() => {
    const loadTechnicians = async () => {
      setLoading(true);
      try {
        // Try to get user location first
        const location = await requestUserLocation();
        
        // Fetch technicians with location data
        const data = await fetchTechnicians('all', location || undefined, 20);
        if (Array.isArray(data) && data.length > 0) {
          setProfiles(data);
          setAllProfiles(data);
          setFilteredProfiles(data);
          setCurrentProfileIndex(0);
        } else {
          setError('No technician data available');
        }
      } catch (error) {
        console.error('Failed to load technicians:', error);
        setError('Failed to load technician data');
      } finally {
        setLoading(false);
      }
    };

    loadTechnicians();
  }, []);

  const flipToNext = useCallback(() => {
    if (isFlipping) return;
    setIsFlipping(true);
    setCurrentProfileIndex((prev) => (prev + 1) % profiles.length);
    setTimeout(() => setIsFlipping(false), 600);
  }, [isFlipping, profiles.length]);

  const flipToPrevious = useCallback(() => {
    if (isFlipping) return;
    setIsFlipping(true);
    setCurrentProfileIndex((prev) => (prev - 1 + profiles.length) % profiles.length);
    setTimeout(() => setIsFlipping(false), 600);
  }, [isFlipping, profiles.length]);

  const handleThankYou = async () => {
    if (!currentUser) {
      setShowRegistration(true);
      return;
    }

    try {
      const currentTechnician = profiles[currentProfileIndex];
      await sendThankYou(currentTechnician.id, currentUser.id, 'Thank you for your great service!');
      
      // Update the technician's stats locally
      setProfiles(prev => prev.map((tech, index) => 
        index === currentProfileIndex 
          ? { 
              ...tech, 
              points: tech.points + 1,
              totalThankYous: (tech.totalThankYous || 0) + 1
            }
          : tech
      ));

      setThankYouMessage('Thank you sent successfully! 👍');
      setShowThankYou(true);
      setTimeout(() => setShowThankYou(false), 3000);
    } catch (error) {
      console.error('Error sending thank you:', error);
      setError('Failed to send thank you. Please try again.');
    }
  };

  const handleTip = async () => {
    if (!currentUser) {
      setShowRegistration(true);
      return;
    }



    // Open the new Stripe-powered tip modal
    setShowTipModal(true);
  };

  const handleRegistrationComplete = (user: any) => {
    setCurrentUser(user);
    setShowRegistration(false);
    
    // Show welcome message only for new registrations (not existing sign-ins)
    if (user.isNewUser) {
      // Different welcome messages based on user type
      if (user.userType === 'technician') {
        setThankYouMessage('Welcome to ThankATech! Your technician profile is now live. Customers can now find and thank you!');
      } else {
        setThankYouMessage('Welcome to ThankATech! You can now thank technicians and show your appreciation.');
      }
      
      setShowThankYou(true);
      setTimeout(() => setShowThankYou(false), 4000); // Longer timeout for technician message
    }
  };

  const handleSignInComplete = (user: any) => {
    setCurrentUser(user);
    setShowSignIn(false);
    // No welcome message for existing users signing in
  };

  const handleRegistrationClose = () => {
    setShowRegistration(false);
  };

  // Keyboard navigation for better UX
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        flipToPrevious();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        flipToNext();
      }
    };

    // Only add keyboard listeners when not focused on input elements
    const handleFocus = (e: FocusEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        document.removeEventListener('keydown', handleKeyDown);
      } else {
        document.addEventListener('keydown', handleKeyDown);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleFocus);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleFocus);
    };
  }, [flipToNext, flipToPrevious]);
  
  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-blue-300 font-semibold">Loading amazing technicians near you...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 font-semibold mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-500 transition-colors duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show empty state
  if (profiles.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-300 font-semibold">No technicians found in your area.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-blue-700/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-blue-700/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-blue-600/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>
      <div className="relative z-10">
        {/* Header */}
        <header className="flex justify-between items-center p-6 bg-black/20 backdrop-blur-sm border-b border-white/10 rounded-2xl mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl flex items-center justify-center">
              <span className="text-xl font-bold">🔧</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              ThankATech
            </span>
          </div>
          <div className="flex gap-4 items-center">
            {currentUser ? (
              <div className="flex items-center space-x-4">
                {/* Dashboard/Profile Link - Route to dedicated pages */}
                {currentUser && (
                  <Link
                    href={currentUser.userType === 'technician' ? '/dashboard' : '/profile'}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-900 transition-all duration-200 shadow-lg hover:shadow-xl text-center"

                  >
                    {currentUser.userType === 'technician' ? 'Dashboard' : 'Profile'}
                  </Link>
                )}
                
                <div className="flex items-center space-x-3">
                  {currentUser?.photoURL && (
                    <img 
                      src={currentUser.photoURL} 
                      alt="Profile" 
                      className="w-8 h-8 rounded-full border-2 border-white/20"
                    />
                  )}
                  <span className="text-gray-300">Welcome, {currentUser?.name}!</span>
                  
                  {/* Technician Balance Display */}
                  {currentUser?.userType === 'technician' && (
                    <div 
                      className="flex items-center space-x-2 px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-lg cursor-pointer hover:bg-green-500/30 transition-colors duration-200"
                      title={earningsLoading ? 'Loading earnings...' : `Available: ${formatCurrency(earnings.availableBalance)} | Total Earned: ${formatCurrency(earnings.totalEarnings)}`}
                    >
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      <span className="text-green-300 font-semibold text-sm">
                        {earningsLoading ? '...' : formatCurrency(earnings.availableBalance)}
                      </span>
                    </div>
                  )}
                  
                  {/* Logout Button */}
                  <button
                    onClick={() => {
                      setCurrentUser(null);
                      setThankYouMessage('You have been logged out successfully.');
                      setShowThankYou(true);
                      setTimeout(() => setShowThankYou(false), 3000);
                    }}
                    className="px-3 py-1 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg text-sm hover:bg-red-500/30 transition-all duration-200"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 items-center">
                <button 
                  onClick={() => setShowSignIn(true)}
                  className="text-gray-300 hover:text-blue-400 transition-colors duration-200 font-medium"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => setShowRegistration(true)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-900 transition-all duration-200"
                >
                  Join Now
                </button>
              </div>
            )}
            <button 
              onClick={() => setShowSearch(!showSearch)}
              className="px-6 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white hover:bg-white/20 transition-all duration-200 font-medium"
            >
              {showSearch ? 'Close' : 'Search'}
            </button>
          </div>
        </header>

        {/* Categories Showcase */}
        <div className="mb-8 px-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent mb-2">
              🛠️ Find Your Tech Hero
            </h2>
            <p className="text-gray-300 text-sm">Choose a category to discover skilled technicians in your area</p>
          </div>
          
          {/* Category Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 max-w-6xl mx-auto">
            {/* Show All Categories Button */}
            <button
              onClick={() => setSelectedCategory('all')}
              className={`group p-4 rounded-xl backdrop-blur-sm border transition-all duration-200 hover:scale-105 ${
                selectedCategory === 'all'
                  ? 'bg-gradient-to-r from-green-600/30 to-green-800/30 border-green-400/50 shadow-lg shadow-green-500/25'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
              }`}
            >
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-200">
                🔧
              </div>
              <div className="text-white text-xs font-medium text-center leading-tight">
                All Categories
              </div>
              <div className="text-gray-400 text-xs text-center mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                View all technicians
              </div>
            </button>

            {TECHNICIAN_CATEGORIES.slice(0, 9).map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`group p-4 rounded-xl backdrop-blur-sm border transition-all duration-200 hover:scale-105 ${
                  selectedCategory === category.id
                    ? 'bg-gradient-to-r from-blue-600/30 to-blue-800/30 border-blue-400/50 shadow-lg shadow-blue-500/25'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-200">
                  {category.icon}
                </div>
                <div className="text-white text-xs font-medium text-center leading-tight">
                  {category.name.replace(' Technicians', '').replace(' (IT)', '')}
                </div>
                <div className="text-gray-400 text-xs text-center mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {category.description.split(',')[0]}
                </div>
              </button>
            ))}
          </div>
          
          {/* Filter Status */}
          <div className="mt-6 text-center">
            {selectedCategory !== 'all' ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-400/30 rounded-full">
                <span className="text-blue-300 text-sm">
                  Showing {profiles.length} {getCategoryById(selectedCategory)?.name || formatCategory(selectedCategory)} technician{profiles.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => setSelectedCategory('all')}
                  className="text-blue-400 hover:text-blue-300 text-sm underline ml-2"
                >
                  Clear filter
                </button>
              </div>
            ) : (
              <div className="text-gray-400 text-sm">
                Showing all {profiles.length} technician{profiles.length !== 1 ? 's' : ''} in your area
              </div>
            )}
          </div>
        </div>

        {/* Search Input */}
        {showSearch && (
          <div className="w-full max-w-2xl mx-auto px-4 py-1 mb-8 animate-fadeIn">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search technicians by name, category, business, or location..."
                className="w-full px-6 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
              />
              {searchQuery && (
                <button
                  onClick={() => {setSearchQuery(''); filterTechnicians('');}}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-300 hover:text-white transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
            {filteredProfiles.length > 0 && searchQuery && (
              <div className="mt-2 text-center text-white/70 text-sm">
                Found {filteredProfiles.length} technician{filteredProfiles.length !== 1 ? 's' : ''}
              </div>
            )}
            {filteredProfiles.length === 0 && searchQuery && (
              <div className="mt-2 text-center text-orange-300 text-sm">
                No technicians found matching &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
        )}

      {/* Main Content */}
      <div className="flex flex-col items-center space-y-6 sm:space-y-8">
        
        {/* Sample Data Notice */}
                {/* Location Permission Banner */}
        {locationPermission === 'denied' && (
          <div className="mb-6 bg-gradient-to-r from-blue-500/20 to-blue-600/20 backdrop-blur-sm border border-blue-300/30 rounded-2xl p-4">
            <div className="text-blue-100">
              <h3 className="font-semibold mb-2 text-lg">📍 Location Services Disabled</h3>
              <p className="text-sm text-blue-200">
                Enable location services to see technicians sorted by distance and find the nearest help! 
                <button 
                  onClick={() => window.location.reload()} 
                  className="text-blue-300 hover:text-blue-100 hover:underline font-semibold ml-1 transition-colors duration-200"
                >
                  Try again
                </button>
              </p>
            </div>
          </div>
        )}

        {/* Navigation Controls */}
        <div className="flex items-center justify-center gap-6 mb-8 px-4">
          {/* Previous Button */}
          <button
            onClick={flipToPrevious}
            disabled={currentProfileIndex === 0}
            className={`group flex items-center gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8 lg:py-4 rounded-2xl font-medium text-sm sm:text-base transition-all duration-200 shadow-lg ${
              currentProfileIndex === 0
                ? 'bg-gray-400/20 text-gray-400 cursor-not-allowed border border-gray-400/20'
                : 'bg-white/10 backdrop-blur-lg border border-white/30 text-white hover:bg-white/20 hover:scale-105 hover:shadow-xl hover:border-white/40'
            }`}
          >
            <svg className={`w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 transition-transform ${currentProfileIndex === 0 ? '' : 'group-hover:-translate-x-1'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Previous</span>
          </button>

            {/* Modern Pagination Info */}
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            {/* Counter */}
            <div className="bg-white/10 backdrop-blur-lg border border-white/30 rounded-2xl px-4 py-2 sm:px-6 sm:py-3 shadow-lg" title="Use arrow keys to navigate">
              <span className="text-white font-medium text-sm sm:text-base">
                {currentProfileIndex + 1} of {profiles.length}
              </span>
            </div>
            
            {/* Enhanced Pagination Dots */}
            <div className="flex items-center gap-3">
              {profiles.slice(0, Math.min(7, profiles.length)).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentProfileIndex(index)}
                  className={`rounded-full transition-all duration-300 hover:scale-110 ${
                    index === currentProfileIndex
                      ? 'w-3 h-3 sm:w-4 sm:h-4 bg-blue-400 shadow-lg shadow-blue-400/50 scale-125'
                      : 'w-2 h-2 sm:w-3 sm:h-3 bg-white/40 hover:bg-white/60 shadow-md'
                  }`}
                />
              ))}
              {profiles.length > 7 && (
                <div className="flex items-center ml-2">
                  <span className="text-white/60 text-xs sm:text-sm font-medium">
                    +{profiles.length - 7} more
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Next Button */}
          <button
            onClick={flipToNext}
            disabled={currentProfileIndex >= profiles.length - 1}
            className={`group flex items-center gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8 lg:py-4 rounded-2xl font-medium text-sm sm:text-base transition-all duration-200 shadow-lg ${
              currentProfileIndex >= profiles.length - 1
                ? 'bg-gray-400/20 text-gray-400 cursor-not-allowed border border-gray-400/20'
                : 'bg-white/10 backdrop-blur-lg border border-white/30 text-white hover:bg-white/20 hover:scale-105 hover:shadow-xl hover:border-white/40'
            }`}
          >
            <span className="hidden sm:inline">Next</span>
            <svg className={`w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 transition-transform ${currentProfileIndex >= profiles.length - 1 ? '' : 'group-hover:translate-x-1'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Modern Glass Rolodex Card */}
        <div id="rolodex-card" className={`card-container relative group ${isFlipping ? 'animate-pulse' : ''} flex justify-center`}>
          {/* Glass morphism background layers for depth */}
          <div className="absolute top-4 left-4 w-full max-w-md sm:max-w-3xl lg:max-w-5xl xl:max-w-6xl h-auto min-h-[28rem] sm:min-h-[32rem] lg:min-h-[36rem] bg-gradient-to-br from-blue-400/10 to-teal-500/10 backdrop-blur-sm rounded-3xl transform rotate-1 transition-all duration-500 group-hover:rotate-2 group-hover:top-6 group-hover:left-6 border border-white/10 shadow-xl"></div>
          <div className="absolute top-2 left-2 w-full max-w-md sm:max-w-3xl lg:max-w-5xl xl:max-w-6xl h-auto min-h-[28rem] sm:min-h-[32rem] lg:min-h-[36rem] bg-gradient-to-br from-blue-400/15 to-teal-500/15 backdrop-blur-sm rounded-3xl transform rotate-0.5 transition-all duration-500 group-hover:rotate-1 group-hover:top-3 group-hover:left-3 border border-white/15 shadow-2xl"></div>
          
          {/* Main Glass Card */}
          <div className="relative w-full max-w-md sm:max-w-3xl lg:max-w-5xl xl:max-w-6xl bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl transition-all duration-500 group-hover:shadow-3xl group-hover:-translate-y-2 group-hover:bg-white/15 overflow-hidden">
            {/* Category Badge - Top Right */}
            <div className="absolute top-4 right-4 z-10">
              <div className="flex items-center gap-2 bg-gradient-to-r from-blue-500/80 to-teal-600/80 backdrop-blur-sm border border-white/30 rounded-full px-3 py-1.5 shadow-lg">
                <span className="text-lg">{getCategoryIcon(profile.category, profile.title)}</span>
                <span className="hidden sm:inline text-white text-sm font-medium">
                  {formatCategory(profile.category)}
                </span>
              </div>
            </div>
            
            {/* Card Content */}
            <div className="relative p-6 sm:p-8 lg:p-10 h-full min-h-[28rem] sm:min-h-[32rem] lg:min-h-[36rem]">

            <div className="flex flex-col h-full">
              {/* Header Section */}
              <div className="flex items-start space-x-3 sm:space-x-4 mb-3 sm:mb-4">
                {/* Profile Image with modern styling */}
                <div className="relative">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-2xl overflow-hidden shadow-lg ring-4 ring-white/50">
                    <img
                      src={profile.photoURL || profile.image}
                      alt={profile.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to default image if Google photo fails to load
                        e.currentTarget.src = profile.image;
                      }}
                    />
                  </div>
                  {/* Dynamic Rating overlay */}
                  <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full w-12 h-12 lg:w-14 lg:h-14 flex items-center justify-center text-sm lg:text-base font-bold shadow-lg border-2 border-white">
                    <span className="flex items-center justify-center">
                      {dynamicRating.toFixed(1)}⭐
                    </span>
                  </div>
                </div>

                {/* Name and Title */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{profile.name}</h2>
                  <p className="text-base sm:text-lg lg:text-xl text-blue-800 font-semibold mt-1">{profile.businessName || profile.title}</p>
                  {profile.serviceArea && (
                    <p className="text-sm sm:text-base text-gray-100 mt-1 flex items-center">
                      <span className="mr-1">📍</span>
                      {profile.serviceArea}
                    </p>
                  )}
                  
                  {/* Distance and Location Info */}
                  {profile.distance !== undefined && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm sm:text-base text-gray-100 flex items-center">
                        🚗 {profile.distance.toFixed(1)} miles away
                      </span>
                      {profile.isNearby && (
                        <span className="bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-sm font-medium border border-green-200">
                          📍 Near You
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Achievement Badges */}
                  {achievementBadges.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {achievementBadges.map((badge, index) => (
                        <span 
                          key={index}
                          className={`inline-flex items-center gap-1 px-2 py-1 lg:px-3 lg:py-1.5 rounded-full text-xs lg:text-sm font-medium border ${badge.color} shadow-sm`}
                          title={`Achievement: ${badge.text}`}
                        >
                          <span className="text-xs lg:text-sm">{badge.icon}</span>
                          <span className="hidden sm:inline">{badge.text}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Content Section - Responsive layout */}
              <div className={`${expandedCard ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : 'space-y-3'}`}>
                {/* Left Column - About & Basic Info */}
                <div className="space-y-3">
                  <div className="bg-gray-50/80 backdrop-blur-sm rounded-xl p-4 border border-gray-100">
                    <p className="text-sm lg:text-base text-gray-700 leading-relaxed max-h-80 lg:max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">{profile.about}</p>
                  </div>

                  {/* Basic Contact Info Grid - Only show when expanded */}
                  {expandedCard && (
                    <div className="grid grid-cols-2 gap-2">
                  {profile.businessPhone && (
                    <div className="bg-blue-50/80 backdrop-blur-sm rounded-lg p-3 border border-blue-100">
                      <div className="flex items-center space-x-2">
                        <span className="text-blue-500">📞</span>
                        <span className="text-xs lg:text-sm text-blue-700 font-medium">{profile.businessPhone}</span>
                      </div>
                    </div>
                  )}
                  {profile.businessEmail && (
                    <div className="bg-blue-50/80 backdrop-blur-sm rounded-lg p-3 border border-blue-100 col-span-2">
                      <div className="flex items-start space-x-2">
                        <span className="text-blue-500 mt-0.5">✉️</span>
                        <span className="text-xs lg:text-sm text-blue-700 font-medium break-all leading-relaxed">{profile.businessEmail}</span>
                      </div>
                    </div>
                  )}
                  {profile.website && (
                    <div className="bg-green-50/80 backdrop-blur-sm rounded-lg p-3 border border-green-100">
                      <div className="flex items-center space-x-2">
                        <span className="text-green-500">🌐</span>
                        <a 
                          href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs lg:text-sm text-green-700 font-medium hover:text-green-800 hover:underline transition-colors"
                        >
                          {formatWebsiteTitle(profile.website)}
                        </a>
                      </div>
                    </div>
                  )}
                  {profile.businessAddress && (
                    <div className="bg-red-50/80 backdrop-blur-sm rounded-lg p-3 border border-red-100">
                      <div className="flex items-center space-x-2">
                        <span className="text-red-500">📍</span>
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(profile.businessAddress)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-red-700 font-medium hover:text-red-800 hover:underline transition-colors break-words leading-relaxed"
                        >
                          {profile.businessAddress}
                        </a>
                      </div>
                    </div>
                  )}
                  {profile.hourlyRate && (
                    <div className="bg-blue-50/80 backdrop-blur-sm rounded-lg p-3 border border-blue-100">
                      <div className="flex items-center space-x-2">
                        <span className="text-blue-500">💰</span>
                        <span className="text-xs text-blue-700 font-medium">{profile.hourlyRate}/hr</span>
                      </div>
                    </div>
                  )}
                  {profile.experience && (
                    <div className="bg-orange-50/80 backdrop-blur-sm rounded-lg p-3 border border-orange-100">
                      <div className="flex items-center space-x-2">
                        <span className="text-orange-500">⚡</span>
                        <span className="text-xs text-orange-700 font-medium">{profile.experience}</span>
                      </div>
                    </div>
                  )}
                  {profile.availability && (
                    <div className="bg-teal-50/80 backdrop-blur-sm rounded-lg p-3 border border-teal-100">
                      <div className="flex items-center space-x-2">
                        <span className="text-teal-500">🕐</span>
                        <span className="text-xs text-teal-700 font-medium">{profile.availability}</span>
                      </div>
                    </div>
                  )}
                  {profile.serviceArea && (
                    <div className="bg-cyan-50/80 backdrop-blur-sm rounded-lg p-3 border border-cyan-100">
                      <div className="flex items-center space-x-2">
                        <span className="text-cyan-500">🗺️</span>
                        <span className="text-xs text-cyan-700 font-medium">{profile.serviceArea}</span>
                      </div>
                    </div>
                  )}
                    </div>
                  )}
                </div>

                {/* Right Column - Expandable Details (only when expanded) */}
                {expandedCard && (
                  <div className="space-y-3 animate-in slide-in-from-right-2 duration-300">
                    {/* Additional Services */}
                    {profile.certifications && (
                      <div className="bg-gray-50/80 backdrop-blur-sm rounded-xl p-3 border border-gray-100">
                        <h4 className="text-sm font-semibold text-gray-800 mb-2">🏆 Certifications & Licenses</h4>
                        <p className="text-xs text-gray-600 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">{profile.certifications}</p>
                      </div>
                    )}
                    
                    {/* Detailed Availability */}
                    {profile.availability && (
                      <div className="bg-gray-50/80 backdrop-blur-sm rounded-xl p-3 border border-gray-100">
                        <h4 className="text-sm font-semibold text-gray-800 mb-2">📅 Detailed Schedule</h4>
                        <p className="text-xs text-gray-600 max-h-28 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">{profile.availability}</p>
                      </div>
                    )}

                    {/* Service Specialties */}
                    <div className="bg-gray-50/80 backdrop-blur-sm rounded-xl p-3 border border-gray-100">
                      <h4 className="text-sm font-semibold text-gray-800 mb-2">🔧 Service Specialties</h4>
                      <div className="flex flex-wrap gap-1">
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                          <span>{getCategoryIcon(profile.category, profile.title)}</span>
                          {formatCategory(profile.category)}
                        </span>
                        {profile.experience && (
                          <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs">{profile.experience}</span>
                        )}
                        {profile.certifications && (
                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">Certified</span>
                        )}
                      </div>
                    </div>

                    {/* Achievement Badges Section */}
                    {achievementBadges.length > 0 && (
                      <div className="bg-gradient-to-r from-gray-800/90 to-gray-700/90 backdrop-blur-sm rounded-xl p-3 border border-gray-600">
                        <h4 className="text-sm lg:text-base font-semibold text-gray-100 mb-2">🏆 Achievements</h4>
                        <div className="grid grid-cols-1 gap-2">
                          {achievementBadges.map((badge, index) => (
                            <div key={index} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-600 bg-gray-700/50">
                              <span className="text-xl lg:text-2xl">{badge.icon}</span>
                              <div className="flex-1">
                                <span className="text-sm lg:text-base font-medium text-gray-100">{badge.text}</span>
                                <div className="text-xs lg:text-sm text-gray-300 mt-0.5">
                                  {badge.text.includes('Thank') && `${profile.totalThankYous || 0} thank yous received`}
                                  {badge.text.includes('Tip') && `${profile.totalTips || 0} tips received${profile.totalTipAmount && profile.totalTipAmount > 0 ? ` ($${(profile.totalTipAmount / 100).toFixed(2)})` : ''}`}
                                  {badge.text.includes('Excellence') && 'Top-rated technician'}
                                  {badge.text.includes('Outstanding') && 'Highly rated by customers'}
                                  {badge.text.includes('Master') && 'Decade+ of experience'}
                                  {badge.text.includes('Expert') && 'Years of proven expertise'}
                                  {badge.text.includes('Certified') && 'Professional certifications'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Rating Explanation */}
                    <div className="bg-gradient-to-r from-gray-800/90 to-gray-700/90 backdrop-blur-sm rounded-xl p-3 lg:p-4 border border-gray-600">
                      <h4 className="text-sm lg:text-base font-semibold text-gray-100 mb-2">⭐ Community Rating</h4>
                      <div className="flex items-center justify-between text-xs lg:text-sm">
                        <span className="text-gray-200">Based on customer feedback</span>
                        <span className="font-bold text-yellow-400 text-sm lg:text-base">{dynamicRating.toFixed(1)}/5.0 ⭐</span>
                      </div>
                      <div className="text-xs lg:text-sm text-gray-200 mt-2">
                        {profile.totalThankYous || 0} thanks • {profile.totalTips || 0} tips received
                        {profile.totalTipAmount && profile.totalTipAmount > 0 && (
                          <span className="ml-1 text-green-600 font-medium">
                            (${(profile.totalTipAmount / 100).toFixed(2)})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Expand/Collapse Button */}
              <div className="mt-3 text-center">
                <button
                  onClick={() => setExpandedCard(!expandedCard)}
                  className="text-xs text-gray-100 hover:text-blue-300 transition-colors duration-200 flex items-center space-x-1 mx-auto"
                >
                  <span>{expandedCard ? 'Less Details' : 'More Details'}</span>
                  <span className={`transform transition-transform duration-200 ${expandedCard ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
              </div>

              {/* Bottom Section - Contained within card */}
              <div className="mt-auto pt-2 sm:pt-3 border-t border-gray-200/50">
                {/* Thank You Points Display - Compact mobile layout */}
                <div className="flex items-center justify-center gap-2 flex-wrap mb-3">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full px-3 py-1 lg:px-3 lg:py-1.5 shadow-lg">
                    <div className="flex items-center space-x-1">
                      <span className="text-xs lg:text-sm">👍</span>
                      <span className="text-xs lg:text-sm font-bold">{profile.totalThankYous || 0}</span>
                      <span className="text-xs lg:text-sm opacity-90 hidden sm:inline">thanks</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-full px-3 py-1 lg:px-3 lg:py-1.5 shadow-lg">
                    <div className="flex items-center space-x-1">
                      <span className="text-xs lg:text-sm">💰</span>
                      <span className="text-xs lg:text-sm font-bold">{profile.totalTips || 0}</span>
                      <span className="text-xs lg:text-sm opacity-90 hidden sm:inline">tips</span>
                    </div>
                  </div>
                  {profile.certifications && (
                    <div className="bg-blue-100 text-blue-700 rounded-full px-3 py-1 lg:px-3 lg:py-1.5 shadow-sm">
                      <span className="text-xs lg:text-sm font-medium">✓ Certified</span>
                    </div>
                  )}
                </div>

                {/* Quick Actions - Balanced sizing */}
                <div className="flex items-center justify-center space-x-2 lg:space-x-3">
                  {profile.businessEmail && (
                    <button 
                      onClick={() => {
                        const subject = `Inquiry about ${profile.businessName} services`;
                        const body = `Hello ${profile.name},\n\nI found your profile on ThankATech and I'm interested in your ${profile.category} services.\n\nPlease let me know your availability.\n\nThank you!`;
                        window.location.href = `mailto:${profile.businessEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                      }}
                      className="bg-white/80 backdrop-blur-sm hover:bg-white text-gray-600 hover:text-indigo-600 rounded-full p-2 lg:p-2.5 transition-all duration-200 border border-gray-200 hover:border-indigo-300 shadow-sm group min-h-[36px] min-w-[36px] lg:min-h-[44px] lg:min-w-[44px] flex items-center justify-center hover:scale-105"
                      title="Send Email"
                    >
                      <span className="text-base lg:text-lg group-hover:scale-110 transition-transform duration-200">💬</span>
                    </button>
                  )}
                  {profile.businessPhone && (
                    <button 
                      onClick={() => {
                        window.location.href = `tel:${profile.businessPhone}`;
                      }}
                      className="bg-white/80 backdrop-blur-sm hover:bg-white text-gray-600 hover:text-green-600 rounded-full p-2 lg:p-2.5 transition-all duration-200 border border-gray-200 hover:border-green-300 shadow-sm group min-h-[36px] min-w-[36px] lg:min-h-[44px] lg:min-w-[44px] flex items-center justify-center hover:scale-105"
                      title="Call Now"
                    >
                      <span className="text-base lg:text-lg group-hover:scale-110 transition-transform duration-200">📞</span>
                    </button>
                  )}
                  {profile.website && (
                    <button 
                      onClick={() => {
                        if (profile.website) {
                          const url = profile.website.startsWith('http') ? profile.website : `https://${profile.website}`;
                          window.open(url, '_blank');
                        }
                      }}
                      className="bg-white/80 backdrop-blur-sm hover:bg-white text-gray-600 hover:text-blue-600 rounded-full p-2 lg:p-2.5 transition-all duration-200 border border-gray-200 hover:border-blue-300 shadow-sm group min-h-[36px] min-w-[36px] lg:min-h-[44px] lg:min-w-[44px] flex items-center justify-center hover:scale-105"
                      title="Visit Website"
                    >
                      <span className="text-base lg:text-lg group-hover:scale-110 transition-transform duration-200">🌐</span>
                    </button>
                  )}
                  {profile.businessAddress && (
                    <button 
                      onClick={() => {
                        if (profile.businessAddress) {
                          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(profile.businessAddress)}`;
                          window.open(mapsUrl, '_blank');
                        }
                      }}
                      className="bg-white/80 backdrop-blur-sm hover:bg-white text-gray-600 hover:text-red-600 rounded-full p-2 lg:p-2.5 transition-all duration-200 border border-gray-200 hover:border-red-300 shadow-sm group min-h-[36px] min-w-[36px] lg:min-h-[44px] lg:min-w-[44px] flex items-center justify-center hover:scale-105"
                      title="Get Directions"
                    >
                      <span className="text-base lg:text-lg group-hover:scale-110 transition-transform duration-200">📍</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Separate section for controls and buttons - prevents overlapping */}
      <div className="action-buttons-container flex flex-col items-center space-y-6 mt-4 sm:mt-12 mb-8">
        {/* Location Info */}
        {userLocation && (
          <div className="text-center">
            <span className="text-xs bg-green-500/20 backdrop-blur-sm px-3 py-1 rounded-full border border-green-400/30 text-green-300">
              📍 Sorted by distance
            </span>
          </div>
        )}

        {/* Action Buttons - Balanced desktop sizing */}
        <div className="flex flex-col sm:flex-row gap-4 sm:space-x-6 sm:gap-0 w-full max-w-md lg:max-w-lg mx-auto">
          <button 
            onClick={handleThankYou}
            className="group flex items-center justify-center space-x-2 lg:space-x-3 px-6 py-3 lg:px-8 lg:py-4 bg-gradient-to-r from-green-500 to-emerald-600 backdrop-blur-sm rounded-xl lg:rounded-2xl hover:from-green-400 hover:to-emerald-500 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-green-500/25 hover:-translate-y-1 min-h-[48px] lg:min-h-[56px] flex-1"
          >
            <span className="text-white text-lg lg:text-xl group-hover:scale-110 transition-transform duration-200">👍</span>
            <span className="font-semibold text-white text-sm lg:text-base">Thank You</span>
          </button>
          <button 
            onClick={handleTip}
            className="group flex items-center justify-center space-x-2 lg:space-x-3 px-6 py-3 lg:px-8 lg:py-4 bg-gradient-to-r from-amber-500 to-yellow-600 backdrop-blur-sm rounded-xl lg:rounded-2xl hover:from-amber-400 hover:to-yellow-500 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-amber-500/25 hover:-translate-y-1 min-h-[48px] lg:min-h-[56px] flex-1"
          >
            <span className="text-white text-lg lg:text-xl group-hover:scale-110 transition-transform duration-200">💰</span>
            <span className="font-semibold text-white text-sm lg:text-base">Send Tip</span>
          </button>
        </div>
            </div>
          </div>

      {/* Spacer before footer */}
      <div className="h-8 lg:h-12"></div>

      {/* Comprehensive Footer */}
      <Footer onOpenRegistration={() => setShowRegistration(true)} />
      
    </div>

      {/* Registration Modal */}
      {showRegistration && (
        <Registration 
          onRegistrationComplete={handleRegistrationComplete}
          onClose={handleRegistrationClose}
        />
      )}

      {/* Sign In Modal */}
      {showSignIn && (
        <SignIn 
          onSignInComplete={handleSignInComplete}
          onClose={() => setShowSignIn(false)}
          onSwitchToRegister={() => {
            setShowSignIn(false);
            setShowRegistration(true);
          }}
        />
      )}

      {/* Thank You Notification */}
      {showThankYou && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce">
          {thankYouMessage}
        </div>
      )}


      {/* Stripe-Powered Tip Modal */}
      <TipModal
        isOpen={showTipModal}
        onClose={() => setShowTipModal(false)}
        technician={{
          id: profiles[currentProfileIndex]?.id || '',
          name: profiles[currentProfileIndex]?.name || '',
          businessName: profiles[currentProfileIndex]?.businessName || '',
          category: profiles[currentProfileIndex]?.category || '',
        }}
        customer={{
          id: currentUser?.id || '',
          name: currentUser?.name || currentUser?.displayName || '',
          email: currentUser?.email || '',
        }}
      />
    </div>
  );
}




