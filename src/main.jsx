import React from "react";
import { createRoot } from "react-dom/client";
import LuftLandUndSee from "./App.jsx";
import "./style.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LuftLandUndSee />
  </React.StrictMode>
);
