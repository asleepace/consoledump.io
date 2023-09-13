import * as React from "react";
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from "./App";

const root = hydrateRoot(document.getElementById('root'), <App />)
// root.hydrate(<App />)