import { useEffect, useMemo, useState } from "react";
import { getMyProfile, updateMyProfile } from "../api/users";
import { toast } from "react-toastify";
import { uploadAvatar } from "../api/uploads";
import { useAuth } from "../context/AuthContext";

export default function MyProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [initialForm, setInitialForm] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const [avatar, setAvatar] = useState(null); // {url, public_id} from DB
  const [avatarFile, setAvatarFile] = useState(null); // new local file
  const [uploading, setUploading] = useState(false);
  const { user, setUser } = useAuth();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: {
      line1: "",
      line2: "",
      city: "",
      state: "",
      pincode: "",
      country: "India",
    },
  });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getMyProfile();
        const u = data.user;

        const profileForm = {
          name: u.name || "",
          phone: u.phone || "",
          address: {
            line1: u.address?.line1 || "",
            line2: u.address?.line2 || "",
            city: u.address?.city || "",
            state: u.address?.state || "",
            pincode: u.address?.pincode || "",
            country: u.address?.country || "India",
          },
          avatar: u.avatar || null, // ✅ store avatar in initialForm too
        };

        setAvatar(u.avatar || null);
        setForm({
          name: profileForm.name,
          phone: profileForm.phone,
          address: profileForm.address,
        });
        setInitialForm(profileForm);
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ✅ dirty if form changed OR avatar selected OR avatar differs from initial
  const isDirty = useMemo(() => {
    if (!initialForm) return false;

    const formChanged =
      JSON.stringify(form) !==
      JSON.stringify({
        name: initialForm.name,
        phone: initialForm.phone,
        address: initialForm.address,
      });

    const avatarChanged =
      !!avatarFile ||
      JSON.stringify(avatar || null) !==
        JSON.stringify(initialForm.avatar || null);

    return formChanged || avatarChanged;
  }, [form, avatar, avatarFile, initialForm]);

  const setAddr = (key, value) =>
    setForm((p) => ({
      ...p,
      address: { ...p.address, [key]: value },
    }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!isEditing || !isDirty) return;

    setSaving(true);

    try {
      let avatarPayload = avatar;

      // ✅ upload new avatar only if file selected
      if (avatarFile) {
        setUploading(true);
        const { data: uploaded } = await uploadAvatar(avatarFile); // ✅ correct function
        avatarPayload = uploaded; // { url, public_id }
        setUploading(false);
      }

      const payload = {
        ...form,
        avatar: avatarPayload,
      };

      const { data } = await updateMyProfile(payload);
      setUser(data.user); // ✅ THIS updates navbar avatar instantly

      // ✅ update UI states from backend response
      const savedUser = data.user;

      setAvatar(savedUser.avatar || null);

      const newInitial = {
        name: savedUser.name || "",
        phone: savedUser.phone || "",
        address: {
          line1: savedUser.address?.line1 || "",
          line2: savedUser.address?.line2 || "",
          city: savedUser.address?.city || "",
          state: savedUser.address?.state || "",
          pincode: savedUser.address?.pincode || "",
          country: savedUser.address?.country || "India",
        },
        avatar: savedUser.avatar || null,
      };

      setForm({
        name: newInitial.name,
        phone: newInitial.phone,
        address: newInitial.address,
      });
      setInitialForm(newInitial);

      setAvatarFile(null);
      setIsEditing(false);

      toast.success(data?.message || "Profile updated");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const onCancel = () => {
    if (!initialForm) return;

    setForm({
      name: initialForm.name,
      phone: initialForm.phone,
      address: initialForm.address,
    });
    setAvatar(initialForm.avatar || null);
    setAvatarFile(null);
    setIsEditing(false);
  };

  const previewUrl = useMemo(() => {
    if (!avatarFile) return "";
    return URL.createObjectURL(avatarFile);
  }, [avatarFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);
  if (loading)
    return (
      <div className="min-h-screen grid place-items-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-4 opacity-0 animate-[fadeUp_450ms_ease-out_forwards]">
          <div className="h-12 w-12 rounded-full border-4 border-slate-700 border-t-white animate-spin" />
          <div className="text-sm uppercase tracking-widest text-slate-400">
            Loading profile...
          </div>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <style>{`
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(10px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes pop {
        from { opacity: 0; transform: scale(.98); }
        to   { opacity: 1; transform: scale(1); }
      }
    `}</style>
      <div className="mx-auto max-w-3xl p-6 opacity-0 animate-[fadeUp_500ms_ease-out_forwards]">
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="mt-1 text-slate-400">Manage your personal information</p>

        <form
          onSubmit={onSubmit}
          className="mt-6 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 opacity-0 animate-[pop_450ms_ease-out_forwards]"
        >
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div
              className={`relative ${isEditing ? "animate-[pop_350ms_ease-out_forwards]" : ""}`}
            >
              <img
                src={
                  (avatarFile && previewUrl) ||
                  (avatar?.url && avatar.url) ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(form.name || "User")}`
                }
                alt="Profile"
                className="h-24 w-24 rounded-full border border-slate-700 object-cover transition-transform duration-300"
              />

              {isEditing && (
                <label className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-white p-2 text-slate-900 shadow">
                  ✎
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setAvatarFile(file);
                    }}
                  />
                </label>
              )}
            </div>

            <div>
              <h2 className="text-lg font-semibold">
                {form.name || "Your Name"}
              </h2>
              <p className="text-sm text-slate-400">
                {form.phone || "No phone added"}
              </p>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-sm text-slate-300">Full Name</label>
            <input
              disabled={!isEditing}
              className={`mt-1 w-full rounded-xl border px-4 py-3 outline-none ${
                isEditing
                  ? "border-slate-800 bg-slate-950"
                  : "cursor-not-allowed border-slate-700 bg-slate-900/60 text-slate-400"
              }`}
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="text-sm text-slate-300">Email</label>
            <input
              disabled
              value={user?.email || ""}
              className="mt-1 w-full cursor-not-allowed rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-slate-400"
            />
            <p className="mt-1 text-xs text-slate-500">
              Email cannot be changed
            </p>
          </div>

          {/* Phone */}
          <div>
            <label className="text-sm text-slate-300">Phone</label>
            <input
              disabled={!isEditing}
              className={`mt-1 w-full rounded-xl border px-4 py-3 outline-none ${
                isEditing
                  ? "border-slate-800 bg-slate-950"
                  : "cursor-not-allowed border-slate-700 bg-slate-900/60 text-slate-400"
              }`}
              value={form.phone}
              onChange={(e) =>
                setForm((p) => ({ ...p, phone: e.target.value }))
              }
            />
          </div>

          {/* Address */}
          <div className="pt-2">
            <h2 className="text-base font-semibold">Address</h2>

            <div className="mt-3 grid gap-3">
              <input
                disabled={!isEditing}
                placeholder="Address line 1"
                className={`rounded-xl border px-4 py-3 outline-none ${
                  isEditing
                    ? "border-slate-800 bg-slate-950"
                    : "cursor-not-allowed border-slate-700 bg-slate-900/60 text-slate-400"
                }`}
                value={form.address.line1}
                onChange={(e) => setAddr("line1", e.target.value)}
              />
              <input
                disabled={!isEditing}
                placeholder="Address line 2"
                className={`rounded-xl border px-4 py-3 outline-none ${
                  isEditing
                    ? "border-slate-800 bg-slate-950"
                    : "cursor-not-allowed border-slate-700 bg-slate-900/60 text-slate-400"
                }`}
                value={form.address.line2}
                onChange={(e) => setAddr("line2", e.target.value)}
              />

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input
                  disabled={!isEditing}
                  placeholder="City"
                  className={`rounded-xl border px-4 py-3 outline-none ${
                    isEditing
                      ? "border-slate-800 bg-slate-950"
                      : "cursor-not-allowed border-slate-700 bg-slate-900/60 text-slate-400"
                  }`}
                  value={form.address.city}
                  onChange={(e) => setAddr("city", e.target.value)}
                />
                <input
                  disabled={!isEditing}
                  placeholder="State"
                  className={`rounded-xl border px-4 py-3 outline-none ${
                    isEditing
                      ? "border-slate-800 bg-slate-950"
                      : "cursor-not-allowed border-slate-700 bg-slate-900/60 text-slate-400"
                  }`}
                  value={form.address.state}
                  onChange={(e) => setAddr("state", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input
                  disabled={!isEditing}
                  placeholder="Pincode"
                  className={`rounded-xl border px-4 py-3 outline-none ${
                    isEditing
                      ? "border-slate-800 bg-slate-950"
                      : "cursor-not-allowed border-slate-700 bg-slate-900/60 text-slate-400"
                  }`}
                  value={form.address.pincode}
                  onChange={(e) => setAddr("pincode", e.target.value)}
                />
                <input
                  disabled={!isEditing}
                  placeholder="Country"
                  className={`rounded-xl border px-4 py-3 outline-none ${
                    isEditing
                      ? "border-slate-800 bg-slate-950"
                      : "cursor-not-allowed border-slate-700 bg-slate-900/60 text-slate-400"
                  }`}
                  value={form.address.country}
                  onChange={(e) => setAddr("country", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="w-full rounded-xl border border-slate-700 py-3 font-bold text-white hover:bg-slate-800"
            >
              Edit Profile
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 rounded-xl border border-slate-700 py-3 font-bold text-white"
              >
                Cancel
              </button>

              {isDirty && (
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="flex-1 rounded-xl bg-white py-3 font-bold text-slate-950 disabled:opacity-60"
                >
                  {uploading
                    ? "Uploading photo..."
                    : saving
                      ? "Saving..."
                      : "Save Changes"}
                </button>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
