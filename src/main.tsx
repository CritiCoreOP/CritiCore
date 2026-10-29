import { createRoot } from "react-dom/client";
import App from "./App.tsx";
// Self-hosted Inter (body font). Loading it from Google Fonts sent every visitor's IP address to
// Google without consent (LG München I, 20.01.2022, 3 O 17493/20)
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "./index.css";
import "./styles/redaim.css";
import { i18nReady } from "./i18n";

// Only non-German visitors wait here: their language is a separate chunk (German is built in)
i18nReady.then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
