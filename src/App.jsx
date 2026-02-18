import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import DefaultLayout from "./layouts/DefaultLayout";
import FullWidthLayout from "./layouts/FullWidthLayout";
import ReviewsPage from "./pages/ReviewsPage";
import ReviewFormPage from "./pages/ReviewFormPage";
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetails from "./pages/ProductDetails";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MyOrders from "./pages/MyOrders";
import OrderDetails from "./pages/OrderDetails";
import Wishlist from "./pages/Wishlist";
import MyProfile from "./pages/MyProfile";
import Faq from "./pages/Faq";
import Contact from "./pages/Contact";
import MySupport from "./pages/MySupport";
import TerminalProtocols from "./pages/TerminalProtocols";
import About from "./pages/About";
import ScrollToTop from "./components/ScrollToTop";
import TicketDetails from "./pages/SupportDetails";
import MyReviewPage from "./pages/MyReviewPage";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 selection:bg-indigo-500/30">
      <ScrollToTop />

      <Routes>
        {/* Default container layout */}
        <Route element={<DefaultLayout />}>
          <Route path="/cart" element={<Cart />} />
          <Route path="/wishlist" element={<Wishlist />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/orders" element={<MyOrders />} />
            <Route path="/orders/:id" element={<OrderDetails />} />
            <Route path="/support" element={<MySupport />} />
            <Route path="/support/:id" element={<TicketDetails />} />
          </Route>
        </Route>

        {/* Full-width layout */}
        <Route element={<FullWidthLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/my-profile" element={<MyProfile />} />
          <Route path="/terminal-protocols" element={<TerminalProtocols />} />
          <Route path="/products" element={<Products />} />
          <Route path="/product/:slug" element={<ProductDetails />} />
          <Route path="/product/:slug/reviews" element={<ReviewsPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/review/:productId" element={<ReviewFormPage />} />
            <Route path="/my-review/:productId" element={<MyReviewPage />} />
          </Route>
          <Route path="/faq" element={<Faq />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/contact" element={<Contact />} />
          </Route>
          <Route path="/about" element={<About />} />
          {/* ✅ move auth pages here */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>
      </Routes>

      <ToastContainer
        position="bottom-right"
        autoClose={1000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="dark"
      />
    </div>
  );
}
