import { render } from "preact";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App";
import "./styles.css";

// New versions activate on the next open, never mid-session.
registerSW({ immediate: true });

const root = document.getElementById("app");
if (root) render(<App />, root);
