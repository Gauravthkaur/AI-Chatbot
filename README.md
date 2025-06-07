# 🤖 AI Chat Assistant

A modern, responsive chat application built with Next.js that integrates Google's Gemini AI for intelligent conversations. The application features a user-friendly interface with real-time messaging and persistent chat history using MongoDB.

## ✨ Features

- **Intelligent AI Conversations**: Powered by Google's Gemini AI for natural, context-aware responses
- **Persistent Chat History**: Messages are stored in MongoDB Atlas for continuity across sessions
- **Modern UI/UX**: Clean, responsive design with smooth animations and dark mode support
- **Real-time Interaction**: Instant message delivery and typing indicators
- **Type Safety**: Built with TypeScript for better developer experience
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Secure**: Environment-based configuration for sensitive data

## 🚀 Tech Stack

- **Frontend**:
  - Next.js 14 (App Router)
  - TypeScript
  - Tailwind CSS + Framer Motion
  - React Hook Form

- **Backend**:
  - Next.js API Routes
  - Google Generative AI (Gemini)
  - MongoDB Atlas (Database)
  - Mongoose (ODM)

## 🏁 Getting Started

### Prerequisites

- Node.js 18.17.0 or later
- npm (v9+) or yarn (v1.22+)
- MongoDB Atlas account (free tier available)
- Google AI Studio API key (for Gemini AI)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ai-chat-assistant.git
   cd ai-chat-assistant
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   Update the `.env.local` file with your credentials:
   ```
   MONGODB_URI=your_mongodb_connection_string
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## 🏗️ Project Structure

```
├── src/
│   ├── app/                    # Next.js 13+ App Router
│   │   ├── api/                # API routes
│   │   │   └── chat/           # Chat API endpoints
│   │   │       └── route.ts    # Chat API implementation
│   │   ├── globals.css         # Global styles
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Home page
│   ├── components/             # Reusable UI components
│   │   ├── ChatButton.tsx      # Floating action button
│   │   ├── ChatWindow.tsx      # Chat interface
│   │   ├── Message.tsx         # Individual message component
│   │   └── TypingIndicator.tsx # Loading animation
│   ├── lib/                    # Utility functions
│   │   ├── gemini.ts           # Gemini AI client
│   │   └── mongodb.ts          # Database connection
│   └── types/                  # TypeScript type definitions
│       └── chat.ts             # Chat-related types
├── .env.local.example          # Environment variables template
├── next.config.ts              # Next.js configuration
├── tailwind.config.js          # Tailwind CSS configuration
└── tsconfig.json               # TypeScript configuration
```

## 🛠️ Customization

- **Styling**: Modify the Tailwind CSS configuration in `tailwind.config.js`
- **AI Behavior**: Adjust the prompt and parameters in `src/lib/gemini.ts`
- **Database**: Update the schema in `src/lib/mongodb.ts`
- **UI Components**: Customize components in the `src/components` directory

## 🌐 Deployment

### Vercel (Recommended)
1. Push your code to a GitHub/GitLab/Bitbucket repository
2. Import the repository on Vercel
3. Add your environment variables in the Vercel dashboard
4. Deploy!

### Build for Production
```bash
# Build the application
npm run build

# Start the production server
npm start
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js Documentation](https://nextjs.org/docs)
- [Google AI Gemini](https://ai.google.dev/)
- [MongoDB Atlas](https://www.mongodb.com/atlas/database)
- [Tailwind CSS](https://tailwindcss.com/)
