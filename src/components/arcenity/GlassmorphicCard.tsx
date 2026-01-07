import { Box, BoxProps } from "@chakra-ui/react";
import { ReactNode } from "react";

interface GlassmorphicCardProps extends BoxProps {
  children: ReactNode;
  intensity?: "light" | "medium" | "strong";
}

export function GlassmorphicCard({
  children,
  intensity = "medium",
  ...props
}: GlassmorphicCardProps) {
  const blurMap = {
    light: "8px",
    medium: "12px",
    strong: "16px"
  };

  const opacityMap = {
    light: "0.7",
    medium: "0.8",
    strong: "0.9"
  };

  return (
    <Box
      bg={`rgba(255, 255, 255, ${opacityMap[intensity]})`}
      backdropFilter={`blur(${blurMap[intensity]})`}
      WebkitBackdropFilter={`blur(${blurMap[intensity]})`}
      borderRadius="xl"
      borderWidth="1px"
      borderColor="rgba(255, 255, 255, 0.3)"
      boxShadow="0 8px 32px rgba(0, 0, 0, 0.1)"
      position="relative"
      overflow="hidden"
      _before={{
        content: '""',
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "1px",
        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)"
      }}
      {...props}
    >
      {children}
    </Box>
  );
}

