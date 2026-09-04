import { extendTheme, type ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "light",
  useSystemColorMode: false,
};

export const theme = extendTheme({
  config,
  colors: {
    brand: {
      50: "#EEF0FD",
      100: "#C9D0FA",
      300: "#818CF8",
      500: "#4F46E5", // Base primary
      700: "#3730A3",
      900: "#251F6E",
    },
    accent: {
      50: "#FFF1EF",
      100: "#FFDAD5",
      300: "#FF9B8F",
      500: "#FF6B5B", // Base accent
      700: "#E04E3D",
      900: "#A83527",
    },
    success: {
      500: "#10B981", // Isolated completion/correctness state only
    },
  },
  semanticTokens: {
    colors: {
      "bg.canvas": {
        default: "#FAFAF9",
        _dark: "#0F0E17",
      },
      "bg.surface": {
        default: "#FFFFFF",
        _dark: "#1A1825",
      },
      "border.subtle": {
        default: "#E7E5E4",
        _dark: "#2A273A",
      },
      "text.primary": {
        default: "#1C1917",
        _dark: "#FAFAF9",
      },
      "text.secondary": {
        default: "#78716C",
        _dark: "#A8A29E",
      },
      "brand.base": {
        default: "#4F46E5",
        _dark: "#5C5FE6", // Adjusted from #6366F1 to pass WCAG AA (4.90:1 contrast with white text)
      },
      "accent.base": {
        default: "#FF6B5B",
        _dark: "#FF7B6B",
      },
    },
  },
  styles: {
    global: {
      body: {
        bg: "bg.canvas",
        color: "text.primary",
      },
    },
  },
});

export default theme;
