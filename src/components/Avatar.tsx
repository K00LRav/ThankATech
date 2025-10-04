'use client';

import React from 'react';
import Image from 'next/image';

interface AvatarProps {
  name?: string;
  photoURL?: string;
  size?: number;
  className?: string;
  textSize?: string;
}

const Avatar: React.FC<AvatarProps> = ({ 
  name = '', 
  photoURL, 
  size = 40, 
  className = '',
  textSize = 'text-sm'
}) => {
  // Get initials from name
  const getInitials = (fullName: string) => {
    if (!fullName) return 'U';
    
    const names = fullName.trim().split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    
    // First letter of first name + first letter of last name
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  // Generate a consistent background color based on the name
  const getBackgroundColor = (fullName: string) => {
    if (!fullName) return 'bg-slate-600';
    
    const colors = [
      'bg-blue-500',
      'bg-green-500', 
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-teal-500',
      'bg-orange-500',
      'bg-cyan-500'
    ];
    
    // Create a simple hash of the name to get consistent colors
    let hash = 0;
    for (let i = 0; i < fullName.length; i++) {
      hash = fullName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  const initials = getInitials(name);
  const bgColor = getBackgroundColor(name);

  if (photoURL) {
    return (
      <Image 
        src={photoURL} 
        alt={name || 'Profile'} 
        width={size}
        height={size}
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div 
      className={`${bgColor} rounded-full flex items-center justify-center text-white font-semibold ${className}`}
      style={{ width: size, height: size }}
    >
      <span className={`${textSize} font-bold`}>
        {initials}
      </span>
    </div>
  );
};

export default Avatar;