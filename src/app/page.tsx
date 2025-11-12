"use client";

import { useState, useEffect, useCallback } from 'react';

// Force dynamic rendering for this page since it uses Firebase Auth
export const dynamic = 'force-dynamic';
import { fetchTechnicians, getUserLocation } from '../lib/techniciansApi.js';
import { logger } from '../lib/logger';
import { sendThankYou, auth, authHelpers, getTechnician, getUser } from '../lib/firebase';
import { getUserTokenBalance, sendFreeThankYou } from '../lib/token-firebase';
import { TECHNICIAN_CATEGORIES, getCategoryById, mapLegacyCategoryToNew } from '../lib/categories';
import Registration from '../components/Registration';
import SignIn from '../components/SignIn';
import Avatar from '../components/Avatar';
import ForgotPassword from '../components/ForgotPassword';
import TokenSendModal from '../components/TokenSendModal';
import TokenPurchaseModal from '../components/TokenPurchaseModal';
import UniversalHeader from '../components/UniversalHeader';
import Footer from '../components/Footer';
import { RolodexCard } from '../components/RolodexCard';
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


const MainPageHeader = ({ currentUser, onSignIn, onRegister, onTokenPurchase, onLogout }: {
  currentUser: any;
  onSignIn: () => void;
  onRegister: () => void;
  onTokenPurchase: () => void;
  onLogout: () => void;
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10 rounded-xl sm:rounded-2xl mb-4 sm:mb-8 shadow-lg">
        <div className="max-w-md mx-auto px-3 py-3 sm:max-w-7xl sm:px-4 lg:px-8 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Logo - Always Visible */}
            <Link href="/" className="flex items-center gap-2 sm:gap-3 group cursor-pointer" prefetch={false}>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-base sm:text-xl font-bold">🔧</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent group-hover:text-blue-400 transition-colors">
                ThankATech
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden sm:flex gap-3 sm:gap-4 items-center">
              {currentUser ? (
                <>
                  <Link
                    href="/dashboard"
                    className="px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm sm:text-base"
                  >
                    Dashboard
                  </Link>
                  
                  <Avatar
                    name={currentUser.name}
                    photoURL={currentUser.photoURL}
                    size={32}
                    className="border-2 border-white/20"
                    textSize="text-sm"
                  />

                  {currentUser?.userType === 'customer' && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center px-2 py-1 bg-blue-500/20 rounded-lg text-xs">
                        <span className="text-blue-300">⚡{currentUser?.points || 0}</span>
                      </div>
                      <button
                        onClick={onTokenPurchase}
                        className="flex items-center px-2 py-1 bg-purple-600/80 rounded-lg text-xs hover:bg-purple-600 transition-colors"
                      >
                        <span className="text-white">🪙 TOA</span>
                      </button>
                    </div>
                  )}
                  
                  <button
                    onClick={onLogout}
                    className="px-3 py-2 bg-red-500/20 text-red-200 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={onSignIn}
                    className="text-gray-300 hover:text-blue-400 transition-colors font-medium text-sm sm:text-base px-3 py-2"
                  >
                    Sign In
                  </button>
                  <button 
                    onClick={onRegister}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm sm:text-base"
                  >
                    Join
                  </button>
                </>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="sm:hidden p-2 text-white hover:text-blue-400 transition-colors"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="sm:hidden bg-white/10 backdrop-blur-xl border-t border-white/20">
            <div className="max-w-md mx-auto px-3 py-4 space-y-3">
              {currentUser ? (
                <>
                  <div className="flex items-center gap-3 pb-3 border-b border-white/20">
                    <Avatar
                      name={currentUser.name}
                      photoURL={currentUser.photoURL}
                      size={40}
                      className="border-2 border-white/20"
                      textSize="text-base"
                    />
                    <div>
                      <p className="text-white font-medium">Welcome, {currentUser.name?.split(' ')[0] || 'User'}!</p>
                      {currentUser?.points && currentUser.points > 0 && (
                        <p className="text-blue-300 text-sm">⚡ {currentUser.points} Points</p>
                      )}
                    </div>
                  </div>

                  <Link
                    href="/dashboard"
                    className="block w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium text-center hover:bg-blue-700 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    📊 Dashboard
                  </Link>

                  <button
                    onClick={() => {
                      onLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="block w-full px-4 py-3 bg-red-500/20 text-red-200 rounded-lg font-medium text-center hover:bg-red-500/30 transition-colors"
                  >
                    🚪 Logout
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => {
                      onSignIn();
                      setIsMobileMenuOpen(false);
                    }}
                    className="block w-full px-4 py-3 bg-white/10 text-white rounded-lg font-medium text-center hover:bg-white/20 transition-colors"
                  >
                    Sign In
                  </button>
                  <button 
                    onClick={() => {
                      onRegister();
                      setIsMobileMenuOpen(false);
                    }}
                    className="block w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium text-center hover:bg-blue-700 transition-colors"
                  >
                    Join ThankATech
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
};

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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
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
    else if (totalTips >= 25) badges.push({ icon: '🥇', text: 'Gold TOA Recipient', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' });
    else if (totalTips >= 10) badges.push({ icon: '🪙', text: 'TOA Earner', color: 'bg-green-100 text-green-800 border-green-300' });

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
          technician.name?.toLowerCase().includes(searchTerm) ||
          technician.category?.toLowerCase().includes(searchTerm) ||
          technician.title?.toLowerCase().includes(searchTerm) ||
          technician.businessName?.toLowerCase().includes(searchTerm) ||
          technician.businessAddress?.toLowerCase().includes(searchTerm) ||
          technician.serviceArea?.toLowerCase().includes(searchTerm);
        
        if (basicMatch) return true;
        
        // Search in subcategories - find the main category and search its subcategories
        const techCategory = technician.category || '';
        const mappedCategoryId = mapLegacyCategoryToNew(techCategory);
        const categoryObj = getCategoryById(mappedCategoryId);
        
        if (categoryObj && categoryObj.subcategories) {
          return categoryObj.subcategories.some(sub => 
            sub?.toLowerCase().includes(searchTerm)  
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

  // Check URL parameter to auto-open registration modal
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const shouldRegister = urlParams.get('register');
      
      if (shouldRegister === 'true') {
        // Small delay to ensure auth state is loaded
        setTimeout(() => {
          setShowRegistration(true);
          // Clean up URL parameter
          window.history.replaceState({}, '', '/');
        }, 500);
      }
    }
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
        cat.id === existingCat || cat.name?.toLowerCase() === existingCat?.toLowerCase()
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
      const result = await sendFreeThankYou(currentUser.uid, currentTechnician.id);
      
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
      setThankYouMessage(`🎉 Thank you sent! Technician earned 1 ThankATech Point! ${remainingThanks > 0 ? `(You can thank ${remainingThanks} more technicians today)` : '(Daily thank you limit reached)'}`);
      setShowThankYou(true);
      setTimeout(() => setShowThankYou(false), 4000);
    } catch (error) {
      logger.error('Error sending thank you:', error);
      setError('Failed to send thank you. Please try again.');
    }
  };

  const handleSendTOA = async () => {
    if (!currentUser) {
      setShowRegistration(true);
      return;
    }

    try {
      // Check user's token balance using Auth UID (not document ID)
      const tokenBalance = await getUserTokenBalance(currentUser.uid);
      
      if (tokenBalance.tokens > 0) {
        // User has tokens, open token send modal
        setShowTokenSendModal(true);
      } else {
        // User has no tokens, open purchase modal
        setShowTokenPurchaseModal(true);
      }
    } catch (error) {
      logger.error('Error checking token balance:', error);
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-2 sm:p-4 iphone-safe-top iphone-safe-bottom">
        {/* Clean background without animated elements */}
        <div className="relative max-w-md mx-auto sm:max-w-none">
          {/* Header - Optimized for iPhone 12 Pro Max */}
          <header className="flex justify-between items-center p-3 sm:p-6 bg-black/20 backdrop-blur-sm border-b border-white/10 rounded-xl sm:rounded-2xl mb-4 sm:mb-8 iphone-nav">
            <Link href="/" className="flex items-center gap-2 sm:gap-3 group cursor-pointer iphone-touch-target" prefetch={false}>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-sm sm:text-base lg:text-xl font-bold text-white">🔧</span>
              </div>
              <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent group-hover:text-blue-400 transition-colors">
                ThankATech
              </span>
            </Link>
            <div className="flex gap-2 sm:gap-4 items-center">
              {currentUser ? (
                <div className="flex items-center space-x-2 sm:space-x-4">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <Avatar
                      name={currentUser.name}
                      photoURL={currentUser.photoURL}
                      size={32}
                      className="w-7 h-7 sm:w-8 sm:h-8 border-2 border-white/20"
                      textSize="text-xs"
                    />
                    <span className="text-gray-300 text-sm sm:text-base hidden sm:inline">Welcome, {currentUser?.name}!</span>
                    <span className="text-gray-300 text-sm sm:hidden">{currentUser?.name?.split(' ')[0]}</span>
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

          {/* Compact Empty State - Friendly & Actionable */}
          <div className="flex items-center justify-center min-h-[40vh] sm:min-h-[50vh]">
            <div className="text-center max-w-lg mx-auto px-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-blue-400/20 to-cyan-500/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-300/30">
                <span className="text-xl sm:text-2xl">🔍</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                {selectedCategory !== 'all' ? (
                  <>No {getCategoryById(selectedCategory)?.name || formatCategory(selectedCategory)} Found</>
                ) : searchQuery ? (
                  <>No Results for "{searchQuery}"</>
                ) : (
                  <>Building Our Network</>
                )}
              </h2>
              <p className="text-gray-300 text-sm sm:text-base mb-6 leading-relaxed">
                {selectedCategory !== 'all' || searchQuery ? (
                  <>Try adjusting your search or browse all categories</>
                ) : (
                  <>Help us grow by inviting skilled technicians to join ThankATech</>
                )}
              </p>
              
              {/* Quick Actions */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
                <button
                  onClick={() => setShowRegistration(true)}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-xl font-medium hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <span className="text-lg">🚀</span>
                  Join as Technician
                </button>
                {(selectedCategory !== 'all' || searchQuery) && (
                  <button
                    onClick={() => {
                      setSearchQuery(''); 
                      setSelectedCategory('all');
                    }}
                    className="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-6 py-3 rounded-xl font-medium hover:bg-white/20 transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <span className="text-lg">🔄</span>
                    View All
                  </button>
                )}
              </div>

              {/* Simple Tips */}
              <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 backdrop-blur-sm border border-blue-300/20 rounded-xl p-4">
                <div className="flex items-center justify-center gap-6 text-sm text-gray-300">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-300">👥</span>
                    <span>Invite skilled pros</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-300">🔄</span>
                    <span>Check back soon</span>
                  </div>
                  <div className="hidden sm:flex items-center gap-2">
                    <span className="text-green-300">📍</span>
                    <span>Try nearby areas</span>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      {/* Clean background without animated elements */}
      <div className="relative">
        {/* Header - Universal Design */}
        <UniversalHeader
          currentUser={currentUser ? {
            id: currentUser.uid || currentUser.id,
            name: currentUser.displayName || currentUser.name,
            email: currentUser.email,
            photoURL: currentUser.photoURL,
            userType: currentUser.userType,
            points: currentUser.points
          } : undefined}
          onSignOut={() => {
            setCurrentUser(null);
            setThankYouMessage('Logged out successfully.');
            setShowThankYou(true);
            setTimeout(() => setShowThankYou(false), 3000);
          }}
          onSignIn={() => setShowSignIn(true)}
          onRegister={() => setShowRegistration(true)}
          currentPath="/"
        />

        <main className="relative max-w-md mx-auto px-3 py-6 sm:max-w-7xl sm:px-4 lg:px-8 sm:py-12">
          <div className="text-center mb-6 sm:mb-8">
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



        {/* RolodexCard Component - Brand-aligned button hierarchy */}
        <RolodexCard 
          technician={profile}
          onThankYou={handleThankYou}
          onSendTOA={handleSendTOA}
          showActions={true}
        />
      </div>

      {/* Infinite Scroll Navigation - Compact mobile */}
      <div className="flex items-center justify-center gap-2 mt-4 mb-6 px-4">
        {/* Previous Button - Compact size */}
        <button
          onClick={flipToPrevious}
          disabled={currentProfileIndex === 0}
          className={`group flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 shadow-md min-h-[44px] ${
            currentProfileIndex === 0
              ? 'bg-gray-400/20 text-gray-400 cursor-not-allowed border border-gray-400/20'
              : 'bg-white/10 backdrop-blur-lg border border-white/30 text-white hover:bg-white/20 hover:scale-105 hover:shadow-lg hover:border-white/40'
          }`}
        >
          <svg className={`w-3.5 h-3.5 transition-transform ${currentProfileIndex === 0 ? '' : 'group-hover:-translate-x-1'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Prev</span>
        </button>

        {/* Compact Info Display */}
        <div className="flex items-center gap-2">
          {/* Counter - Compact size */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/30 rounded-lg px-3 py-1.5 shadow-md" title="Use arrow keys to navigate">
            <span className="text-white font-medium text-xs">
              {currentProfileIndex + 1} of {profiles.length}
            </span>
          </div>
        </div>

        {/* Next Button - Compact size */}
        <button
          onClick={flipToNext}
          disabled={currentProfileIndex >= displayedProfiles.length - 1}
          className={`group flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 shadow-md min-h-[44px] ${
            currentProfileIndex >= displayedProfiles.length - 1
              ? 'bg-gray-400/20 text-gray-400 cursor-not-allowed border border-gray-400/20'
              : 'bg-white/10 backdrop-blur-lg border border-white/30 text-white hover:bg-white/20 hover:scale-105 hover:shadow-lg hover:border-white/40'
          }`}
        >
          <span>Next</span>
          <svg className={`w-3.5 h-3.5 transition-transform ${currentProfileIndex >= displayedProfiles.length - 1 ? '' : 'group-hover:translate-x-1'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Categories Filter - Moved below technician showcase */}
      <div className="mt-12 sm:mt-16 mb-6 sm:mb-8 px-4 categories-section">
        <div className="text-center mb-4 sm:mb-6">
          <h2 className="text-xl font-bold text-white mb-2">
            Filter by Category
          </h2>
          <p className="text-gray-400 text-sm">Narrow down your search by service type</p>
        </div>
        
        {/* Mobile-Responsive Category Grid - Center Last Item */}
  <div className="grid grid-cols-3 place-items-center sm:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4 w-full max-w-4xl mx-auto my-4 sm:my-6">
          {/* Build responsive grid: All + categories */}
          {[
            { id: 'all', icon: '🔧', name: 'All', isAll: true },
            ...TECHNICIAN_CATEGORIES.slice(0, 9)
          ].map((category, idx) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`mobile-btn group px-2 sm:px-4 lg:px-8 py-3 sm:py-4 min-h-[44px] w-full rounded-lg sm:rounded-xl backdrop-blur-sm border transition-all duration-200 hover:scale-105 ${idx === 9 ? 'col-start-2 sm:col-start-auto' : ''} ${
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
        </main>
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
          onForgotPassword={() => {
            setShowSignIn(false);
            setShowForgotPassword(true);
          }}
        />
      )}

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <ForgotPassword 
          onClose={() => setShowForgotPassword(false)}
          onBackToSignIn={() => {
            setShowForgotPassword(false);
            setShowSignIn(true);
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
        userId={currentUser?.uid || ''}
      />

      {/* Token Send Modal */}
      <TokenSendModal
        isOpen={showTokenSendModal}
        onClose={() => setShowTokenSendModal(false)}
        technicianId={displayedProfiles[currentProfileIndex]?.id || ''}
        technicianName={displayedProfiles[currentProfileIndex]?.name || displayedProfiles[currentProfileIndex]?.businessName || ''}
        userId={currentUser?.uid || ''}
      />

      {/* Token Purchase Modal */}
      <TokenPurchaseModal
        isOpen={showTokenPurchaseModal}
        onClose={() => setShowTokenPurchaseModal(false)}
        userId={currentUser?.uid || ''}
        onPurchaseSuccess={(tokens) => {
          logger.info(`User purchased ${tokens} tokens`);
          // Could show a success message or update UI here
        }}
      />
    </div>
  );
}





