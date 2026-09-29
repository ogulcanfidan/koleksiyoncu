import { createRoot } from "react-dom/client";
import "@shared/src/base.css";
import "./styles.css";
import "./texts";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(<App />);
