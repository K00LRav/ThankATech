"use client";

import { useState, useEffect } from 'react';
import { fetchTechnicians, getUserLocation } from '../lib/techniciansApi';
import { sendThankYou, sendTip } from '../lib/firebase';
import UserRegistration from '../components/UserRegistration';

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
  
  const profile = profiles[currentProfileIndex] || {};

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  // Get technician data
  useEffect(() => {
    const loadTechnicians = async () => {
      setLoading(true);
      try {
        const data = await fetchTechnicians('all', '33.7490,-84.3880', 8);
        if (Array.isArray(data) && data.length > 0) {
          setProfiles(data);
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

  const flipToNext = () => {
    if (isFlipping) return;
    setIsFlipping(true);
    setCurrentProfileIndex((prev) => (prev + 1) % profiles.length);
    setTimeout(() => setIsFlipping(false), 600);
  };

  const flipToPrevious = () => {
    if (isFlipping) return;
    setIsFlipping(true);
    setCurrentProfileIndex((prev) => (prev - 1 + profiles.length) % profiles.length);
    setTimeout(() => setIsFlipping(false), 600);
  };

  const handleThankYou = async () => {
    if (!currentUser) {
      setShowRegistration(true);
      return;
    }

    try {
      const currentTechnician = profiles[currentProfileIndex];
      await sendThankYou(currentTechnician.id, currentUser.id, 'Thank you for your great service!');
      
      // Update the technician's points locally
      setProfiles(prev => prev.map((tech, index) => 
        index === currentProfileIndex 
          ? { ...tech, points: tech.points + 1 }
          : tech
      ));

      setThankYouMessage('Thank you sent successfully! 🎉');
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
      
      // Update the technician's points locally (tips give more points)
      setProfiles(prev => prev.map((tech, index) => 
        index === currentProfileIndex 
          ? { ...tech, points: tech.points + tipAmount }
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
    setThankYouMessage('Welcome to ThankATech! You can now thank technicians.');
    setShowThankYou(true);
    setTimeout(() => setShowThankYou(false), 3000);
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
  }, [isFlipping, profiles.length, touchStart, touchEnd]);
  
  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-indigo-600 font-semibold">Loading amazing technicians near you...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 font-semibold">No technicians found in your area.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div className="text-2xl font-bold text-indigo-600">ThankATech</div>
        <div className="flex gap-4 items-center">
          {currentUser ? (
            <span className="text-gray-600">Welcome, {currentUser.name}!</span>
          ) : (
            <button 
              onClick={() => setShowRegistration(true)}
              className="text-gray-600 hover:text-indigo-600"
            >
              Join Now
            </button>
          )}
          <button className="px-4 py-2 border-2 border-gray-800 rounded hover:bg-gray-100">
            Search
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-col items-center space-y-8">
        {/* Rolodex Card */}
        <div id="rolodex-card" className={`relative group cursor-pointer ${isFlipping ? 'animate-pulse' : ''}`}>
          {/* Card Shadow/Base */}
          <div className="absolute top-2 left-2 w-80 h-56 sm:w-96 sm:h-64 lg:w-[28rem] lg:h-80 bg-gray-300 rounded-lg transform rotate-1 transition-all duration-300 group-hover:rotate-2 group-hover:top-3 group-hover:left-3"></div>
          <div className="absolute top-1 left-1 w-80 h-56 sm:w-96 sm:h-64 lg:w-[28rem] lg:h-80 bg-gray-200 rounded-lg transform rotate-0.5 transition-all duration-300 group-hover:rotate-1 group-hover:top-2 group-hover:left-2"></div>
          
          {/* Main Card */}
          <div className={`relative w-80 h-56 sm:w-96 sm:h-64 lg:w-[28rem] lg:h-80 bg-white rounded-lg shadow-xl border-2 border-gray-300 p-4 sm:p-6 lg:p-8 transition-all duration-300 group-hover:shadow-2xl group-hover:-translate-y-2 group-hover:border-indigo-300 group-hover:shadow-indigo-200/50 ${isFlipping ? 'scale-105 rotate-1' : ''}`}>
            {/* Card Holes (like rolodex) */}
            <div className="absolute left-3 top-3 sm:left-4 sm:top-4 w-2 h-2 sm:w-3 sm:h-3 bg-gray-200 rounded-full border border-gray-300"></div>
            <div className="absolute left-3 bottom-3 sm:left-4 sm:bottom-4 w-2 h-2 sm:w-3 sm:h-3 bg-gray-200 rounded-full border border-gray-300"></div>
            
            {/* Card Tab */}
            <div className="absolute -top-2 right-6 sm:right-8 w-12 h-5 sm:w-16 sm:h-6 lg:w-20 lg:h-7 bg-yellow-200 rounded-t-lg border-l-2 border-r-2 border-t-2 border-gray-300 flex items-center justify-center">
              <span className="text-xs lg:text-sm font-bold text-gray-700">{profile.title.split(' ')[0]}</span>
            </div>

            <div className="flex h-full">
              {/* Left Side - Profile Image */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 mr-3 sm:mr-4 mt-1 sm:mt-2">
                <img
                  src={profile.image}
                  alt={profile.name}
                  className="w-full h-full object-cover rounded border-2 border-gray-300"
                />
              </div>

              {/* Right Side - Info */}
              <div className="flex-1 space-y-1 sm:space-y-2">
                <div className="border-b border-gray-200 pb-1">
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">{profile.name}</h2>
                  <p className="text-xs sm:text-sm lg:text-base text-indigo-600 font-semibold">{profile.title}</p>
                </div>
                
                <div className="text-xs sm:text-xs lg:text-sm text-gray-600 leading-relaxed">
                  <p className="mb-2">{profile.about}</p>
                </div>

                {/* Points Badge */}
                <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4">
                  <div className="bg-yellow-100 border-2 border-yellow-300 rounded-full px-2 py-1 sm:px-3 sm:py-1 lg:px-4 lg:py-2 flex items-center space-x-1">
                    <span className="text-yellow-600 text-sm lg:text-base">🏆</span>
                    <span className="text-xs sm:text-sm lg:text-base font-bold text-yellow-700">{profile.points}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Hint */}
        <div className="text-center text-gray-500 text-sm flex items-center justify-center space-x-2 flex-wrap">
          <span>🖱️</span>
          <span className="hidden sm:inline">Scroll to flip through technicians</span>
          <span className="sm:hidden">Swipe up/down to flip through technicians</span>
          <span className="text-xs bg-gray-100 px-2 py-1 rounded">({currentProfileIndex + 1}/{profiles.length})</span>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-6">
          <button 
            onClick={handleThankYou}
            className="flex items-center space-x-2 px-6 py-3 bg-green-100 border-2 border-green-300 rounded-lg hover:bg-green-200 transition-colors"
          >
            <span className="text-green-600">👍</span>
            <span className="font-semibold text-green-700">Thank You</span>
          </button>
          <button 
            onClick={handleTip}
            className="flex items-center space-x-2 px-6 py-3 bg-yellow-100 border-2 border-yellow-300 rounded-lg hover:bg-yellow-200 transition-colors"
          >
            <span className="text-yellow-600">💰</span>
            <span className="font-semibold text-yellow-700">Tip</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 text-center text-gray-600 text-sm">
        <p>Appreciating the hard-working technicians who keep our world running.</p>
      </footer>

      {/* Registration Modal */}
      {showRegistration && (
        <UserRegistration 
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
    </div>
  );
}
