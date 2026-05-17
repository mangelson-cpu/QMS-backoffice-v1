import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface ThemeColors {
  primaryColor: string;
  secondaryColor: string;
}

interface ThemeContextType {
  colors: ThemeColors;
  updateColors: (colors: ThemeColors) => Promise<{ success: boolean; error?: string }>;
  applyColorsLocally: (colors: ThemeColors) => void;
  loading: boolean;
}

const DEFAULT_COLORS: ThemeColors = {
  primaryColor: "#8b5cf6",
  secondaryColor: "#d4145a",
};

const ThemeContext = createContext<ThemeContextType>({
  colors: DEFAULT_COLORS,
  updateColors: async () => ({ success: false }),
  applyColorsLocally: () => { },
  loading: true,
});

export const useTheme = () => useContext(ThemeContext);


function setCSSVariables(colors: ThemeColors) {
  const root = document.documentElement;
  root.style.setProperty("--primary-color", colors.primaryColor);
  root.style.setProperty("--secondary-color", colors.secondaryColor);


  root.style.setProperty("--primary-color-rgb", hexToRgb(colors.primaryColor));
  root.style.setProperty("--secondary-color-rgb", hexToRgb(colors.secondaryColor));
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "139, 92, 246";
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [colors, setColors] = useState<ThemeColors>(DEFAULT_COLORS);
  const [loading, setLoading] = useState(true);

  // Charger les couleurs depuis le localStorage (ou défaut)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme_colors");
      if (saved) {
        const parsed = JSON.parse(saved) as ThemeColors;
        setColors(parsed);
        setCSSVariables(parsed);
      } else {
        setCSSVariables(DEFAULT_COLORS);
      }
    } catch {
      setCSSVariables(DEFAULT_COLORS);
    } finally {
      setLoading(false);
    }
  }, []);


  const applyColorsLocally = useCallback((newColors: ThemeColors) => {
    setCSSVariables(newColors);
  }, []);


  const updateColors = useCallback(async (newColors: ThemeColors): Promise<{ success: boolean; error?: string }> => {
    try {
      setColors(newColors);
      setCSSVariables(newColors);
      localStorage.setItem("theme_colors", JSON.stringify(newColors));
      return { success: true };
    } catch (err) {
      const error = err as Error;
      return { success: false, error: error.message };
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ colors, updateColors, applyColorsLocally, loading }}>
      {children}
    </ThemeContext.Provider>
  );
};

