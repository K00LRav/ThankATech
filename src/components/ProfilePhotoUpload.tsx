'use client';

import React, { useState, useRef } from 'react';
import { uploadTechnicianPhoto, uploadClientPhoto } from '@/lib/firebase';
import Avatar from './Avatar';

interface ProfilePhotoUploadProps {
  userId: string;
  userType: 'technician' | 'client';
  currentPhotoURL?: string;
  userName?: string;
  onPhotoUploaded?: (photoURL: string) => void;
  className?: string;
  size?: number;
}

const ProfilePhotoUpload: React.FC<ProfilePhotoUploadProps> = ({
  userId,
  userType,
  currentPhotoURL,
  userName,
  onPhotoUploaded,
  className = '',
  size = 120
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedPhotoURL, setUploadedPhotoURL] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Please select an image smaller than 5MB.');
      return;
    }

    setUploading(true);

    try {
      let photoURL: string;
      
      if (userType === 'technician') {
        photoURL = await uploadTechnicianPhoto(userId, file);
      } else {
        photoURL = await uploadClientPhoto(userId, file);
      }

      setUploadedPhotoURL(photoURL);
      onPhotoUploaded?.(photoURL);
      
      alert('Profile photo uploaded successfully!');
    } catch (error) {
      console.error('❌ Error uploading photo:', error);
      alert(`Failed to upload photo: ${error.message || 'Please try again.'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const displayPhotoURL = uploadedPhotoURL || currentPhotoURL;

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      {/* Profile Photo Display */}
      <div className="relative group">
        <div className="relative">
          <Avatar
            name={userName}
            photoURL={displayPhotoURL}
            size={size}
            className="ring-4 ring-white/20 shadow-lg"
            textSize={size > 80 ? 'text-2xl' : 'text-lg'}
          />
          
          {/* Upload Overlay */}
          <div 
            className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
            onClick={handleUploadClick}
          >
            {uploading ? (
              <div className="animate-spin text-white text-xl">⏳</div>
            ) : (
              <div className="text-white text-center">
                <div className="text-xl mb-1">📷</div>
                <div className="text-xs font-medium">
                  {displayPhotoURL ? 'Change' : 'Add'} Photo
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Button */}
      <button
        onClick={handleUploadClick}
        disabled={uploading}
        className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
          uploading
            ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105'
        }`}
      >
        {uploading ? (
          <span className="flex items-center space-x-2">
            <span className="animate-spin">⏳</span>
            <span>Uploading...</span>
          </span>
        ) : (
          <span className="flex items-center space-x-2">
            <span>📷</span>
            <span>{displayPhotoURL ? 'Change Photo' : 'Add Photo'}</span>
          </span>
        )}
      </button>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload Instructions */}
      <p className="text-xs text-gray-400 text-center max-w-xs">
        Click to upload a profile photo. Supported formats: JPG, PNG, GIF. Max size: 5MB.
      </p>
    </div>
  );
};

export default ProfilePhotoUpload;