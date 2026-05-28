import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ToastProvider } from "./components/Toast";
import { ThemeProvider } from "./contexts/ThemeContext";
import CreateSession from "./pages/CreateSession";
import MenuPool from "./pages/MenuPool";
import AssignItems from "./pages/AssignItems";
import AdditionalCharges from "./pages/AdditionalCharges";
import PaymentMethods from "./pages/PaymentMethods";
import Summary from "./pages/Summary";
import SharePage from "./pages/SharePage";

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<CreateSession />} />
              <Route path="/menu" element={<MenuPool />} />
              <Route path="/assign" element={<AssignItems />} />
              <Route path="/charges" element={<AdditionalCharges />} />
              <Route path="/payment" element={<PaymentMethods />} />
              <Route path="/summary" element={<Summary />} />
              <Route path="/split/:id" element={<SharePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
