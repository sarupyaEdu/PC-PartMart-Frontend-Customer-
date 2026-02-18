import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  getWishlistIds,
  toggleWishlist as apiToggleWishlist,
} from "../api/wishlist";
import { useAuth } from "./AuthContext";

const WishlistContext = createContext(null);

export const WishlistProvider = ({ children }) => {
  const { user } = useAuth();

  const [ids, setIds] = useState([]);
  const [loading, setLoading] = useState(false);

  // load wishlist ids when user logs in
  useEffect(() => {
    let alive = true;

    const run = async () => {
      if (!user) {
        setIds([]);
        return;
      }
      try {
        setLoading(true);
        const list = await getWishlistIds();
        if (alive) setIds((list || []).map(String));
      } catch {
        if (alive) setIds([]);
      } finally {
        if (alive) setLoading(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [user]);

  const isWishlisted = (productId) => ids.includes(String(productId));

  const toggleWishlist = async (productId) => {
    if (!user) return { needLogin: true };

    const id = String(productId);

    // ✅ keep exact previous state for perfect rollback
    const prevIds = ids;

    // ✅ optimistic update
    const nextIds = prevIds.includes(id)
      ? prevIds.filter((x) => x !== id)
      : [id, ...prevIds];

    setIds(nextIds);

    try {
      const r = await apiToggleWishlist(id);
      return r;
    } catch (e) {
      // ✅ precise rollback
      setIds(prevIds);
      throw e;
    }
  };

  const value = useMemo(
    () => ({
      wishlistIds: ids,
      wishlistCount: ids.length,
      wishlistLoading: loading,
      isWishlisted,
      toggleWishlist,
      setWishlistIds: setIds,
    }),
    [ids, loading],
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
};
