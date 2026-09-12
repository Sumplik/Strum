import * as React from "react";
import { Sun, Moon } from "lucide-react";

import { ThemeContext, type Theme } from "./useTheme";

function applyTheme(theme: Theme) {
  const root = document.documentElement; // <html>
  root.classList.remove("light", "dark");
  root.classList.add(theme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    const saved = localStorage.getItem("theme") as Theme | null;
    if (saved === "light" || saved === "dark") return saved;
    return "dark";
  });
  
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const [transitionType, setTransitionType] = React.useState<"toLight" | "toDark" | null>(null);

  React.useEffect(() => {
    applyTheme(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const setTheme = (t: Theme) => {
    // Determine transition type
    const type = t === "dark" ? "toDark" : "toLight";
    setTransitionType(type);
    
    // Trigger transition animation
    setIsTransitioning(true);
    setThemeState(t);
    
    // End transition after animation completes
    setTimeout(() => {
      setIsTransitioning(false);
      setTransitionType(null);
    }, 800);
  };
  
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isTransitioning, transitionType }}>
      {/* Sun/Moon swap animation overlay */}
      {isTransitioning && transitionType && (
        <div className="fixed inset-0 z-[9998] pointer-events-none overflow-hidden">
          {/* Animated celestial body container */}
          <div className={`absolute top-20 right-8 transition-all duration-700 ${
            transitionType === "toDark" 
              ? "animate-sun-exit-right" 
              : "animate-moon-exit-left"
          }`}>
            {transitionType === "toDark" ? (
              <Sun className="w-12 h-12 text-amber-400 drop-shadow-lg" />
            ) : (
              <Moon className="w-12 h-12 text-slate-200 drop-shadow-lg" />
            )}
          </div>
          <div className={`absolute top-20 right-8 transition-all duration-700 ${
            transitionType === "toDark"
              ? "animate-moon-enter-left"
              : "animate-sun-enter-right"
          }`}>
            {transitionType === "toDark" ? (
              <Moon className="w-12 h-12 text-slate-200 drop-shadow-lg" />
            ) : (
              <Sun className="w-12 h-12 text-amber-400 drop-shadow-lg" />
            )}
          </div>
        </div>
      )}
      
      {/* Theme transition overlay */}
      {isTransitioning && (
        <div 
          className={`fixed inset-0 z-[9999] pointer-events-none theme-transition-overlay ${
            theme === "dark" ? "animate-theme-to-dark" : "animate-theme-to-light"
          }`}
        />
      )}
      {children}
    </ThemeContext.Provider>
  );
}
