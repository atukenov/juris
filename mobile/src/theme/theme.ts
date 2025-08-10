export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textLight: string;
    border: string;
    error: string;
    success: string;
    warning: string;
    white: string;
  };
  typography: {
    h1: {
      fontSize: number;
      fontWeight: string;
    };
    h2: {
      fontSize: number;
      fontWeight: string;
    };
    h3: {
      fontSize: number;
      fontWeight: string;
    };
    body: {
      fontSize: number;
      fontWeight: string;
    };
    caption: {
      fontSize: number;
      fontWeight: string;
      color?: string;
    };
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
  };
}

export const theme: Theme = {
  colors: {
    primary: "#2D3436",
    secondary: "#636E72",
    accent: "#0984E3",
    background: "#FFFFFF",
    surface: "#F5F6FA",
    text: "#2D3436",
    textLight: "#636E72",
    border: "#DFE6E9",
    error: "#D63031",
    success: "#00B894",
    warning: "#FF9500",
    white: "#FFFFFF",
  },
  typography: {
    h1: {
      fontSize: 24,
      fontWeight: "bold",
    },
    h2: {
      fontSize: 20,
      fontWeight: "bold",
    },
    h3: {
      fontSize: 18,
      fontWeight: "600",
    },
    body: {
      fontSize: 16,
      fontWeight: "400",
    },
    caption: {
      fontSize: 14,
      fontWeight: "400",
      color: "#636E72",
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 16,
  },
};
