import AppLoadingSkeleton from './components/AppLoadingSkeleton';
import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const Index = lazy(() => import("./pages/Index"));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Toaster />
    <BrowserRouter>
      <Suspense fallback={<AppLoadingSkeleton />}>
        <Routes>
     <Route path="/" element={<Index />}>
       <Route index element={<HomeScreen />} />
       <Route path="lot/:locName" element={<SpotsScreen />} />
       <Route path="booking/:bookingId" element={<TicketScreen />} />
       <Route path="bookings" element={<BookingsScreen />} />
       <Route path="profile" element={<ProfileScreen />} />
       <Route path="admin/dashboard" element={<DashboardScreen />} />
       <Route path="admin/tickets" element={<TicketsScreen />} />
       <Route path="admin/receivables" element={<ReceivablesScreen />} />
       <Route path="admin/settings" element={<SettingsScreen />} />
     </Route>
     <Route path="/login" element={<LoginScreen />} />
     <Route path="/signup" element={<SignupScreen />} />
     <Route path="/admin-login" element={<AdminLoginScreen />} />
     <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
     <Route path="/complete-profile" element={<CompleteProfileScreen />} />
     <Route path="/reset-password" element={<ResetPasswordPage />} />
     <Route path="*" element={<NotFound />} />
   </Routes>
      </Suspense>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
