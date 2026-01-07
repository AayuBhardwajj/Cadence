import * as React from "react";
import { Button as ChakraButton, ButtonProps } from "@chakra-ui/react";

/**
 * A shadcn/ui-inspired button, implemented on top of Chakra UI.
 * This keeps the API ergonomic while staying within this stack.
 */
export interface ShadButtonProps extends ButtonProps {
  variant?: "default" | "outline" | "ghost";
}

export const Button = React.forwardRef<HTMLButtonElement, ShadButtonProps>(
  ({ children, variant = "default", ...props }, ref) => {
    const colorScheme = "blue";

    const variantMap: Record<NonNullable<ShadButtonProps["variant"]>, string> =
      {
        default: "solid",
        outline: "outline",
        ghost: "ghost"
      };

    return (
      <ChakraButton
        ref={ref}
        colorScheme={colorScheme}
        variant={variantMap[variant]}
        borderRadius="full"
        fontWeight="semibold"
        {...props}
      >
        {children}
      </ChakraButton>
    );
  }
);

Button.displayName = "Button";


