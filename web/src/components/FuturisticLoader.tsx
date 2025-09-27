'use client';

interface FuturisticLoaderProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'circle' | 'bars' | 'pulse' | 'matrix';
}

export function FuturisticLoader({ 
  text = 'LOADING...', 
  size = 'md',
  variant = 'circle' 
}: FuturisticLoaderProps) {
  
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12', 
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const containerSizes = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8', 
    xl: 'p-12'
  };

  if (variant === 'circle') {
    return (
      <div className={`flex flex-col items-center justify-center ${containerSizes[size]}`}>
        {/* Animated Circle Loader */}
        <div className="relative">
          {/* Outer ring */}
          <div className={`${sizeClasses[size]} border-2 border-gray-700 rounded-full animate-spin`}>
            <div className="absolute inset-0 border-2 border-transparent border-t-green-400 rounded-full animate-spin" 
                 style={{ animationDuration: '1s' }}></div>
          </div>
          
          {/* Middle ring */}
          <div className={`absolute inset-1 ${sizeClasses[size === 'xl' ? 'lg' : size === 'lg' ? 'md' : size === 'md' ? 'sm' : 'sm']} border border-gray-600 rounded-full animate-spin`}
               style={{ animationDuration: '2s', animationDirection: 'reverse' }}>
            <div className="absolute inset-0 border border-transparent border-r-green-300 rounded-full animate-spin"
                 style={{ animationDuration: '1.5s' }}></div>
          </div>
          
          {/* Inner core */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
          </div>
        </div>
        
        {/* Loading text */}
        <div className="mt-4 text-center">
          <div className="text-green-400 text-xs font-mono animate-pulse glow-text">
            {text}
          </div>
          <div className="flex justify-center space-x-1 mt-2">
            <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
        
        <style jsx>{`
          .glow-text {
            text-shadow: 0 0 10px #10b981;
          }
        `}</style>
      </div>
    );
  }

  if (variant === 'bars') {
    return (
      <div className={`flex flex-col items-center justify-center ${containerSizes[size]}`}>
        {/* Audio Bars Loader */}
        <div className="flex items-end space-x-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-2 bg-green-400 rounded-t animate-pulse"
              style={{
                height: `${20 + Math.random() * 20}px`,
                animationDelay: `${i * 100}ms`,
                animationDuration: `${800 + Math.random() * 400}ms`
              }}
            ></div>
          ))}
        </div>
        <div className="mt-4 text-green-400 text-xs font-mono animate-pulse">{text}</div>
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className={`flex flex-col items-center justify-center ${containerSizes[size]}`}>
        {/* Pulse Loader */}
        <div className="relative">
          <div className={`${sizeClasses[size]} bg-green-400/20 rounded-full animate-ping`}></div>
          <div className={`absolute inset-2 bg-green-400/40 rounded-full animate-ping`} style={{ animationDelay: '200ms' }}></div>
          <div className={`absolute inset-4 bg-green-400/60 rounded-full animate-ping`} style={{ animationDelay: '400ms' }}></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
          </div>
        </div>
        <div className="mt-4 text-green-400 text-xs font-mono animate-pulse">{text}</div>
      </div>
    );
  }

  if (variant === 'matrix') {
    return (
      <div className={`flex flex-col items-center justify-center ${containerSizes[size]}`}>
        {/* Matrix Style Loader */}
        <div className="grid grid-cols-3 gap-1">
          {[...Array(9)].map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 bg-green-400 rounded-sm animate-pulse"
              style={{
                animationDelay: `${i * 100}ms`,
                animationDuration: `${1000 + Math.random() * 500}ms`
              }}
            ></div>
          ))}
        </div>
        <div className="mt-4 text-green-400 text-xs font-mono">
          <span className="animate-pulse">{text}</span>
        </div>
      </div>
    );
  }

  // Default fallback
  return (
    <div className={`flex items-center justify-center ${containerSizes[size]}`}>
      <div className="text-green-400 text-xs font-mono animate-pulse">{text}</div>
    </div>
  );
}
