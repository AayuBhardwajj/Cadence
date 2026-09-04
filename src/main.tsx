import React from "react";
import ReactDOM from "react-dom/client";
import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from "./App";
import "./index.css";
import theme from "./theme";

const queryClient = new QueryClient();

import { TierProvider } from "./lib/TierContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ColorModeScript initialColorMode={theme.config.initialColorMode} />
    <QueryClientProvider client={queryClient}>
      <ChakraProvider theme={theme}>
        <TierProvider>
          <App />
        </TierProvider>
      </ChakraProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
