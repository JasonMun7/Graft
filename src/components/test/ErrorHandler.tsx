import React from "react";

interface ErrorHandlerProps {
  error: Error | null;
  onClear: () => void;
}

const ErrorHandler: React.FC<ErrorHandlerProps> = ({ error, onClear }) => {
  if (!error) return null;

  const getErrorMessage = (error: Error): string => {
    const message = error.message;

    // Handle specific error types
    if (message.includes("Minified React error")) {
      return "A React rendering error occurred. This usually means an object was passed where a string was expected.";
    }

    if (message.includes("No output language was specified")) {
      return "The Summarizer API requires an output language. Please specify 'en', 'es', or 'ja'.";
    }

    if (message.includes("User activation required")) {
      return "Please click a button first to activate the API, then try again.";
    }

    if (message.includes("API not available")) {
      return "The AI API is not available. Check your Chrome version and enable AI flags.";
    }

    return message;
  };

  const getErrorSuggestions = (error: Error): string[] => {
    const message = error.message;
    const suggestions: string[] = [];

    if (message.includes("Minified React error")) {
      suggestions.push("Check that API results are properly formatted");
      suggestions.push("Ensure object properties are accessed correctly");
      suggestions.push("Verify that the API returned the expected data type");
    }

    if (message.includes("No output language was specified")) {
      suggestions.push("Set outputLanguage to 'en', 'es', or 'ja'");
      suggestions.push("Check that the language code is valid");
    }

    if (message.includes("User activation required")) {
      suggestions.push("Click any button on the page first");
      suggestions.push("Then click the API test button again");
    }

    if (message.includes("API not available")) {
      suggestions.push("Update Chrome to version 140+");
      suggestions.push("Enable AI flags in chrome://flags");
      suggestions.push("Check hardware requirements");
    }

    return suggestions;
  };

  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            ⚠️ Error Occurred
          </h3>
          <p className="text-red-700 mb-3">{getErrorMessage(error)}</p>

          {getErrorSuggestions(error).length > 0 && (
            <div className="mb-3">
              <h4 className="font-medium text-red-800 mb-2">Suggestions:</h4>
              <ul className="text-red-700 text-sm space-y-1">
                {getErrorSuggestions(error).map((suggestion, index) => (
                  <li key={index}>• {suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          <details className="mt-3">
            <summary className="cursor-pointer text-red-600 text-sm font-medium">
              Show technical details
            </summary>
            <pre className="mt-2 p-2 bg-red-100 text-red-800 text-xs rounded overflow-auto">
              {error.stack || error.message}
            </pre>
          </details>
        </div>

        <button
          onClick={onClear}
          className="ml-4 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default ErrorHandler;
