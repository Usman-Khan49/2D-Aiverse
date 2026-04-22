import {
  Show,
} from "@clerk/react";
import "./App.css";
import { LandingPage} from "./pages/landingpage"
import { Dashboard } from "./pages/dashboard";



function App() {
  return (
    <>
      <Show when="signed-out">
        <LandingPage />
      </Show>
      <Show when="signed-in">
        <Dashboard />
      </Show>
    </>
  );
}

export default App;
