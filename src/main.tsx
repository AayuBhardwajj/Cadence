import React from "react";
import ReactDOM from "react-dom/client";
import { ChakraProvider, extendTheme } from "@chakra-ui/react";
import App from "./App";
import "./index.css";

const theme = extendTheme({
  config: {
    initialColorMode: "light",
    useSystemColorMode: false
  },
  styles: {
    global: {
      body: {
        bg: "gray.50",
        color: "gray.800"
      }
    }
  }
});

import { TierProvider } from "./lib/TierContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <TierProvider>
        <App />
      </TierProvider>
    </ChakraProvider>
  </React.StrictMode>
);


