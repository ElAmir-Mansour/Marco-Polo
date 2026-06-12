import React from "react";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className = "", showText = true, size = "md" }: LogoProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  const textSizes = {
    sm: "text-sm tracking-wider",
    md: "text-lg tracking-widest",
    lg: "text-2xl tracking-widest",
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative flex items-center justify-center">
        {/* Glow effect back */}
        <div className="absolute inset-0 bg-gold-sand/20 rounded-full filter blur-md pointer-events-none scale-75" />
        
        <svg
          className={`${sizeClasses[size]} text-gold-sand relative z-10`}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer Ring */}
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" className="opacity-40" />
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="0.75" strokeDasharray="3 3" className="opacity-60" />
          
          {/* Compass markings */}
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          
          {/* Curly Braces representing Code / Software Engineering */}
          <path d="M7 9C7 6.5 6 10.5 6 11C6 11.5 5.5 12 5 12C5.5 12 6 12.5 6 13C6 13.5 7 17.5 7 15" stroke="#00A896" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M17 9C17 6.5 18 10.5 18 11C18 11.5 18.5 12 19 12C18.5 12 18 12.5 18 13C18 13.5 17 17.5 17 15" stroke="#00A896" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
          
          {/* Golden Compass Needle / Circuit Trail */}
          <path d="M12 5L14.5 12L12 19L9.5 12Z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M12 5L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="12" cy="12" r="1.5" fill="#070F19" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>
      {showText && (
        <span className={`font-serif font-bold text-gold-sand uppercase select-none ${textSizes[size]}`}>
          Silk Road
        </span>
      )}
    </div>
  );
}
