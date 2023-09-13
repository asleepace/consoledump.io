import * as React from "react";
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from "./App";

// once the page has initially rendered, we can hydrate the application by
// attaching event listeners to the existing markup.
hydrateRoot(document, <App />)
