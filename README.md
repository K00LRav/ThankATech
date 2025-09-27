# 🎉 ThankATech - Technician Appreciation Platform

A modern, responsive web application built with Next.js that allows customers to appreciate and support skilled technicians through thanks and tips.

## ✨ Features

### 🎨 **Beautiful UI/UX**
- Rolodex-style flipping cards for technician profiles
- Responsive design that works on all devices
- Modern, professional interface with Tailwind CSS

### 👥 **Dual Registration System**
- **Customer Registration**: Simple sign-up to thank and tip technicians
- **Technician Registration**: Detailed business profile creation with:
  - Business name and description
  - Contact information (phone, email, website)
  - Business address and service area
  - Hourly rates and availability
  - Services offered

### 🔥 **Firebase Integration**
- Real-time user registration and authentication
- Secure data storage in Firestore database
- Points and tipping system with persistent data

### 💎 **Core Functionality**
- Browse registered technician profiles
- Send "Thank You" messages (+1 point per technician)
- Send tips ($5 = +5 points per technician)
- Real-time points tracking and reputation building

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- Firebase project with Firestore enabled

### Installation

1. **Clone and install dependencies:**
```bash
git clone <your-repo>
cd thankatechsap
npm install
```

2. **Set up Firebase:**
   - Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   - Enable Firestore Database
   - Get your Firebase config from Project Settings

3. **Configure environment variables:**
   Create a `.env.local` file in the root directory:
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

4. **Run the development server:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📱 How It Works

### For Customers:
1. Visit the site and browse registered technician profiles
2. Click "Join Now" → Select "Customer" → Simple registration
3. Thank technicians (+1 point) or send tips (+5 points)
4. Help build technician reputations in the community

### For Technicians:
1. Click "Join Now" → Select "Technician"
2. Fill out detailed business information
3. Your profile appears immediately on the site
4. Receive thanks and tips from satisfied customers
5. Build your reputation and points over time

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React, Tailwind CSS
- **Backend**: Firebase (Firestore, Authentication)
- **Deployment**: Vercel-ready
- **UI**: Responsive design with rolodex-style animations

## 📚 Documentation

- [Registration System Guide](./REGISTRATION_SYSTEM.md) - How the dual registration system works
- [Simple Setup Guide](./SIMPLE_SETUP_GUIDE.md) - Step-by-step Firebase setup

## 🎯 Key Benefits

- **Direct Control**: Technicians have full control over their profiles
- **Quality Focus**: Only registered, serious technicians appear
- **Immediate Results**: Profiles appear instantly after registration
- **Community Building**: Connects customers with skilled local technicians
- **Reputation System**: Points-based system builds technician credibility

## 🚀 Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
