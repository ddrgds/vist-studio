import React, { useEffect, useState, useCallback } from 'react';

interface ApiKeyGuardProps {
  children: React.ReactNode;
}

const ApiKeyGuard: React.FC<ApiKeyGuardProps> = ({ children }) => {
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const checkKey = useCallback(async () => {
    try {
      // API keys are now proxied server-side — no client-side key needed.
      // If running inside Google AI Studio, still check its interface.
      const aistudio = (window as any).aistudio;
      if (aistudio && aistudio.hasSelectedApiKey) {
        const selected = await aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } else {
        // Normal deployment — proxy handles auth, always allow through
        setHasKey(true);
      }
    } catch (error) {
      console.error("Failed to check API key status:", error);
      setHasKey(true); // Don't block the app on check failure
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkKey();
  }, [checkKey]);

  const handleSelectKey = async () => {
    setErrorMessage(null);
    const aistudio = (window as any).aistudio;
    if (aistudio && aistudio.openSelectKey) {
      try {
        await aistudio.openSelectKey();
        // Assume success after interaction
        setHasKey(true);
      } catch (error: any) {
        console.error("Key selection failed:", error);
        if (error.message && error.message.includes("Requested entity was not found")) {
            setHasKey(false);
            setErrorMessage("Could not select the project. Please try again.");
        } else {
            setErrorMessage("Error selecting the API key. Please try again.");
        }
      }
    } else {
        setErrorMessage("The API key selection interface is not available in this environment.");
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-400" aria-live="polite" aria-busy="true">
        <div className="flex flex-col items-center gap-3">
            <svg aria-hidden="true" className="animate-spin h-6 w-6 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm">Starting Studio...</span>
        </div>
      </div>
    );
  }

  if (!hasKey) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Authentication Required</h1>
          <p className="text-zinc-400 mb-8">
            To use the image generation features (Gemini 3 Pro), you must select a valid API key with billing enabled.
          </p>
          
          {errorMessage && (
            <p role="alert" className="mb-4 text-sm text-red-400 bg-red-900/20 border border-red-500/20 rounded-lg px-3 py-2">
              {errorMessage}
            </p>
          )}

          <button
            onClick={handleSelectKey}
            className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium rounded-lg transition-all duration-200 shadow-lg shadow-purple-900/20"
          >
            Select API Key
          </button>
          
          <p className="mt-6 text-xs text-zinc-500">
            Learn more about billing at{' '}
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
              Google AI Billing Docs
            </a>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ApiKeyGuard;