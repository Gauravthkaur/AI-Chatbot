import ChatButton from '@/components/ChatButton';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-4xl font-bold mb-6">Welcome to AI Chat Assistant</h1>
        <p className="text-lg mb-8">
          Click on the chat button in the bottom right corner to start a conversation with our AI assistant.
        </p>
      </div>
      <ChatButton />
    </main>
  );
}
