"use client";

import { useState, useEffect, useCallback } from 'react';
import { fetchTechnicians, getUserLocation } from '../lib/techniciansApi.js';
import { sendThankYou, sendTip } from '../lib/firebase';
import Registration from '../components/Registration';
import Footer from '../components/Footer';

interface Technician {
  id: string;
  name: string;
  title: string;
  about: string;
  image: string;
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
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [thankYouMessage, setThankYouMessage] = useState('');
  const [showThankYou, setShowThankYou] = useState(false);
  const [expandedCard, setExpandedCard] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt' | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTechDashboard, setShowTechDashboard] = useState(false);
  const [filteredProfiles, setFilteredProfiles] = useState<Technician[]>([]);
  const [allProfiles, setAllProfiles] = useState<Technician[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const profile = profiles[currentProfileIndex] || {
    name: '',
    title: '',
    category: '',
    image: '',
    points: 0,
    totalThankYous: 0,
    totalTips: 0,
    rating: 5.0
  };

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
    if (totalTips >= 50) badges.push({ icon: '💎', text: 'Diamond Earner', color: 'bg-purple-100 text-purple-800 border-purple-300' });
    else if (totalTips >= 25) badges.push({ icon: '🥇', text: 'Gold Standard', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' });
    else if (totalTips >= 10) badges.push({ icon: '🥈', text: 'Silver Pro', color: 'bg-gray-100 text-gray-800 border-gray-300' });
    else if (totalTips >= 5) badges.push({ icon: '💰', text: 'Tip Earner', color: 'bg-green-100 text-green-800 border-green-300' });

    // Rating milestones
    if (dynamicRating >= 4.8) badges.push({ icon: '🌟', text: 'Excellence', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' });
    else if (dynamicRating >= 4.5) badges.push({ icon: '✨', text: 'Outstanding', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' });

    // Experience badges (based on profile data)
    if (profile.experience?.includes('10+')) badges.push({ icon: '🧙‍♂️', text: 'Master Tech', color: 'bg-purple-100 text-purple-800 border-purple-300' });
    else if (profile.experience?.includes('5+')) badges.push({ icon: '🔧', text: 'Expert', color: 'bg-blue-100 text-blue-800 border-blue-300' });

    // Certification badge
    if (profile.certifications) badges.push({ icon: '📜', text: 'Certified', color: 'bg-green-100 text-green-800 border-green-300' });

    return badges.slice(0, 3); // Show max 3 badges to keep clean
  };

  // Get category icon based on category/title
  const getCategoryIcon = (category: string, title: string) => {
    const categoryLower = (category || title || '').toLowerCase();
    
    if (categoryLower.includes('auto') || categoryLower.includes('mechanic') || categoryLower.includes('car')) return '🚗';
    if (categoryLower.includes('electric') || categoryLower.includes('electrical')) return '⚡';
    if (categoryLower.includes('plumb') || categoryLower.includes('pipe')) return '🔧';
    if (categoryLower.includes('hvac') || categoryLower.includes('air') || categoryLower.includes('heat')) return '🌡️';
    if (categoryLower.includes('computer') || categoryLower.includes('tech') || categoryLower.includes('it')) return '💻';
    if (categoryLower.includes('appliance') || categoryLower.includes('repair')) return '🔧';
    if (categoryLower.includes('lock') || categoryLower.includes('security')) return '🔐';
    if (categoryLower.includes('contractor') || categoryLower.includes('construction')) return '🏗️';
    if (categoryLower.includes('handyman') || categoryLower.includes('handy')) return '🔨';
    if (categoryLower.includes('paint') || categoryLower.includes('decorator')) return '🎨';
    if (categoryLower.includes('roof') || categoryLower.includes('gutter')) return '🏠';
    if (categoryLower.includes('garden') || categoryLower.includes('landscape')) return '🌱';
    if (categoryLower.includes('clean') || categoryLower.includes('janitor')) return '🧹';
    
    // Default fallback
    return '🔧';
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
      filtered = filtered.filter(technician => 
        technician.category.toLowerCase() === category.toLowerCase()
      );
    }
    
    // Apply search query filter
    if (query.trim()) {
      filtered = filtered.filter(technician => 
        technician.name.toLowerCase().includes(query.toLowerCase()) ||
        technician.category.toLowerCase().includes(query.toLowerCase()) ||
        technician.title.toLowerCase().includes(query.toLowerCase()) ||
        technician.businessName?.toLowerCase().includes(query.toLowerCase()) ||
        technician.businessAddress?.toLowerCase().includes(query.toLowerCase()) ||
        technician.serviceArea?.toLowerCase().includes(query.toLowerCase())
      );
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

  const achievementBadges = getAchievementBadges(profile);

  // Get unique categories from all profiles
  const getAvailableCategories = useCallback(() => {
    const categories = allProfiles.map(p => p.category);
    const uniqueCategories = [...new Set(categories)].sort();
    return [{ value: 'all', label: 'All Categories' }, ...uniqueCategories.map(cat => ({ value: cat, label: formatCategory(cat) }))];
  }, [allProfiles]);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  // Request user location
  const requestUserLocation = () => {
    return new Promise<{lat: number, lng: number} | null>((resolve) => {
      if (!navigator.geolocation) {
        console.log('Geolocation not supported');
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
          console.log('User location obtained:', location);
          resolve(location);
        },
        (error) => {
          console.log('Location permission denied or error:', error);
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

    // In a real app, you'd show a tip amount selection modal
    const tipAmount = 5; // Default tip amount
    
    try {
      const currentTechnician = profiles[currentProfileIndex];
      await sendTip(currentTechnician.id, currentUser.id, tipAmount, 'Tip for excellent service!');
      
      // Update the technician's stats locally (tips give more points and improve rating)
      setProfiles(prev => prev.map((tech, index) => 
        index === currentProfileIndex 
          ? { 
              ...tech, 
              points: tech.points + tipAmount,
              totalTips: (tech.totalTips || 0) + 1,
              totalTipAmount: (tech.totalTipAmount || 0) + tipAmount
            }
          : tech
      ));

      setThankYouMessage(`$${tipAmount} tip sent successfully! 💰`);
      setShowThankYou(true);
      setTimeout(() => setShowThankYou(false), 3000);
    } catch (error) {
      console.error('Error sending tip:', error);
      setError('Failed to send tip. Please try again.');
    }
  };

  const handleRegistrationComplete = (user: any) => {
    setCurrentUser(user);
    setShowRegistration(false);
    
    // Different welcome messages based on user type
    if (user.userType === 'technician') {
      setThankYouMessage('Welcome to ThankATech! Your technician profile is now live. Customers can now find and thank you!');
    } else {
      setThankYouMessage('Welcome to ThankATech! You can now thank technicians and show your appreciation.');
    }
    
    setShowThankYou(true);
    setTimeout(() => setShowThankYou(false), 4000); // Longer timeout for technician message
  };

  const handleRegistrationClose = () => {
    setShowRegistration(false);
  };

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (isFlipping) return;
      
      if (e.deltaY > 0) {
        flipToNext();
      } else if (e.deltaY < 0) {
        flipToPrevious();
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      setTouchEnd(null);
      setTouchStart(e.targetTouches[0].clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      setTouchEnd(e.targetTouches[0].clientY);
    };

    const handleTouchEnd = () => {
      if (!touchStart || !touchEnd) return;
      
      const distance = touchStart - touchEnd;
      const isUpSwipe = distance > minSwipeDistance;
      const isDownSwipe = distance < -minSwipeDistance;

      if (isUpSwipe) {
        flipToNext(); // Swipe up = next profile
      } else if (isDownSwipe) {
        flipToPrevious(); // Swipe down = previous profile
      }
    };

    const cardElement = document.getElementById('rolodex-card');
    if (cardElement) {
      // Mouse wheel events
      cardElement.addEventListener('wheel', handleWheel, { passive: false });
      
      // Touch events
      cardElement.addEventListener('touchstart', handleTouchStart, { passive: true });
      cardElement.addEventListener('touchmove', handleTouchMove, { passive: true });
      cardElement.addEventListener('touchend', handleTouchEnd, { passive: true });
      
      return () => {
        cardElement.removeEventListener('wheel', handleWheel);
        cardElement.removeEventListener('touchstart', handleTouchStart);
        cardElement.removeEventListener('touchmove', handleTouchMove);
        cardElement.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isFlipping, profiles.length, touchStart, touchEnd, flipToNext, flipToPrevious]);
  
  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-400 mx-auto mb-4"></div>
          <p className="text-indigo-300 font-semibold">Loading amazing technicians near you...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 font-semibold mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 transition-colors duration-200"
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-300 font-semibold">No technicians found in your area.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-indigo-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-purple-400/10 to-pink-600/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>
      <div className="relative z-10">
        {/* Header */}
        <header className="flex justify-between items-center p-6 bg-black/20 backdrop-blur-sm border-b border-white/10 rounded-2xl mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-xl font-bold">🔧</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              ThankATech
            </span>
          </div>
          <div className="flex gap-4 items-center">
            {currentUser ? (
              <div className="flex items-center space-x-4">
                {/* Dashboard Button - Show for technicians, Profile for customers */}
                {currentUser && (
                  <button
                    onClick={() => setShowTechDashboard(true)}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    {currentUser.userType === 'technician' ? 'Dashboard' : 'Profile'}
                  </button>
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
                  
                  {/* Debug info */}
                  <span className="text-xs text-yellow-300">
                    (Type: {currentUser?.userType || 'undefined'})
                  </span>
                  
                  {/* Fix User Type Button - Temporary */}
                  <button
                    onClick={() => {
                      setCurrentUser({...currentUser, userType: 'technician'});
                      setThankYouMessage('User type updated to technician!');
                      setShowThankYou(true);
                      setTimeout(() => setShowThankYou(false), 3000);
                    }}
                    className="px-2 py-1 bg-yellow-500/20 border border-yellow-500/30 text-yellow-200 rounded text-xs hover:bg-yellow-500/30 transition-all duration-200"
                  >
                    Fix Type
                  </button>
                  
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
                  onClick={() => setShowRegistration(true)}
                  className="text-gray-300 hover:text-indigo-400 transition-colors duration-200 font-medium"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => setShowRegistration(true)}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-600 hover:to-purple-700 transition-all duration-200"
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

        {/* Category Filter */}
        <div className="mb-12 lg:mb-16">
          {/* Mobile Dropdown */}
          <div className="sm:hidden px-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-200"
            >
              {getAvailableCategories().map((category) => (
                <option key={category.value} value={category.value} className="bg-slate-800 text-white">
                  {category.value !== 'all' && getCategoryIcon(category.value, '')} {category.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Desktop Buttons */}
          <div className="hidden sm:flex flex-wrap justify-center gap-2 px-4">
            {getAvailableCategories().map((category) => (
              <button
                key={category.value}
                onClick={() => setSelectedCategory(category.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedCategory === category.value
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg scale-105'
                    : 'bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 hover:scale-105'
                }`}
              >
                {category.value !== 'all' && getCategoryIcon(category.value, '')} {category.label}
              </button>
            ))}
          </div>
          
          {selectedCategory !== 'all' && (
            <div className="mt-3 text-center text-white/70 text-sm">
              Showing {profiles.length} {formatCategory(selectedCategory)} technician{profiles.length !== 1 ? 's' : ''}
            </div>
          )}
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
                className="w-full px-6 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-200"
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
          <div className="mb-6 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 backdrop-blur-sm border border-blue-300/30 rounded-2xl p-4">
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

        {/* Modern Rolodex Card */}
        <div id="rolodex-card" className={`card-container relative group cursor-pointer ${isFlipping ? 'animate-pulse' : ''}`}>
          {/* Glass morphism background layers - Wider and dynamic height */}
          <div className={`absolute top-3 left-3 w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl ${expandedCard ? 'h-auto min-h-[32rem] sm:min-h-[36rem]' : 'h-[32rem] sm:h-[36rem]'} bg-gradient-to-br from-indigo-400/20 to-purple-600/20 backdrop-blur-sm rounded-2xl transform rotate-2 transition-all duration-500 group-hover:rotate-3 group-hover:top-4 group-hover:left-4 border border-white/20`}></div>
          <div className={`absolute top-1.5 left-1.5 w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl ${expandedCard ? 'h-auto min-h-[32rem] sm:min-h-[36rem]' : 'h-[32rem] sm:h-[36rem]'} bg-gradient-to-br from-blue-400/15 to-indigo-600/15 backdrop-blur-sm rounded-2xl transform rotate-1 transition-all duration-500 group-hover:rotate-2 group-hover:top-2.5 group-hover:left-2.5 border border-white/10`}></div>
          
          {/* Main Modern Card - Responsive width with proper overflow control */}
          <div className="relative w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl">
            {/* Manila Folder Tab - positioned above the main folder */}
            <div className="absolute -top-6 right-8 sm:right-12 z-10">
              <div className="bg-gradient-to-b from-amber-100 to-amber-200 border-2 border-amber-300/80 shadow-lg px-4 py-2 rounded-t-lg">
                <span className="text-xs sm:text-sm font-bold text-amber-800 tracking-wide flex items-center gap-1">
                  <span className="text-sm sm:text-base">{getCategoryIcon(profile.category, profile.title)}</span>
                  <span className="hidden sm:inline">{formatCategory(profile.category)}</span>
                  <span className="sm:hidden">{formatCategory(profile.category).split(' ')[0]}</span>
                </span>
              </div>
            </div>
            
            {/* Main Manila Folder Body */}
            <div className={`relative ${expandedCard ? 'h-auto min-h-[32rem] sm:min-h-[36rem]' : 'h-[32rem] sm:h-[36rem]'} bg-gradient-to-br from-amber-50 to-amber-100 backdrop-blur-lg shadow-2xl border-2 border-amber-200/60 rounded-lg p-4 sm:p-6 lg:p-8 transition-all duration-500 ease-out group-hover:shadow-3xl group-hover:-translate-y-3 group-hover:shadow-amber-500/25 ${isFlipping ? 'scale-105 rotate-1' : ''} ${expandedCard ? 'overflow-visible' : 'overflow-hidden'}`}>

            <div className="flex flex-col h-full">
              {/* Header Section */}
              <div className="flex items-start space-x-3 sm:space-x-4 mb-3 sm:mb-4">
                {/* Profile Image with modern styling */}
                <div className="relative">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-2xl overflow-hidden shadow-lg ring-4 ring-white/50">
                    <img
                      src={profile.image}
                      alt={profile.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Dynamic Rating overlay */}
                  <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full w-9 h-9 flex items-center justify-center text-xs font-bold shadow-lg border-2 border-white">
                    {dynamicRating.toFixed(1)}⭐
                  </div>
                </div>

                {/* Name and Title */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{profile.name}</h2>
                  <p className="text-sm sm:text-base lg:text-lg text-indigo-600 font-semibold mt-1">{profile.businessName || profile.title}</p>
                  {profile.serviceArea && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center">
                      <span className="mr-1">📍</span>
                      {profile.serviceArea}
                    </p>
                  )}
                  
                  {/* Distance and Location Info */}
                  {profile.distance !== undefined && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500 flex items-center">
                        🚗 {profile.distance.toFixed(1)} miles away
                      </span>
                      {profile.isNearby && (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium border border-green-200">
                          📍 Near You
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Achievement Badges */}
                  {achievementBadges.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {achievementBadges.map((badge, index) => (
                        <span 
                          key={index}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${badge.color} shadow-sm`}
                          title={`Achievement: ${badge.text}`}
                        >
                          <span className="text-xs">{badge.icon}</span>
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
                    <p className="text-sm lg:text-base text-gray-700 leading-relaxed max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">{profile.about}</p>
                  </div>

                  {/* Basic Contact Info Grid - Only show when expanded */}
                  {expandedCard && (
                    <div className="grid grid-cols-2 gap-2">
                  {profile.businessPhone && (
                    <div className="bg-blue-50/80 backdrop-blur-sm rounded-lg p-3 border border-blue-100">
                      <div className="flex items-center space-x-2">
                        <span className="text-blue-500">📞</span>
                        <span className="text-xs text-blue-700 font-medium">{profile.businessPhone}</span>
                      </div>
                    </div>
                  )}
                  {profile.businessEmail && (
                    <div className="bg-indigo-50/80 backdrop-blur-sm rounded-lg p-3 border border-indigo-100 col-span-2">
                      <div className="flex items-start space-x-2">
                        <span className="text-indigo-500 mt-0.5">✉️</span>
                        <span className="text-xs sm:text-sm text-indigo-700 font-medium break-all leading-relaxed">{profile.businessEmail}</span>
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
                          className="text-xs text-green-700 font-medium hover:text-green-800 hover:underline transition-colors"
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
                    <div className="bg-purple-50/80 backdrop-blur-sm rounded-lg p-3 border border-purple-100">
                      <div className="flex items-center space-x-2">
                        <span className="text-purple-500">💰</span>
                        <span className="text-xs text-purple-700 font-medium">{profile.hourlyRate}/hr</span>
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
                        <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-xs flex items-center gap-1">
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
                      <div className="bg-gradient-to-r from-purple-50/80 to-indigo-50/80 backdrop-blur-sm rounded-xl p-3 border border-purple-200">
                        <h4 className="text-sm font-semibold text-gray-800 mb-2">🏆 Achievements</h4>
                        <div className="grid grid-cols-1 gap-2">
                          {achievementBadges.map((badge, index) => (
                            <div key={index} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${badge.color}`}>
                              <span className="text-lg">{badge.icon}</span>
                              <div className="flex-1">
                                <span className="text-xs font-medium">{badge.text}</span>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {badge.text.includes('Thank') && `${profile.totalThankYous || 0} thank yous received`}
                                  {badge.text.includes('Tip') && `${profile.totalTips || 0} tips received`}
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
                    <div className="bg-gradient-to-r from-yellow-50/80 to-orange-50/80 backdrop-blur-sm rounded-xl p-3 border border-yellow-200">
                      <h4 className="text-sm font-semibold text-gray-800 mb-2">⭐ Community Rating</h4>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Based on customer feedback</span>
                        <span className="font-bold text-yellow-700">{dynamicRating.toFixed(1)}/5.0 ⭐</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {profile.totalThankYous || 0} thanks • {profile.totalTips || 0} tips received
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Expand/Collapse Button */}
              <div className="mt-3 text-center">
                <button
                  onClick={() => setExpandedCard(!expandedCard)}
                  className="text-xs text-gray-500 hover:text-indigo-600 transition-colors duration-200 flex items-center space-x-1 mx-auto"
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
                <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap mb-2 sm:mb-3">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full px-2 py-1 sm:px-3 sm:py-1 shadow-lg">
                    <div className="flex items-center space-x-1">
                      <span className="text-xs">👍</span>
                      <span className="text-xs font-bold">{profile.totalThankYous || 0}</span>
                      <span className="text-xs opacity-90 hidden sm:inline">thanks</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-full px-2 py-1 sm:px-3 sm:py-1 shadow-lg">
                    <div className="flex items-center space-x-1">
                      <span className="text-xs">💰</span>
                      <span className="text-xs font-bold">{profile.totalTips || 0}</span>
                      <span className="text-xs opacity-90 hidden sm:inline">tips</span>
                    </div>
                  </div>
                  {profile.certifications && (
                    <div className="bg-blue-100 text-blue-700 rounded-full px-2 py-1 shadow-sm">
                      <span className="text-xs font-medium">✓ Certified</span>
                    </div>
                  )}
                </div>

                {/* Quick Actions - Contained within card */}
                <div className="flex items-center justify-center space-x-2 sm:space-x-3">
                  {profile.businessEmail && (
                    <button 
                      onClick={() => {
                        const subject = `Inquiry about ${profile.businessName} services`;
                        const body = `Hello ${profile.name},\n\nI found your profile on ThankATech and I'm interested in your ${profile.category} services.\n\nPlease let me know your availability.\n\nThank you!`;
                        window.location.href = `mailto:${profile.businessEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                      }}
                      className="bg-white/80 backdrop-blur-sm hover:bg-white text-gray-600 hover:text-indigo-600 rounded-full p-1.5 sm:p-2 transition-all duration-200 border border-gray-200 hover:border-indigo-300 shadow-sm group min-h-[32px] min-w-[32px] flex items-center justify-center"
                      title="Send Email"
                    >
                      <span className="text-sm group-hover:scale-110 transition-transform duration-200">💬</span>
                    </button>
                  )}
                  {profile.businessPhone && (
                    <button 
                      onClick={() => {
                        window.location.href = `tel:${profile.businessPhone}`;
                      }}
                      className="bg-white/80 backdrop-blur-sm hover:bg-white text-gray-600 hover:text-green-600 rounded-full p-1.5 sm:p-2 transition-all duration-200 border border-gray-200 hover:border-green-300 shadow-sm group min-h-[32px] min-w-[32px] flex items-center justify-center"
                      title="Call Now"
                    >
                      <span className="text-sm group-hover:scale-110 transition-transform duration-200">📞</span>
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
                      className="bg-white/80 backdrop-blur-sm hover:bg-white text-gray-600 hover:text-blue-600 rounded-full p-1.5 sm:p-2 transition-all duration-200 border border-gray-200 hover:border-blue-300 shadow-sm group min-h-[32px] min-w-[32px] flex items-center justify-center"
                      title="Visit Website"
                    >
                      <span className="text-sm group-hover:scale-110 transition-transform duration-200">🌐</span>
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
                      className="bg-white/80 backdrop-blur-sm hover:bg-white text-gray-600 hover:text-red-600 rounded-full p-1.5 sm:p-2 transition-all duration-200 border border-gray-200 hover:border-red-300 shadow-sm group min-h-[32px] min-w-[32px] flex items-center justify-center"
                      title="Get Directions"
                    >
                      <span className="text-sm group-hover:scale-110 transition-transform duration-200">📍</span>
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
        {/* Scroll Hint */}
        <div className="text-center text-gray-400 text-sm flex items-center justify-center space-x-2 flex-wrap">
          <span>🖱️</span>
          <span className="hidden sm:inline">Scroll to flip through technicians</span>
          <span className="sm:hidden">Swipe up/down to flip through technicians</span>
          <span className="text-xs bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20">({currentProfileIndex + 1}/{profiles.length})</span>
          {userLocation && (
            <span className="text-xs bg-green-500/20 backdrop-blur-sm px-3 py-1 rounded-full border border-green-400/30 text-green-300">
              📍 Sorted by distance
            </span>
          )}
        </div>

        {/* Action Buttons - Mobile responsive with clear separation */}
        <div className="flex flex-col sm:flex-row gap-4 sm:space-x-6 sm:gap-0 w-full max-w-md mx-auto">
          <button 
            onClick={handleThankYou}
            className="group flex items-center justify-center space-x-2 sm:space-x-3 px-6 py-3 sm:px-8 sm:py-4 bg-gradient-to-r from-green-500 to-emerald-600 backdrop-blur-sm rounded-xl sm:rounded-2xl hover:from-green-400 hover:to-emerald-500 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-green-500/25 hover:-translate-y-1 min-h-[44px] flex-1"
          >
            <span className="text-white text-lg group-hover:scale-110 transition-transform duration-200">👍</span>
            <span className="font-semibold text-white text-sm sm:text-base">Thank You</span>
          </button>
          <button 
            onClick={handleTip}
            className="group flex items-center justify-center space-x-2 sm:space-x-3 px-6 py-3 sm:px-8 sm:py-4 bg-gradient-to-r from-yellow-500 to-orange-600 backdrop-blur-sm rounded-xl sm:rounded-2xl hover:from-yellow-400 hover:to-orange-500 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-yellow-500/25 hover:-translate-y-1 min-h-[44px] flex-1"
          >
            <span className="text-white text-lg group-hover:scale-110 transition-transform duration-200">💰</span>
            <span className="font-semibold text-white text-sm sm:text-base">Tip $5</span>
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

      {/* Thank You Notification */}
      {showThankYou && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce">
          {thankYouMessage}
        </div>
      )}

      {/* Technician Dashboard Modal - Mobile-First Responsive Design */}
      {showTechDashboard && currentUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          {/* Mobile: Slide up from bottom, Desktop: Center modal */}
          <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 w-full h-[85vh] sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl sm:border border-white/10 shadow-2xl overflow-hidden animate-slideUp sm:animate-modalZoom">
            
            {/* Mobile-friendly Header with close button */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-900/50">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  {currentUser?.userType === 'technician' ? 'Dashboard' : 'Profile'}
                </h2>
                <p className="text-sm text-gray-300 mt-1">
                  {currentUser?.userType === 'technician' ? 'Your profile & stats' : 'Your profile & activity'}
                </p>
              </div>
              <button
                onClick={() => setShowTechDashboard(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-gray-300 hover:text-white hover:bg-white/20 transition-all duration-200"
              >
                <span className="text-xl">×</span>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto h-full pb-20 sm:pb-6">
              <div className="p-4 space-y-4">
                
                {/* Stats Cards - Mobile: Stack, Desktop: Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">⭐</span>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Rating</p>
                        <p className="text-lg font-bold text-white">{currentUser?.rating?.toFixed(1) || '5.0'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🙏</span>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Thank Yous</p>
                        <p className="text-lg font-bold text-white">{currentUser?.totalThankYous || 0}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">💰</span>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Total Tips</p>
                        <p className="text-lg font-bold text-white">${currentUser?.totalTips || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profile Info - Simplified for mobile */}
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-3">Profile</h3>
                  
                  {/* Profile Image */}
                  <div className="flex items-center gap-4 mb-4 pb-4 border-b border-white/10">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-700 border-2 border-white/20">
                      {(currentUser?.image || currentUser?.photoURL) ? (
                        <img 
                          src={currentUser?.image || currentUser?.photoURL} 
                          alt={currentUser?.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl">
                          👤
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium">{currentUser?.name}</p>
                      <p className="text-sm text-gray-400">{currentUser?.email}</p>
                      {currentUser?.photoURL && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-400 mt-1">
                          <span>✓</span> Google Profile
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Business</span>
                      <span className="text-sm text-white font-medium">{currentUser?.businessName || 'Not set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Category</span>
                      <span className="text-sm text-white font-medium">{currentUser?.category || 'Not set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Experience</span>
                      <span className="text-sm text-white font-medium">{currentUser?.experience || 'Not set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Rate</span>
                      <span className="text-sm text-white font-medium">${currentUser?.hourlyRate || 'Not set'}</span>
                    </div>
                  </div>
                </div>

                {/* Mobile-friendly Action Buttons */}
                <div className="space-y-3">
                  <button className="w-full p-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl text-white font-medium hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2">
                    <span>📝</span> Edit Profile
                  </button>
                  <button className="w-full p-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl text-white font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-200 flex items-center justify-center gap-2">
                    <span>📊</span> View Analytics
                  </button>
                </div>

                {/* Achievement Badges */}
                {currentUser?.achievements && currentUser.achievements.length > 0 && (
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-3">Achievements</h3>
                    <div className="flex flex-wrap gap-2">
                      {currentUser?.achievements?.map((achievement: any, index: number) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-full text-yellow-200 text-xs font-medium"
                        >
                          {achievement.icon} {achievement.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Coming Soon Note */}
                <div className="text-center p-4">
                  <p className="text-xs text-gray-400">
                    🚧 Profile editing and analytics features coming soon!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
