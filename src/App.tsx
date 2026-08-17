import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Welcome from "./screens/onboarding/Welcome";
import SignUp from "./screens/onboarding/SignUp";
import SignIn from "./screens/onboarding/SignIn";
import ForgotPassword from "./screens/onboarding/ForgotPassword";
import ResetPassword from "./screens/onboarding/ResetPassword";
import VerifyPhone from "./screens/onboarding/VerifyPhone";
import VerifyCode from "./screens/onboarding/VerifyCode";
import Loading from "./screens/onboarding/Loading";
import RoleSelect from "./screens/onboarding/RoleSelect";
import BusinessInfo from "./screens/onboarding/BusinessInfo";
import TaxDetails from "./screens/onboarding/TaxDetails";
import Industry from "./screens/onboarding/Industry";
import BusinessContext from "./screens/onboarding/BusinessContext";
import InviteAccountant from "./screens/onboarding/InviteAccountant";
import Dashboard from "./screens/onboarding/Dashboard";
import ComingSoon from "./screens/onboarding/ComingSoon";
import AuthCallback from "./screens/onboarding/AuthCallback";
import CustomersList from "./screens/sales/CustomersList";
import AddCustomer from "./screens/sales/AddCustomer";
import CustomerDetail from "./screens/sales/CustomerDetail";
import CreateEstimate from "./screens/sales/CreateEstimate";
import EstimateDashboard from "./screens/sales/EstimateDashboard";
import EditBusiness from "./screens/sales/EditBusiness";
import EstimateDetail from "./screens/sales/EstimateDetail";
import InvoiceDashboard from "./screens/sales/InvoiceDashboard";
import CreateInvoice from "./screens/sales/CreateInvoice";
import InvoiceDetail from "./screens/sales/InvoiceDetail";
import SendInvoice from "./screens/sales/SendInvoice";
import PrintInvoice from "./screens/sales/PrintInvoice";
import SendEstimate from "./screens/sales/SendEstimate";
import PrintEstimate from "./screens/sales/PrintEstimate";
import RecordPayment from "./screens/sales/RecordPayment";

function App() {
  return (
    <Routes>
      {/* Public — no session required */}
      <Route path="/" element={<Welcome />} />
      <Route path="/sign-up" element={<SignUp />} />
      <Route path="/login" element={<SignIn />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Protected — every route below requires a real logged-in session */}
      <Route element={<ProtectedRoute />}>
        <Route path="/verify-phone" element={<VerifyPhone />} />
        <Route path="/loading" element={<Loading />} />
        <Route path="/verify-code" element={<VerifyCode />} />
        <Route path="/role" element={<RoleSelect />} />
        <Route path="/business-info" element={<BusinessInfo />} />
        <Route path="/tax-details" element={<TaxDetails />} />
        <Route path="/industry" element={<Industry />} />
        <Route path="/business-context" element={<BusinessContext />} />
        <Route path="/invite-accountant" element={<InviteAccountant />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/coming-soon/:feature" element={<ComingSoon />} />
        <Route path="/customers" element={<CustomersList />} />
        <Route path="/customers/new" element={<AddCustomer />} />
        <Route path="/customers/:id" element={<CustomerDetail />} />
        <Route path="/estimates/new" element={<CreateEstimate />} />
        <Route path="/estimates" element={<EstimateDashboard />} />
        <Route path="/estimates/:id" element={<EstimateDetail />} />
        <Route path="/estimates/:id/edit" element={<CreateEstimate />} />
        <Route path="/estimates/:id/send" element={<SendEstimate />} />
        <Route path="/estimates/:id/print" element={<PrintEstimate />} />
        <Route path="/estimates/:id/payment" element={<RecordPayment />} />
        <Route path="/business" element={<EditBusiness />} />
        <Route path="/invoices" element={<InvoiceDashboard />} />
        <Route path="/invoices/new" element={<CreateInvoice />} />
        <Route path="/invoices/:id/edit" element={<CreateInvoice />} />
        <Route path="/invoices/:id" element={<InvoiceDetail />} />
        <Route path="/invoices/:id/send" element={<SendInvoice />} />
        <Route path="/invoices/:id/print" element={<PrintInvoice />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
