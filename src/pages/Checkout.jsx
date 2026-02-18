import { useEffect, useMemo, useState } from "react";
import { useCart } from "../context/CartContext";
import { createOrder } from "../api/orders";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import loadRazorpay from "../utils/loadRazorpay";
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  cancelRazorpayAttempt,
} from "../api/payments";

const fmtINR = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export default function Checkout() {
  const { user } = useAuth();

  const [deliverToAnother, setDeliverToAnother] = useState(false);

  const { cart, clearCart, removeFromCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Buy Now: ProductDetails sends { state: { buyNowId: p._id } }
  const buyNowId = location.state?.buyNowId || null;

  // ✅ helper: choose discounted price only when valid
  // ✅ helper: timedOffer > finalPrice (bundle) > discountPrice > price
  const getUnitPrice = (x) => {
    const price = Number(x?.price ?? 0);
    const dp = Number(x?.discountPrice ?? 0);

    const type = x?.type || "SINGLE";
    const isBundle = type === "BUNDLE";

    // --- timed offer (ONLY if active + not ended + has numeric price) ---
    const t = x?.timedOffer;
    const end = t?.endAt ? new Date(t.endAt).getTime() : 0;
    const active = t?.effectiveActive === true || t?.isActive === true;

    const timedLive =
      active &&
      Number.isFinite(end) &&
      end > Date.now() &&
      Number.isFinite(Number(t?.price));

    if (timedLive) return Number(t.price);

    // --- bundle finalPrice (your backend calculates bundle finalPrice) ---
    const fp = Number(x?.finalPrice);
    if (isBundle && Number.isFinite(fp)) return fp;

    // --- normal discount ---
    const hasDiscount = dp > 0 && dp < price;
    return hasDiscount ? dp : price;
  };

  // ✅ strike/context price for showing line-through
  // - SINGLE: normal price
  // - BUNDLE: sum of included items (discountPrice if valid else price) * qty
  const getStrikePrice = (x) => {
    const type = x?.type || "SINGLE";
    const isBundle = type === "BUNDLE";

    if (!isBundle) return Number(x?.price ?? 0);

    const items = Array.isArray(x?.bundleItems) ? x.bundleItems : [];

    const sum = items.reduce((acc, it) => {
      const qty = Number(it?.qty ?? 1);

      const p = it?.product || {};
      const price = Number(p?.price ?? 0);
      const dp = Number(p?.discountPrice ?? 0);

      const unit = dp > 0 && dp < price ? dp : price;

      return acc + unit * (Number.isFinite(qty) ? qty : 1);
    }, 0);

    return Number.isFinite(sum) ? sum : Number(x?.price ?? 0);
  };

  // ✅ If buyNowId exists, checkout ONLY that item, else checkout full cart
  const checkoutItems = useMemo(() => {
    if (!buyNowId) return cart;
    return cart.filter((x) => String(x._id) === String(buyNowId));
  }, [cart, buyNowId]);

  // ✅ total based on checkout items
  const subtotal = useMemo(() => {
    return checkoutItems.reduce((sum, x) => {
      const unit = getUnitPrice(x);
      return sum + unit * Number(x.qty || 0);
    }, 0);
  }, [checkoutItems]);

  // ✅ original subtotal (context price)
  const originalSubtotal = useMemo(() => {
    return checkoutItems.reduce((sum, x) => {
      const originalUnit = getStrikePrice(x);
      return sum + originalUnit * Number(x.qty || 0);
    }, 0);
  }, [checkoutItems]);

  // ✅ total discount
  const totalDiscount = Math.max(0, originalSubtotal - subtotal);

  const [shipping, setShipping] = useState({
    name: "",
    phone: "",
    addressLine1: "",
    city: "",
    state: "",
    pincode: "",
  });

  useEffect(() => {
    if (!user) return;

    const prof = user;

    const fromProfile = {
      name: prof?.name || "",
      phone: prof?.phone || "",
      addressLine1:
        prof?.address?.line1 ||
        prof?.address?.addressLine1 || // in case your backend uses a different key
        "",
      city: prof?.address?.city || "",
      state: prof?.address?.state || "",
      pincode: prof?.address?.pincode || "",
    };

    // only auto-fill when NOT using another address
    if (!deliverToAnother) setShipping(fromProfile);
  }, [user, deliverToAnother]);

  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [placing, setPlacing] = useState(false);

  const onShipChange = (key) => (e) =>
    setShipping((prev) => ({ ...prev, [key]: e.target.value }));

  const validate = () => {
    if (!checkoutItems.length) return "Cart is empty";
    if (!shipping.name.trim()) return "Name is required";
    if (!shipping.phone.trim()) return "Phone is required";
    if (!/^\d{10}$/.test(shipping.phone.trim()))
      return "Phone must be 10 digits";
    if (!shipping.addressLine1.trim()) return "Address Line 1 is required";
    if (!shipping.city.trim()) return "City is required";
    if (!shipping.state.trim()) return "State is required";
    if (!shipping.pincode.trim()) return "Pincode is required";
    if (!/^\d{6}$/.test(shipping.pincode.trim()))
      return "Pincode must be 6 digits";
    return "";
  };

  const placeOrder = async () => {
    // ✅ instant feedback
    const v = validate();
    if (v) {
      toast.dismiss("checkout-err");
      toast.error(`❌ ${v}`, { toastId: "checkout-err" });
      return;
    }

    setPlacing(true);

    // ✅ loading toast
    toast.dismiss("checkout-placing");
    toast.loading("Placing your order…", { toastId: "checkout-placing" });

    try {
      const payload = {
        items: checkoutItems.map((p) => ({
          productId: p._id,
          qty: p.qty,
        })),

        shippingAddress: {
          name: shipping.name.trim(),
          phone: shipping.phone.trim(),
          addressLine1: shipping.addressLine1.trim(),
          city: shipping.city.trim(),
          state: shipping.state.trim(),
          pincode: shipping.pincode.trim(),
        },

        paymentMethod,
      };

      const res = await createOrder(payload);

      const order = res.data?.order;
      const newOrderId = order?._id;

      if (!newOrderId) throw new Error("Order id missing");

      // ✅ COD flow (same as before)
      if (paymentMethod === "COD") {
        if (buyNowId) removeFromCart(buyNowId);
        else clearCart();

        toast.update("checkout-placing", {
          render: "✅ Order placed successfully!",
          type: "success",
          isLoading: false,
          autoClose: 1400,
        });

        navigate(`/orders/${newOrderId}`);
        return;
      }

      // ✅ Razorpay flow
      toast.update("checkout-placing", {
        render: "Opening Razorpay…",
        type: "info",
        isLoading: true,
        autoClose: false,
      });

      const ok = await loadRazorpay();
      if (!ok) throw new Error("Razorpay SDK failed to load");

      // backend create razorpay order
      const rzpRes = await createRazorpayOrder(newOrderId);
      const { keyId, razorpayOrder } = rzpRes.data;

      const mongoOrderId = newOrderId;

      const options = {
        key: keyId,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: "PC PartMart",
        description: `Order #${String(newOrderId).slice(-6)}`,
        image:
          "https://res.cloudinary.com/da28qhs1u/image/upload/v1771400537/brand-logo_plhqth.png",
        order_id: razorpayOrder.id,

        prefill: {
          name: shipping.name,
          contact: shipping.phone,
        },

        handler: async (response) => {
          try {
            await verifyRazorpayPayment({
              mongoOrderId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (buyNowId) removeFromCart(buyNowId);
            else clearCart();

            toast.update("checkout-placing", {
              render: `✅ Payment successful! Txn: ${response.razorpay_payment_id}`,
              type: "success",
              isLoading: false,
              autoClose: 1200,
            });

            navigate(`/orders/${newOrderId}`);
          } catch (err) {
            toast.update("checkout-placing", {
              render: `❌ ${
                err?.response?.data?.message || "Payment verification failed"
              }`,
              type: "error",
              isLoading: false,
              autoClose: 2500,
            });

            navigate(`/orders/${newOrderId}`);
          }
        },

        modal: {
          ondismiss: async () => {
            try {
              await cancelRazorpayAttempt(
                mongoOrderId,
                "User closed Razorpay popup",
              );
            } catch {}

            toast.update("checkout-placing", {
              render: "❌ Payment cancelled",
              type: "error",
              isLoading: false,
              autoClose: 1500,
            });

            navigate(`/orders/${newOrderId}`);
          },
        },

        theme: { color: "#4f46e5" },
      };

      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", function (resp) {
        const msg =
          resp?.error?.description ||
          resp?.error?.reason ||
          resp?.error?.message ||
          "Payment failed";

        toast.update("checkout-placing", {
          render: `❌ ${msg}`,
          type: "error",
          isLoading: false,
          autoClose: 2500,
        });
      });

      rzp.open();
    } catch (e) {
      const msg = e?.response?.data?.message || "Failed to place order";

      toast.update("checkout-placing", {
        render: `❌ ${msg}`,
        type: "error",
        isLoading: false,
        autoClose: 1800,
      });
    } finally {
      setPlacing(false);
    }
  };

  const buyNowMissing = buyNowId && checkoutItems.length === 0;

  // show toast once if Buy Now item missing
  if (buyNowMissing) {
    toast.dismiss("buynow-missing");
    toast.error(
      "❌ That product is not in your cart. Please go back and try again.",
      {
        toastId: "buynow-missing",
      },
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pt-12 md:px-8 pb-16">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 backdrop-blur-xl p-6 md:p-8 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                Checkout{" "}
                {buyNowId ? (
                  <span className="text-indigo-400">(Buy Now)</span>
                ) : null}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Confirm address and place your order.
              </p>
            </div>

            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Total <span className="text-slate-100">{fmtINR(subtotal)}</span>
            </div>
          </div>

          {buyNowMissing && (
            <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              That product is not in your cart. Please go back and try again.
            </div>
          )}

          {/* Summary */}
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="text-xs font-black uppercase tracking-widest text-slate-400">
              Order Summary
            </div>

            {checkoutItems.length === 0 ? (
              <div className="mt-3 text-sm text-slate-400">
                No items to checkout.
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {checkoutItems.map((x) => {
                  const unit = getUnitPrice(x);
                  const original = getStrikePrice(x);
                  const qty = Number(x.qty || 0);

                  const lineOriginal = original * qty;
                  const lineTotal = unit * qty;

                  // ✅ safe discount (never negative)
                  const lineDiscount = Math.max(0, lineOriginal - lineTotal);

                  return (
                    <div
                      key={x._id}
                      className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
                    >
                      {/* Header Row */}
                      <div className="grid grid-cols-[1fr_auto] items-center mb-3">
                        <div className="text-sm font-bold text-slate-100">
                          {x.title}
                        </div>
                        <div className="text-xs font-bold text-slate-400">
                          Qty: {x.qty}
                        </div>
                      </div>

                      {/* Pricing Table */}
                      <div className="grid grid-cols-2 gap-y-1 text-sm">
                        <div className="text-slate-500">Original</div>
                        <div className="text-right text-slate-400">
                          {fmtINR(lineOriginal)}
                        </div>

                        {lineDiscount > 0 && (
                          <>
                            <div className="text-emerald-400 font-semibold">
                              Discount
                            </div>
                            <div className="text-right text-emerald-400 font-bold">
                              -{fmtINR(lineDiscount)}
                            </div>
                          </>
                        )}

                        <div className="text-slate-400 font-semibold">
                          Total
                        </div>
                        <div className="text-right font-black text-white">
                          {fmtINR(lineTotal)}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="mt-4 border-t border-slate-800 pt-4 space-y-2 text-sm">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal (Original)</span>
                    <span>{fmtINR(originalSubtotal)}</span>
                  </div>

                  <div className="flex justify-between text-emerald-400 font-bold">
                    <span>Total Discount</span>
                    <span>-{fmtINR(totalDiscount)}</span>
                  </div>

                  <div className="flex justify-between text-xl font-black text-white border-t border-slate-800 pt-3 mt-2">
                    <span>Grand Total</span>
                    <span>{fmtINR(subtotal)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Shipping */}
          <div className="mt-6 grid grid-cols-1 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <label className="flex items-center gap-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={deliverToAnother}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setDeliverToAnother(checked);

                    if (checked) {
                      // ✅ clear form when switching to "another address"
                      setShipping({
                        name: "",
                        phone: "",
                        addressLine1: "",
                        city: "",
                        state: "",
                        pincode: "",
                      });
                    }
                  }}
                  className="h-4 w-4 accent-indigo-500"
                />
                Deliver to another address
              </label>

              {!deliverToAnother && (
                <p className="mt-2 text-xs text-slate-500">
                  Using your saved profile address. Turn on to enter a different
                  address.
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Full Name
              </label>
              <input
                disabled={!deliverToAnother}
                className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-indigo-500/60"
                placeholder="Your name"
                value={shipping.name}
                onChange={onShipChange("name")}
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Phone
              </label>
              <input
                disabled={!deliverToAnother}
                className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-indigo-500/60"
                placeholder="10-digit mobile"
                value={shipping.phone}
                onChange={onShipChange("phone")}
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Address Line 1
              </label>
              <textarea
                disabled={!deliverToAnother}
                className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-indigo-500/60"
                rows={3}
                placeholder="House/Flat, Street, Area, Landmark"
                value={shipping.addressLine1}
                onChange={onShipChange("addressLine1")}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  City
                </label>
                <input
                  disabled={!deliverToAnother}
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-indigo-500/60"
                  placeholder="City"
                  value={shipping.city}
                  onChange={onShipChange("city")}
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  State
                </label>
                <input
                  disabled={!deliverToAnother}
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-indigo-500/60"
                  placeholder="State"
                  value={shipping.state}
                  onChange={onShipChange("state")}
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Pincode
                </label>
                <input
                  disabled={!deliverToAnother}
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-indigo-500/60"
                  placeholder="6-digit pincode"
                  value={shipping.pincode}
                  onChange={onShipChange("pincode")}
                  inputMode="numeric"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Payment Method
              </label>
              <select
                className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none focus:border-indigo-500/60"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="COD">Cash on Delivery</option>
                <option value="RAZORPAY">UPI / Card (Razorpay)</option>
              </select>

              <p className="mt-2 text-xs text-slate-500">
                If you choose Razorpay, payment window opens after order
                creation.
              </p>
            </div>

            <button
              onClick={placeOrder}
              disabled={placing || checkoutItems.length === 0}
              className="mt-2 w-full rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow-xl shadow-indigo-500/20 transition-all hover:bg-indigo-500 hover:translate-y-[-2px] active:translate-y-[0px] disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {placing ? "Placing..." : "Place Order"}
            </button>

            <div className="text-xs text-slate-500 text-center">
              Secure checkout • Fast support
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
