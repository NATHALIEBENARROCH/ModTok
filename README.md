# ModTok Mobile Application

ModTok™ is a smart wardrobe application that lets users add, sort, style, save, share, and sell clothing collections and combinations. This repository contains the complete React Native (Expo) frontend implementation based on the provided PDF design specifications.

## Project Overview

The application has been built using **React Native** and **Expo**, providing a seamless, native-like experience on iOS. It strictly follows the brand identity defined in the design documents:

- **Color Palette**: Coral Pink (`#E8736A`), Black (`#1A1A1A`), Cream Background (`#F5F0EB`)
- **Navigation**: Custom pill-shaped bottom tab bar with 7 distinct tabs
- **Architecture**: Context API for state management, React Navigation for routing
- **Components**: Reusable UI elements (`ClothingCard`, `CategoryPill`, `ModTokLogo`)

## Screens Implemented

1. **Sign In / Onboarding**: Custom splash screen and login interface with social auth options
2. **Home (Sort)**: Category browsing, quick stats, and AI outfit suggestions
3. **Style (Outfit Builder)**: Interactive swipe-based outfit creation tool
4. **Share (Social Feed)**: Instagram-style feed with user stories, outfit posts, and interactions
5. **Add Item**: Comprehensive form for cataloguing new items with categories, seasons, and colors
6. **Save**: Organized view for saved outfits, favorite items, and custom collections
7. **Sell**: E-commerce integration screen showing potential earnings and listed items
8. **Profile**: User dashboard showing closet stats, premium upgrade banner, and item grids
9. **Detail Screens**: Dedicated views for individual clothing items and complete outfits

## Getting Started

### Prerequisites

- Node.js (v18 or newer)
- npm, yarn, or pnpm
- Expo Go app on your physical device (optional, for testing)

### Installation

1. Clone the repository and navigate to the project folder:

   ```bash
   cd modtok
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Start the development server:

   ```bash
   pnpm start
   ```

4. Press `i` to open the iOS simulator, or scan the QR code with the Expo Go app on your physical device.

## Apple App Store Submission Guide

This project is pre-configured for Expo Application Services (EAS) to streamline the App Store submission process.

### 1. Setup EAS CLI

Install the EAS command-line tool globally:

```bash
npm install -g eas-cli
```

Log in to your Expo account:

```bash
eas login
```

### 2. Configure App Store Credentials

Update the `eas.json` file in the root directory with your Apple Developer credentials:

```json
"submit": {
  "production": {
    "ios": {
      "appleId": "your-apple-id@email.com",
      "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID",
      "appleTeamId": "YOUR_APPLE_TEAM_ID"
    }
  }
}
```

_Note: You can find your `ascAppId` in App Store Connect under App Information > Apple ID._

### 3. Build for Production

Run the following command to create a production build for iOS:

```bash
eas build --platform ios --profile production
```

EAS will prompt you to log in to your Apple Developer account and will automatically manage your provisioning profiles and distribution certificates.

### 4. Submit to App Store Connect

Once the build is complete, you can submit it directly to App Store Connect (TestFlight):

```bash
eas submit -p ios --profile production
```

### 5. Final App Store Connect Steps

1. Log in to [App Store Connect](https://appstoreconnect.apple.com/).
2. Navigate to your app and select the **TestFlight** tab to add internal or external testers.
3. Once testing is complete, fill out the required App Store metadata (screenshots, description, privacy policy).
4. Select the build you uploaded and click **Submit for Review**.

## Future Development Steps

To complete the full application ecosystem as described in the technical requirements:

1. **Backend Integration**: Replace `src/data/mockData.ts` with real API calls to a Node.js/Python backend.
2. **AI Implementation**: Integrate computer vision APIs (like Google Cloud Vision or AWS Rekognition) for the auto-tagging feature in `AddItemScreen`.
3. **E-Commerce**: Implement Amazon Affiliate API links for the shopping features.
4. **Authentication**: Connect the `SignInScreen` to Firebase Auth, Supabase, or a custom JWT solution.
