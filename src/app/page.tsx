"use client";
// @ts-nocheck

import { useState, useEffect, useCallback } from 'react';
import { fetchTechnicians, getUserLocation } from '../lib/techniciansApi.js';
import { logger } from '../lib/logger';
import { sendThankYou, auth, authHelpers, getTechnician, getUser } from '../lib/firebase';
import { getUserTokenBalance, sendFreeThankYou } from '../lib/token-firebase';
import { TECHNICIAN_CATEGORIES, getCategoryById, mapLegacyCategoryToNew } from '../lib/categories';
import Registration from '../components/Registration';
import SignIn from '../components/SignIn';
import TokenSendModal from '../components/TokenSendModal';
import TokenPurchaseModal from '../components/TokenPurchaseModal';
import Footer from '../components/Footer';
import Link from 'next/link';
import Image from 'next/image';

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
  const [displayedProfiles, setDisplayedProfiles] = useState<Technician[]>([]);
  const [currentProfileIndex, setCurrentProfileIndex] = useState(() => {
    // Restore last viewed card position from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('thankatech-last-card-index');
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });
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

  const [searchQuery, setSearchQuery] = useState('');
  const [showTokenSendModal, setShowTokenSendModal] = useState(false);
  const [showTokenPurchaseModal, setShowTokenPurchaseModal] = useState(false);
  const [filteredProfiles, setFilteredProfiles] = useState<Technician[]>([]);
  const [allProfiles, setAllProfiles] = useState<Technician[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Note: Technician earnings are handled in the dashboard, not on main page
  
  const profile = (displayedProfiles[currentProfileIndex] || {
    name: '',
    title: '',
    category: '',
    image: '',
    points: 0,
    totalThankYous: 0,
    totalTips: 0
  }) as any;



  // Achievement badges based on milestones
  const getAchievementBadges = (profile: Technician) => {
    const badges = [];
    const totalThankYous = profile.totalThankYous || 0;
    const totalTips = profile.totalTips || 0;

    // ThankATech Points milestones (primary focus)
    if ((profile.points || 0) >= 100) badges.push({ icon: '🌟', text: 'Point Master', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' });
    else if ((profile.points || 0) >= 50) badges.push({ icon: '✨', text: 'Community Star', color: 'bg-blue-100 text-blue-800 border-blue-300' });
    else if ((profile.points || 0) >= 25) badges.push({ icon: '⚡', text: 'Rising Star', color: 'bg-purple-100 text-purple-800 border-purple-300' });

    // Thank you milestones
    if (totalThankYous >= 100) badges.push({ icon: '🏆', text: 'Thank You Champion', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' });
    else if (totalThankYous >= 50) badges.push({ icon: '🥈', text: 'Community Hero', color: 'bg-orange-100 text-orange-800 border-orange-300' });
    else if (totalThankYous >= 25) badges.push({ icon: '🥉', text: 'Appreciated', color: 'bg-green-100 text-green-800 border-green-300' });

    // TOA milestones
    if (totalTips >= 50) badges.push({ icon: '💎', text: 'Diamond TOA Earner', color: 'bg-purple-100 text-purple-800 border-purple-300' });
    else if (totalTips >= 25) badges.push({ icon: '🥇', text: 'Gold TOA Standard', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' });
    else if (totalTips >= 10) badges.push({ icon: '💰', text: 'TOA Earner', color: 'bg-green-100 text-green-800 border-green-300' });

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
    // Update displayed profiles for infinite scroll with first 3 filtered results
    setDisplayedProfiles(filtered.slice(0, 3));
  }, [allProfiles, selectedCategory]);

  // Handle search query changes
  useEffect(() => {
    filterTechnicians(searchQuery);
  }, [searchQuery, filterTechnicians]);

  // Handle category changes
  useEffect(() => {
    filterTechnicians(searchQuery, selectedCategory);
  }, [selectedCategory, filterTechnicians, searchQuery]);

  // Save current card position to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('thankatech-last-card-index', currentProfileIndex.toString());
    }
  }, [currentProfileIndex]);

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
              userType: userData.userType || 'client'
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
              userType: 'client'
            });
          }
        } catch (error) {
          logger.error('Error loading user profile:', error);
          // Still set basic user data from Firebase auth
          setCurrentUser({
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            userType: 'client'
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
          // Initialize with first 3 profiles for infinite scroll
          setDisplayedProfiles(data.slice(0, 3));
          setCurrentProfileIndex(0);
        } else {
          setError('No technician data available');
        }
      } catch (error) {
        logger.error('Failed to load technicians:', error);
        setError('Failed to load technician data');
      } finally {
        setLoading(false);
      }
    };

    loadTechnicians();
  }, []);

  // Infinite scroll logic - load more profiles when approaching the end
  useEffect(() => {
    // Load 2 more profiles when user is within 2 profiles of the end
    if (currentProfileIndex >= displayedProfiles.length - 2 && displayedProfiles.length < profiles.length) {
      const nextBatch = profiles.slice(displayedProfiles.length, displayedProfiles.length + 2);
      setDisplayedProfiles(prev => [...prev, ...nextBatch]);
    }
  }, [currentProfileIndex, displayedProfiles.length, profiles]);

  const flipToNext = useCallback(() => {
    if (isFlipping) return;
    setIsFlipping(true);
    setCurrentProfileIndex((prev) => (prev + 1) % displayedProfiles.length);
    setTimeout(() => setIsFlipping(false), 600);
  }, [isFlipping, displayedProfiles.length]);

  const flipToPrevious = useCallback(() => {
    if (isFlipping) return;
    setIsFlipping(true);
    setCurrentProfileIndex((prev) => (prev - 1 + displayedProfiles.length) % displayedProfiles.length);
    setTimeout(() => setIsFlipping(false), 600);
  }, [isFlipping, displayedProfiles.length]);

  const handleThankYou = async () => {
    if (!currentUser) {
      setShowRegistration(true);
      return;
    }

    try {
      const currentTechnician = displayedProfiles[currentProfileIndex];
      
      // Use new consolidated ThankATech Points system
      const result = await sendFreeThankYou(currentUser.id, currentTechnician.id);
      
      if (!result.success) {
        setError(result.error || 'Failed to send thank you. Please try again.');
        return;
      }
      
      // Update the technician's stats locally (new system: 1 ThankATech Point per thank you)
      setProfiles(prev => prev.map((tech, index) => 
        index === currentProfileIndex 
          ? { 
              ...tech, 
              points: tech.points + 1, // 1 ThankATech Point per thank you
              totalThankYous: (tech.totalThankYous || 0) + 1
            }
          : tech
      ));

      const remainingThanks = result.pointsRemaining || 0;
      setThankYouMessage(`🎉 Thank you sent! You both earned 1 ThankATech Point! ${remainingThanks > 0 ? `(You can thank ${remainingThanks} more technicians today)` : '(Daily thank you limit reached)'}`);
      setShowThankYou(true);
      setTimeout(() => setShowThankYou(false), 4000);
    } catch (error) {
      logger.error('Error sending thank you:', error);
      setError('Failed to send thank you. Please try again.');
    }
  };

  const handleTip = async () => {
    if (!currentUser) {
      setShowRegistration(true);
      return;
    }

    try {
      // Check user's token balance
      const tokenBalance = await getUserTokenBalance(currentUser.id);
      
      if (tokenBalance.tokens > 0) {
        // User has tokens, open token send modal
        setShowTokenSendModal(true);
      } else {
        // User has no tokens, open purchase modal
        setShowTokenPurchaseModal(true);
      }
    } catch (error) {
      console.error('Error checking token balance:', error);
      // Fallback to purchase modal on error
      setShowTokenPurchaseModal(true);
    }
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

  // Show enhanced empty state - still show the full page with helpful content
  if (profiles.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
        {/* Clean background without animated elements */}
        <div className="relative">
          {/* Header */}
          <header className="flex justify-between items-center p-6 bg-black/20 backdrop-blur-sm border-b border-white/10 rounded-2xl mb-8">
            <Link href="/" className="flex items-center gap-3 group cursor-pointer" prefetch={false}>
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-base sm:text-xl font-bold text-white">🔧</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent group-hover:text-blue-400 transition-colors">
                ThankATech
              </span>
            </Link>
            <div className="flex gap-4 items-center">
              {currentUser ? (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-3">
                    {currentUser?.photoURL && (
                      <Image 
                        src={currentUser.photoURL} 
                        alt="Profile" 
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full border-2 border-white/20"
                      />
                    )}
                    <span className="text-gray-300">Welcome, {currentUser?.name}!</span>
                    <button
                      onClick={() => {
                        setCurrentUser(null);
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
            </div>
          </header>

          {/* Empty State Content */}
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center max-w-2xl mx-auto px-4">
              <div className="w-24 h-24 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl sm:text-3xl lg:text-4xl">🔍</span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-4">
                {selectedCategory !== 'all' ? (
                  <>No <span className="text-blue-400">{getCategoryById(selectedCategory)?.name || formatCategory(selectedCategory)}</span> Technicians Found</>
                ) : searchQuery ? (
                  <>No Results for &ldquo;<span className="text-blue-400">{searchQuery}</span>&rdquo;</>
                ) : (
                  <>No Technicians Found in Your Area</>
                )}
              </h1>
              <p className="text-gray-300 text-lg mb-8">
                {selectedCategory !== 'all' || searchQuery ? (
                  <>We couldn&apos;t find any technicians matching your criteria. Try broadening your search or check back later.</>
                ) : (
                  <>We&apos;re currently building our network of technicians in your area. Be the first to join!</>
                )}
              </p>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <button
                  onClick={() => setShowRegistration(true)}
                  className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-900 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
                >
                  <span className="text-xl">🚀</span>
                  Register as Technician
                </button>
                {(selectedCategory !== 'all' || searchQuery) && (
                  <button
                    onClick={() => {setSearchQuery(''); setSelectedCategory('all'); window.location.reload();}}
                    className="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/20 transition-all duration-200 flex items-center justify-center gap-3"
                  >
                    <span className="text-xl">🔄</span>
                    Clear Filters & Reload
                  </button>
                )}
              </div>

              {/* Helpful Tips */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Help Us Grow</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">👥</span>
                    <div>
                      <p className="font-medium text-white">Invite Technicians</p>
                      <p className="text-sm text-gray-300">Know skilled professionals? Invite them to join ThankATech!</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🔄</span>
                    <div>
                      <p className="font-medium text-white">Check Back Soon</p>
                      <p className="text-sm text-gray-300">We&apos;re constantly adding new technicians to our platform.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">📍</span>
                    <div>
                      <p className="font-medium text-white">Expand Your Search</p>
                      <p className="text-sm text-gray-300">Try searching in nearby cities or broader service categories.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">💡</span>
                    <div>
                      <p className="font-medium text-white">Be a Pioneer</p>
                      <p className="text-sm text-gray-300">Be among the first to build our community in your area.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 overflow-hidden">
      {/* Clean background without animated elements */}
      <div className="relative overflow-hidden">
        {/* Header - Clean Mobile Design */}
        <header className="flex justify-between items-center p-3 sm:p-6 bg-slate-800/80 backdrop-blur-sm border border-slate-600/30 rounded-lg sm:rounded-2xl mb-6 sm:mb-8 shadow-lg">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group cursor-pointer" prefetch={false}>
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <span className="text-base sm:text-xl font-bold text-white">🔧</span>
            </div>
            <span className="text-lg sm:text-2xl font-bold text-blue-400 group-hover:text-blue-300 transition-colors">
              ThankATech
            </span>
          </Link>

          {/* Navigation */}
          <div className="flex gap-3 sm:gap-4 items-center">
            {currentUser ? (
              <>
                {/* Dashboard */}
                <Link
                  href="/dashboard"
                  className="px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm sm:text-base"
                >
                  <span className="hidden sm:inline">Dashboard</span>
                  <span className="sm:hidden">📊</span>
                </Link>
                
                {/* Profile */}
                {currentUser?.photoURL && (
                  <Image 
                    src={currentUser.photoURL} 
                    alt="Profile" 
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full border-2 border-white/20"
                  />
                )}

                {/* Points & Tokens */}
                {currentUser?.userType === 'customer' && (
                  <div className="hidden sm:flex items-center gap-2">
                    <div className="flex items-center px-2 py-1 bg-blue-500/20 rounded-lg text-xs">
                      <span className="text-blue-300">⚡{currentUser?.points || 0}</span>
                    </div>
                    <button
                      onClick={() => setShowTokenPurchaseModal(true)}
                      className="flex items-center px-2 py-1 bg-purple-600/80 rounded-lg text-xs hover:bg-purple-600 transition-colors"
                    >
                      <span className="text-white">🪙 TOA</span>
                    </button>
                  </div>
                )}
                
                {/* Logout */}
                <button
                  onClick={() => {
                    setCurrentUser(null);
                    setThankYouMessage('Logged out successfully.');
                    setShowThankYou(true);
                    setTimeout(() => setShowThankYou(false), 3000);
                  }}
                  className="px-3 py-2 bg-red-500/20 text-red-200 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
                >
                  <span className="sm:hidden">🚪</span>
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => setShowSignIn(true)}
                  className="text-gray-300 hover:text-blue-400 transition-colors font-medium text-sm sm:text-base px-3 py-2"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => setShowRegistration(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm sm:text-base"
                >
                  Join
                </button>
              </>
            )}
          </div>
        </header>

        {/* Hero Section - Mobile Enhanced */}
        <div className="text-center mb-6 sm:mb-8 px-3 sm:px-4">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent mb-3 sm:mb-4 leading-tight">
            🛠 Meet Your Local Tech Heroes
          </h1>
          <p className="text-gray-300 text-base sm:text-lg mb-4 sm:mb-6 max-w-2xl mx-auto leading-relaxed">
            Skilled technicians ready to help you. Browse profiles and connect instantly.
          </p>
          
          {/* Search Input - Right above technician showcase */}
          <div className="w-full max-w-2xl mx-auto mb-6 sm:mb-8">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, service type, or location..."
                className="w-full pl-4 pr-12 sm:pl-6 sm:pr-20 py-3 sm:py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl sm:rounded-2xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 shadow-lg text-sm sm:text-base placeholder:text-sm sm:placeholder:text-base"
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                {searchQuery && (
                  <button
                    onClick={() => {setSearchQuery(''); filterTechnicians('');}}
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                )}
                <span className="text-gray-400">🔍</span>
              </div>
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
        </div>

      {/* Main Content */}
      <div className="flex flex-col items-center space-y-6 sm:space-y-8">
        
        {/* Sample Data Notice */}
                {/* Location Permission Banner */}
        {locationPermission === 'denied' && (
          <div className="mb-6 sm:mb-8 bg-gradient-to-r from-blue-500/20 to-blue-600/20 backdrop-blur-sm border border-blue-300/30 rounded-2xl p-4">
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



        {/* Modern Glass Rolodex Card - Enhanced Mobile */}
        <div id="rolodex-card" className="card-container mobile-relative group relative flex justify-center w-full max-w-sm sm:max-w-lg lg:max-w-3xl mx-auto px-2 sm:px-0">
          {/* Rolodex background layers - properly contained for desktop only */}
          <div className="absolute top-2 left-2 right-2 bottom-2 bg-gradient-to-br from-blue-400/10 to-teal-500/10 backdrop-blur-sm rounded-xl sm:rounded-2xl transform rotate-1 transition-all duration-500 group-hover:rotate-2 border border-white/10 shadow-xl hidden sm:block"></div>
          <div className="absolute top-1 left-1 right-1 bottom-1 bg-gradient-to-br from-blue-400/15 to-teal-500/15 backdrop-blur-sm rounded-xl sm:rounded-2xl transform rotate-0.5 transition-all duration-500 group-hover:rotate-1 border border-white/15 shadow-2xl hidden sm:block"></div>
          
          {/* Main Glass Card - Mobile Optimized */}
          <div className="relative w-full bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl sm:rounded-2xl shadow-2xl transition-all duration-500 group-hover:shadow-3xl group-hover:-translate-y-1 sm:group-hover:-translate-y-2 group-hover:bg-white/15 overflow-hidden z-10">
            {/* Category Badge - Top Right */}
        <div className="absolute top-4 right-4 z-10">
          <div className="flex items-center gap-2 bg-gradient-to-r from-blue-500/80 to-teal-600/80 backdrop-blur-sm border border-white/30 rounded-full px-3 py-1.5 shadow-lg">
            <span className="text-base sm:text-lg">{getCategoryIcon(profile.category, profile.title)}</span>
            <span className="hidden sm:inline text-white text-sm font-medium">
              {formatCategory(profile.category)}
            </span>
          </div>
        </div>            {/* Card Content - Mobile Enhanced */}
            <div className="relative p-4 sm:p-6 lg:p-8 h-full min-h-[16rem] profile-card-mobile sm:min-h-[20rem] lg:min-h-[24rem]">

            <div className="flex flex-col h-full">
              {/* Header Section - Mobile Optimized */}
              <div className="flex items-start space-x-3 sm:space-x-4 mb-3 sm:mb-4">
                {/* Profile Image with mobile optimization */}
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-xl sm:rounded-2xl overflow-hidden shadow-lg ring-2 sm:ring-4 ring-white/50">
                    <Image
                      src={profile.photoURL || profile.image}
                      alt={profile.name}
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to placeholder avatar if image fails to load
                        const target = e.currentTarget as HTMLImageElement;
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&size=96&background=0ea5e9&color=ffffff&bold=true`;
                      }}
                    />
                  </div>
                  {/* ThankATech Points Display - Mobile Optimized */}
                  <div className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 bg-gradient-to-r from-blue-400 to-purple-500 text-white rounded-full w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 flex items-center justify-center font-bold shadow-lg border border-white">
                    <div className="text-center">
                      <div className="text-xs sm:text-xs font-black">{profile.points || 0}</div>
                      <div className="text-xs -mt-0.5 hidden sm:block">⚡</div>
                    </div>
                  </div>
                </div>

                {/* Name and Essential Info - Mobile Responsive */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white leading-tight">{profile.name}</h2>
                  <p className="text-sm sm:text-base lg:text-lg text-blue-200 font-semibold mt-1 leading-tight">{profile.businessName || profile.title}</p>
                  
                  {/* Verified Badge - Single clean indicator */}
                  <div className="mt-2">
                    <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm font-medium border border-blue-400/30 flex items-center gap-2 w-fit">
                      ✓ Verified Technician
                    </span>
                  </div>
                  
                  {/* Only show distance if available - Mobile optimized */}
                  {profile.distance !== undefined && profile.distance < 100 && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs sm:text-sm text-gray-200 flex items-center">
                        🚗 {profile.distance.toFixed(1)} miles away
                      </span>
                      {profile.isNearby && (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                          📍 Nearby
                        </span>
                      )}
                    </div>
                  )}
                  {/* Show location instead of distance if too far */}
                  {(profile.distance === undefined || profile.distance >= 100) && profile.businessAddress && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs sm:text-sm text-gray-200 flex items-center">
                        📍 {profile.businessAddress.split(',').slice(-2).join(',').trim()}
                      </span>
                    </div>
                  )}

                  {/* Key Metrics - Mobile optimized layout */}
                  <div className="flex flex-wrap gap-2 sm:gap-3 mt-3 mb-2">
                    <span className="text-xs sm:text-sm text-gray-300 flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded-full">
                      ⚡ <span className="text-white font-medium">{profile.points || 0}</span>
                      <span className="hidden sm:inline text-xs">Points</span>
                    </span>
                    <span className="text-xs sm:text-sm text-gray-300 flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded-full">
                      🙏 <span className="text-white font-medium">{profile.totalThankYous || 0}</span>
                      <span className="hidden sm:inline text-xs">Thanks</span>
                    </span>
                    <span className="text-xs sm:text-sm text-gray-300 flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded-full">
                      🪙 <span className="text-white font-medium">{profile.totalTips || 0}</span>
                      <span className="hidden sm:inline text-xs">TOA</span>
                    </span>
                  </div>
                  
                  {/* Single Achievement Badge - Only show the most impressive one */}
                  {achievementBadges.length > 0 && (
                    <div className="mt-2 mb-3">
                      <span 
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${achievementBadges[0].color} shadow-sm`}
                        title={`Achievement: ${achievementBadges[0].text}`}
                      >
                        <span>{achievementBadges[0].icon}</span>
                        <span>{achievementBadges[0].text}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Content Section - Simplified with consistent styling */}
              <div className={`${expandedCard ? 'grid grid-cols-1 lg:grid-cols-2 gap-4' : 'space-y-3'}`}>
                {/* Left Column - About & Basic Info */}
                <div className="space-y-3">
                  {/* Short Emotional Hook Bio - Mobile Enhanced */}
                  <div className="bg-white/90 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 border border-white/20 shadow-sm">
                    <p className="text-xs sm:text-sm text-gray-800 leading-relaxed">
                      {profile.about 
                        ? profile.about.split('.').slice(0, 2).join('.') + (profile.about.split('.').length > 2 ? '.' : '')
                        : `Professional ${formatCategory(profile.category || profile.title || '')} with quality service and care.`
                      }
                    </p>
                    <p className="text-xs text-gray-600 mt-2 font-medium">Free estimates • Full warranty</p>
                  </div>

                  {/* Basic Contact Info Grid - Only show when expanded, unified styling */}
                  {expandedCard && (
                    <div className="grid grid-cols-2 gap-2">
                  {profile.businessPhone && (
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 border border-white/20 shadow-sm">
                      <div className="flex items-center space-x-2">
                        <span className="text-blue-600">📞</span>
                        <span className="text-xs text-gray-800 font-medium">{profile.businessPhone}</span>
                      </div>
                    </div>
                  )}
                  {profile.businessEmail && (
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 border border-white/20 shadow-sm col-span-2">
                      <div className="flex items-start space-x-2">
                        <span className="text-blue-600 mt-0.5">✉</span>
                        <span className="text-xs text-gray-800 font-medium break-all leading-relaxed">{profile.businessEmail}</span>
                      </div>
                    </div>
                  )}
                  {profile.website && (
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 border border-white/20 shadow-sm">
                      <div className="flex items-center space-x-2">
                        <span className="text-blue-600">🌐</span>
                        <a 
                          href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gray-800 font-medium hover:text-blue-600 hover:underline transition-colors"
                        >
                          {formatWebsiteTitle(profile.website)}
                        </a>
                      </div>
                    </div>
                  )}
                  {profile.businessAddress && (
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 border border-white/20 shadow-sm">
                      <div className="flex items-center space-x-2">
                        <span className="text-blue-600">📍</span>
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(profile.businessAddress)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gray-800 font-medium hover:text-blue-600 hover:underline transition-colors break-words leading-relaxed"
                        >
                          {profile.businessAddress}
                        </a>
                      </div>
                    </div>
                  )}
                  {profile.hourlyRate && (
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 border border-white/20 shadow-sm">
                      <div className="flex items-center space-x-2">
                        <span className="text-blue-600">💰</span>
                        <span className="text-xs text-gray-800 font-medium">{profile.hourlyRate}/hr</span>
                      </div>
                    </div>
                  )}
                  {profile.experience && (
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 border border-white/20 shadow-sm relative">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-blue-600">⚡</span>
                        <span className="text-xs text-gray-800 font-medium">
                          {profile.experience ? profile.experience.replace(/[^\d]+/, '') + ' yr' : ''}
                        </span>
                        <span className="text-xs text-gray-500 ml-1">Experience</span>
                      </div>
                    </div>
                  )}
                  {profile.availability && (
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 border border-white/20 shadow-sm">
                      <div className="flex items-center space-x-2">
                        <span className="text-blue-600">🕐</span>
                        <span className="text-xs text-gray-800 font-medium">{profile.availability}</span>
                      </div>
                    </div>
                  )}
                  {profile.serviceArea && (
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 border border-white/20 shadow-sm">
                      <div className="flex items-center space-x-2">
                        <span className="text-blue-600">🗺</span>
                        <span className="text-xs text-gray-800 font-medium">{profile.serviceArea}</span>
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
                      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 border border-white/20 shadow-sm">
                        <h4 className="text-sm font-semibold text-gray-800 mb-2">🏆 Certifications & Licenses</h4>
                        <p className="text-xs text-gray-700 max-h-32 overflow-y-auto">{profile.certifications}</p>
                      </div>
                    )}
                    
                    {/* Service Specialties */}
                    <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 border border-white/20 shadow-sm">
                      <h4 className="text-sm font-semibold text-gray-800 mb-2">🔧 Service Specialties</h4>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                          <span>{getCategoryIcon(profile.category, profile.title)}</span>
                          {formatCategory(profile.category)}
                        </span>
                        {profile.experience && (
                          <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">
                            {profile.experience && /\d+/.test(profile.experience)
                              ? profile.experience.replace(/[^\d]+/, '') + ' yr Experience'
                              : profile.experience}
                          </span>
                        )}
                        {profile.certifications && (
                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">✓ Certified</span>
                        )}
                      </div>
                    </div>

                    {/* Achievement Badges Section */}
                    {achievementBadges.length > 0 && (
                      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 border border-white/20 shadow-sm">
                        <h4 className="text-sm font-semibold text-gray-800 mb-2">🏆 Top Achievements</h4>
                        <div className="space-y-2">
                          {achievementBadges.slice(0, 2).map((badge, index) => (
                            <div key={index} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-50">
                              <span className="text-lg">{badge.icon}</span>
                              <div className="flex-1">
                                <span className="text-sm font-medium text-gray-800">{badge.text}</span>
                              </div>
                            </div>
                          ))}
                          {achievementBadges.length > 2 && (
                            <div className="text-xs text-gray-600 text-center">+{achievementBadges.length - 2} more achievements</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ThankATech Points Summary */}
                    <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 border border-white/20 shadow-sm">
                      <h4 className="text-sm font-semibold text-gray-800 mb-2">⚡ Community Appreciation</h4>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">ThankATech Points earned</span>
                        <span className="font-bold text-blue-600 text-sm">{profile.points || 0} ⚡</span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {profile.totalThankYous || 0} thanks • {profile.totalTips || 0} TOA received
                      </div>
                    </div>

                    {/* Quick Contact Actions - Moved from main card */}
                    <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 border border-white/20 shadow-sm">
                      <h4 className="text-sm font-semibold text-gray-800 mb-3">📞 Quick Contact</h4>
                      <div className="flex items-center justify-center space-x-3">
                        {profile.businessEmail && (
                          <button 
                            onClick={() => {
                              const subject = `Inquiry about ${profile.businessName} services`;
                              const body = `Hello ${profile.name},\n\nI found your profile on ThankATech and I'm interested in your ${profile.category} services.\n\nPlease let me know your availability.\n\nThank you!`;
                              window.location.href = `mailto:${profile.businessEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                            }}
                            className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-2 transition-all duration-200 shadow-sm hover:shadow-md flex items-center space-x-2 hover:scale-105"
                            title="Send Email"
                          >
                            <span className="text-sm">💬</span>
                            <span className="text-xs font-medium">Email</span>
                          </button>
                        )}
                        {profile.businessPhone && (
                          <button 
                            onClick={() => {
                              window.location.href = `tel:${profile.businessPhone}`;
                            }}
                            className="bg-green-500 hover:bg-green-600 text-white rounded-lg px-4 py-2 transition-all duration-200 shadow-sm hover:shadow-md flex items-center space-x-2 hover:scale-105"
                            title="Call Now"
                          >
                            <span className="text-sm">📞</span>
                            <span className="text-xs font-medium">Call</span>
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
                            className="bg-purple-500 hover:bg-purple-600 text-white rounded-lg px-4 py-2 transition-all duration-200 shadow-sm hover:shadow-md flex items-center space-x-2 hover:scale-105"
                            title="Visit Website"
                          >
                            <span className="text-sm">🌐</span>
                            <span className="text-xs font-medium">Website</span>
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
                            className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-4 py-2 transition-all duration-200 shadow-sm hover:shadow-md flex items-center space-x-2 hover:scale-105"
                            title="Get Directions"
                          >
                            <span className="text-sm">📍</span>
                            <span className="text-xs font-medium">Directions</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </div>



              {/* Bottom Section - Mobile Enhanced Action Buttons */}
              <div className="mt-auto pt-3 sm:pt-4 border-t border-white/20 space-y-3 sm:space-y-4">
                {/* Mobile-Optimized Action Buttons */}
                <div className="mobile-action-buttons flex flex-col sm:flex-row gap-2 sm:gap-4 w-full">
                  <button 
                    onClick={handleThankYou}
                    className="mobile-btn mobile-touch-feedback group flex items-center justify-center space-x-2 sm:space-x-3 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-blue-500 to-blue-600 backdrop-blur-sm rounded-xl sm:rounded-2xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-blue-500/25 hover:-translate-y-1 flex-1 font-semibold"
                  >
                    <span className="text-white text-base sm:text-lg group-hover:scale-110 transition-transform duration-200">🙏</span>
                    <span className="text-white text-sm sm:text-base">Say Thank You</span>
                  </button>
                  <button 
                    onClick={handleTip}
                    className="mobile-btn mobile-touch-feedback group flex items-center justify-center space-x-2 sm:space-x-3 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-emerald-500 to-teal-600 backdrop-blur-sm rounded-xl sm:rounded-2xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-emerald-500/25 hover:-translate-y-1 flex-1 font-semibold"
                  >
                    <span className="text-white text-base sm:text-lg group-hover:scale-110 transition-transform duration-200">🪙</span>
                    <span className="text-white text-sm sm:text-base">Send TOA</span>
                  </button>
                </div>
                
                {/* View Profile Button - Mobile Friendly */}
                {profile.username && (
                  <div className="text-center">
                    <Link 
                      href={`/${profile.username}`}
                      className="mobile-btn inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-violet-700 hover:from-purple-700 hover:to-violet-800 text-white font-medium px-4 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg text-sm"
                    >
                      <span>View Full Profile</span>
                      <span>→</span>
                    </Link>
                  </div>
                )}
                
                {/* Minimal Stats - Mobile Optimized */}
                <div className="flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-300">
                  <span className="flex items-center gap-1">
                    <span className="text-blue-400">⚡</span>
                    <span className="text-white font-medium">{profile.points || 0}</span>
                    <span className="hidden sm:inline">Points</span>
                  </span>
                  <span className="text-gray-500">•</span>
                  <span className="flex items-center gap-1">
                    <span className="text-emerald-400">🪙</span>
                    <span className="text-white font-medium">{profile.totalTips || 0}</span>
                    <span className="hidden sm:inline">TOA</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Separate section for controls and buttons - prevents overlapping */}
      <div className="action-buttons-container hidden">
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
            className="group flex items-center justify-center space-x-2 lg:space-x-3 px-6 py-3 lg:px-8 lg:py-4 bg-gradient-to-r from-blue-400 to-blue-500 backdrop-blur-sm rounded-xl lg:rounded-2xl hover:from-blue-500 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-blue-400/25 hover:-translate-y-1 min-h-[48px] lg:min-h-[56px] flex-1"
          >
            <span className="text-white text-lg lg:text-xl group-hover:scale-110 transition-transform duration-200">🙏</span>
            <span className="font-semibold text-white text-sm lg:text-base">Say Thank You</span>
          </button>
          <button 
            onClick={handleTip}
            className="group flex items-center justify-center space-x-2 lg:space-x-3 px-6 py-3 lg:px-8 lg:py-4 bg-gradient-to-r from-emerald-500 to-teal-600 backdrop-blur-sm rounded-xl lg:rounded-2xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-emerald-500/25 hover:-translate-y-1 min-h-[48px] lg:min-h-[56px] flex-1"
          >
            <span className="text-white text-lg lg:text-xl group-hover:scale-110 transition-transform duration-200">🪙</span>
            <span className="font-semibold text-white text-sm lg:text-base">Send Tokens</span>
          </button>
        </div>
            </div>
          </div>

      {/* Infinite Scroll Navigation - Mobile Enhanced */}
      <div className="flex items-center justify-center gap-2 sm:gap-4 mt-4 sm:mt-6 mb-6 sm:mb-8 px-2 sm:px-4">
        {/* Previous Button - Mobile Optimized */}
        <button
          onClick={flipToPrevious}
          disabled={currentProfileIndex === 0}
          className={`mobile-btn group flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 shadow-md ${
            currentProfileIndex === 0
              ? 'bg-gray-400/20 text-gray-400 cursor-not-allowed border border-gray-400/20'
              : 'bg-white/10 backdrop-blur-lg border border-white/30 text-white hover:bg-white/20 hover:scale-105 hover:shadow-lg hover:border-white/40'
          }`}
        >
          <svg className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform ${currentProfileIndex === 0 ? '' : 'group-hover:-translate-x-1'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">Prev</span>
        </button>

        {/* Mobile-Optimized Info */}
        <div className="flex items-center gap-1 sm:gap-3">
          {/* Counter - Always visible */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/30 rounded-lg px-2 sm:px-3 py-1.5 shadow-md" title="Use arrow keys to navigate">
            <span className="text-white font-medium text-xs sm:text-sm">
              {currentProfileIndex + 1} of {profiles.length}
            </span>
          </div>
          
          {/* Location Indicator - Hidden on mobile, shown on larger screens */}
          <div className="hidden sm:block bg-white/10 backdrop-blur-lg border border-white/30 rounded-lg px-3 py-1.5 shadow-md" title="Technicians sorted by distance from your location">
            <div className="flex items-center gap-2">
              <span className="text-blue-300">📍</span>
              <span className="text-white font-medium text-sm">
                Sorted by distance
              </span>
            </div>
          </div>
          

        </div>

        {/* Next Button - Mobile Optimized */}
        <button
          onClick={flipToNext}
          disabled={currentProfileIndex >= displayedProfiles.length - 1}
          className={`mobile-btn group flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 shadow-md ${
            currentProfileIndex >= displayedProfiles.length - 1
              ? 'bg-gray-400/20 text-gray-400 cursor-not-allowed border border-gray-400/20'
              : 'bg-white/10 backdrop-blur-lg border border-white/30 text-white hover:bg-white/20 hover:scale-105 hover:shadow-lg hover:border-white/40'
          }`}
        >
          <span className="hidden sm:inline">Next</span>
          <svg className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform ${currentProfileIndex >= displayedProfiles.length - 1 ? '' : 'group-hover:translate-x-1'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Categories Filter - Moved below technician showcase */}
      <div className="mt-6 sm:mt-8 mb-6 sm:mb-8 px-4">
        <div className="text-center mb-4 sm:mb-6">
          <h2 className="text-xl font-bold text-white mb-2">
            Filter by Category
          </h2>
          <p className="text-gray-400 text-sm">Narrow down your search by service type</p>
        </div>
        
        {/* Mobile-Responsive Category Grid */}
  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4 w-full max-w-4xl mx-auto my-4 sm:my-6">
          {/* Build responsive grid: All + categories */}
          {[
            { id: 'all', icon: '🔧', name: 'All', isAll: true },
            ...TECHNICIAN_CATEGORIES.slice(0, 9)
          ].map((category, idx) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`mobile-btn group px-2 sm:px-4 lg:px-8 py-3 sm:py-4 min-h-[44px] w-full rounded-lg sm:rounded-xl backdrop-blur-sm border transition-all duration-200 hover:scale-105 ${
                selectedCategory === category.id
                  ? category.id === 'all'
                    ? 'bg-gradient-to-r from-green-600/30 to-green-800/30 border-green-400/50 shadow-lg'
                    : 'bg-gradient-to-r from-blue-600/30 to-blue-800/30 border-blue-400/50 shadow-lg'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
              }`}
            >
              <div className="text-sm sm:text-base lg:text-lg mb-1 group-hover:scale-110 transition-transform duration-200">
                {category.icon}
              </div>
              <div className="text-white text-xs font-medium text-center leading-tight break-words">
                {category.id === 'all' ? 'All' : (() => {
                  // Mobile-friendly category name mapping
                  const mobileNames: {[key: string]: string} = {
                    'information-technology': 'IT',
                    'electrical': 'Wiring',
                    'mechanical': 'Mechanic',
                    'electronics': 'Devices',
                    'telecommunications': 'Telecom',
                    'medical-equipment': 'Medical',
                    'field-service': 'Field',
                    'building-systems': 'Building',
                    'creative-tech': 'Creative',
                    'software-web': 'Software'
                  };
                  return mobileNames[category.id] || category.name.split(' ')[0];
                })()}
              </div>
            </button>
          ))}
        </div>
        
        {/* Filter Status */}
        <div className="mt-4 text-center">
          {selectedCategory !== 'all' ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 border border-blue-400/30 rounded-full">
              <span className="text-blue-300 text-sm">
                {profiles.length} {getCategoryById(selectedCategory)?.name || formatCategory(selectedCategory)} technician{profiles.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => setSelectedCategory('all')}
                className="text-blue-400 hover:text-blue-300 text-xs underline ml-1"
              >
                Clear
              </button>
            </div>
          ) : (
            <div className="text-gray-400 text-sm">
              {profiles.length} technician{profiles.length !== 1 ? 's' : ''} available
            </div>
          )}
        </div>
      </div>

      {/* Spacer before footer */}
      <div className="h-6 sm:h-8"></div>

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


      {/* Token Send Modal */}
      <TokenSendModal
        isOpen={showTokenSendModal}
        onClose={() => setShowTokenSendModal(false)}
        technicianId={displayedProfiles[currentProfileIndex]?.id || ''}
        technicianName={displayedProfiles[currentProfileIndex]?.name || ''}
        userId={currentUser?.id || ''}
      />

      {/* Token Send Modal */}
      <TokenSendModal
        isOpen={showTokenSendModal}
        onClose={() => setShowTokenSendModal(false)}
        technicianId={displayedProfiles[currentProfileIndex]?.id || ''}
        technicianName={displayedProfiles[currentProfileIndex]?.name || displayedProfiles[currentProfileIndex]?.businessName || ''}
        userId={currentUser?.id || ''}
      />

      {/* Token Purchase Modal */}
      <TokenPurchaseModal
        isOpen={showTokenPurchaseModal}
        onClose={() => setShowTokenPurchaseModal(false)}
        userId={currentUser?.id || ''}
        onPurchaseSuccess={(tokens) => {
          logger.info(`User purchased ${tokens} tokens`);
          // Could show a success message or update UI here
        }}
      />
    </div>
  );
}




