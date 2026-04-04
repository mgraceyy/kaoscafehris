import { Routes, Route } from "react-router-dom";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Routes will be added per module */}
      <Route path="/" element={<div>KAOS Cafe HRIS</div>} />
    </Routes>
  );
}
