
import React from "react";

type LogoProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

export const Logo: React.FC<LogoProps> = ({ className, size = "md" }) => {
  const sizeClasses = {
    sm: "text-xl",
    md: "text-3xl",
    lg: "text-5xl"
  };

  return (
    <div className={`flex items-center ${className}`}>
      <div className="relative">
        <span className={`font-serif font-bold gold-text ${sizeClasses[size]}`}>RK</span>
        <span className={`font-serif text-jewel-500 ml-1 ${
          size === "sm" ? "text-xs" : size === "md" ? "text-base" : "text-xl"
        }`}>Jewellers</span>
      </div>
    </div>
  );
};
