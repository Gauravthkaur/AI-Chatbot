# AI Chat Assistant

A Next.js application featuring a chat modal with a floating action button. The application stores user messages in MongoDB Atlas and uses Google's Gemini AI to generate responses.

## Features

- Floating chat button in the bottom right corner
- Expandable chat modal with message history
- Real-time AI responses using Gemini AI
- Message storage in MongoDB Atlas
- Responsive design with Tailwind CSS
- TypeScript for type safety

## Tech Stack

- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- MongoDB Atlas
- Google Generative AI (Gemini)

## Getting Started

### Prerequisites

- Node.js 18.17.0 or later
- npm or yarn
- MongoDB Atlas account
- Google AI Studio API key (for Gemini AI)

### Installation

1. Clone the repository

```bash
git clone <repository-url>
cd ai-chat-assistant
```

2. Install dependencies

```bash
npm install
# or
yarn install
```

3. Set up environment variables

Copy the `.env.local.example` file to `.env.local` and fill in your MongoDB URI and Gemini API key:

```bash
cp .env.local.example .env.local
```

Edit the `.env.local` file with your credentials:

```
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
GEMINI_API_KEY=your_gemini_api_key_here
```

### Running the Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── chat/
│   │   │       └── route.ts    # API endpoint for chat
│   │   ├── globals.css         # Global styles
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Home page
│   ├── components/
│   │   ├── ChatButton.tsx      # Floating chat button
│   │   └── ChatWindow.tsx      # Chat modal component
│   ├── lib/
│   │   ├── gemini.ts           # Gemini AI integration
│   │   └── mongodb.ts          # MongoDB connection
│   └── types/
│       └── chat.ts             # TypeScript interfaces
├── .env.local.example          # Environment variables template
├── next.config.ts              # Next.js configuration
└── tailwind.config.js          # Tailwind CSS configuration
```

## Customization

- Modify the UI components in the `components` directory
- Adjust the styling using Tailwind CSS classes
- Extend the API functionality in the `api` directory

## Deployment

This application can be deployed on Vercel, Netlify, or any other platform that supports Next.js applications.

```bash
npm run build
# or
yarn build
```

Make sure to set up the environment variables on your deployment platform.
