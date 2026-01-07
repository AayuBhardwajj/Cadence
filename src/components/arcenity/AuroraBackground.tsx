import { Box, BoxProps } from "@chakra-ui/react";
import { ReactNode } from "react";

interface AuroraBackgroundProps extends BoxProps {
  children: ReactNode;
  variant?: "blue" | "purple" | "green" | "mixed";
}

export function AuroraBackground({
  children,
  variant = "mixed",
  ...props
}: AuroraBackgroundProps) {
  const gradients = {
    blue: {
      gradient1: "rgba(33, 150, 243, 0.15)",
      gradient2: "rgba(66, 165, 245, 0.12)",
      gradient3: "rgba(100, 181, 246, 0.1)"
    },
    purple: {
      gradient1: "rgba(156, 39, 176, 0.15)",
      gradient2: "rgba(171, 71, 188, 0.12)",
      gradient3: "rgba(186, 104, 200, 0.1)"
    },
    green: {
      gradient1: "rgba(76, 175, 80, 0.15)",
      gradient2: "rgba(102, 187, 106, 0.12)",
      gradient3: "rgba(129, 199, 132, 0.1)"
    },
    mixed: {
      gradient1: "rgba(33, 150, 243, 0.12)",
      gradient2: "rgba(156, 39, 176, 0.1)",
      gradient3: "rgba(76, 175, 80, 0.08)"
    }
  };

  const colors = gradients[variant];

  return (
    <Box
      position="relative"
      overflow="hidden"
      {...props}
      _before={{
        content: '""',
        position: "absolute",
        top: "-50%",
        left: "-50%",
        width: "200%",
        height: "200%",
        background: `radial-gradient(circle at 20% 30%, ${colors.gradient1} 0%, transparent 50%),
                     radial-gradient(circle at 80% 70%, ${colors.gradient2} 0%, transparent 50%),
                     radial-gradient(circle at 50% 50%, ${colors.gradient3} 0%, transparent 50%)`,
        animation: "aurora 20s ease-in-out infinite alternate",
        pointerEvents: "none",
        zIndex: 0
      }}
      _after={{
        content: '""',
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `radial-gradient(circle at 60% 20%, ${colors.gradient2} 0%, transparent 40%),
                     radial-gradient(circle at 30% 80%, ${colors.gradient1} 0%, transparent 40%)`,
        animation: "aurora 15s ease-in-out infinite alternate-reverse",
        pointerEvents: "none",
        zIndex: 0
      }}
      sx={{
        "@keyframes aurora": {
          "0%": {
            transform: "rotate(0deg) scale(1)",
            opacity: 0.8
          },
          "50%": {
            transform: "rotate(180deg) scale(1.1)",
            opacity: 1
          },
          "100%": {
            transform: "rotate(360deg) scale(1)",
            opacity: 0.8
          }
        }
      }}
    >
      <Box position="relative" zIndex={1}>
        {children}
      </Box>
    </Box>
  );
}

