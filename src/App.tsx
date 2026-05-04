import React, { useState, useEffect } from "react";
import { Train, User, Lock, BookOpen, Clock, ChevronRight, Search, CheckCircle2, XCircle, Info, Database as DatabaseIcon, Ticket } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Types
interface TrainData {
  TrainID: number;
  TrainName: string;
  Source: string;
  Destination: string;
  TotalSeats: number;
  AvailableSeats: number;
  BaseFare: number;
}

interface Booking {
  BookingID: number;
  BookingDate: string;
  SeatNumber: number;
  Status: string;
  PNR: string;
  TrainName: string;
  Source: string;
  Destination: string;
  Amount?: number;
  PaymentStatus?: string;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ role: "admin" | "user"; identifier?: string } | null>(null);
  const [view, setView] = useState<"home" | "my-bookings" | "admin" | "docs">("home");
  const [trains, setTrains] = useState<TrainData[]>([]);
  const [searchQuery, setSearchQuery] = useState({ source: "", destination: "" });
  const [loading, setLoading] = useState(false);
  const [userPhone, setUserPhone] = useState("");
  const [passengerBookings, setPassengerBookings] = useState<Booking[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchTrains();
  }, []);

  const fetchTrains = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/trains");
      const data = await res.json();
      setTrains(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/search?source=${searchQuery.source}&destination=${searchQuery.destination}`);
      const data = await res.json();
      setTrains(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserBookings = async (phone: string) => {
    if (!phone) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${phone}`); 
      const data = await res.json();
      setPassengerBookings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setView("home");
  };

  if (!isLoggedIn) {
    return <LoginView onLogin={(user) => { 
      setIsLoggedIn(true); 
      setCurrentUser(user); 
    }} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Sidebar Navigation */}
      <aside className="w-[240px] bg-sidebar text-[#94a3b8] flex flex-col py-6 shrink-0">
        <div className="px-6 mb-10 flex items-center gap-2.5 text-white font-bold text-xl tracking-tight">
          <div className="bg-accent rounded-lg p-1.5">
            <Train size={20} className="text-white" />
          </div>
          RailFlow
        </div>

        <nav className="flex-1 space-y-1">
          <NavItem icon={<Train size={18} />} label="Dashboard" active={view === "home"} onClick={() => setView("home")} />
          <NavItem icon={<BookOpen size={18} />} label="My Bookings" active={view === "my-bookings"} onClick={() => setView("my-bookings")} />
          <NavItem icon={<Info size={18} />} label="Documentation" active={view === "docs"} onClick={() => setView("docs")} />
          {currentUser?.role === "admin" && (
            <NavItem icon={<Lock size={18} />} label="Admin Portal" active={view === "admin"} onClick={() => setView("admin")} />
          )}
        </nav>

        <div className="px-6 py-4 mt-auto border-t border-white/5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 border border-white/10 flex items-center justify-center text-white text-[10px] font-bold">
              {currentUser?.role === 'admin' ? 'AD' : 'PS'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">{currentUser?.identifier || "Passenger"}</p>
              <p className="text-[10px] text-text-muted truncate capitalize">{currentUser?.role} Account</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full py-2 rounded-lg border border-white/5 text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-colors"
          >
            Terminal Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-border flex items-center justify-between px-8 sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <span className="bg-slate-50 border border-border px-3 py-1.25 rounded-full text-[13px] font-medium text-text-muted">
                From: <b className="text-text-main font-semibold">New Delhi</b>
              </span>
              <span className="bg-slate-50 border border-border px-3 py-1.25 rounded-full text-[13px] font-medium text-text-muted">
                To: <b className="text-text-main font-semibold">Mumbai</b>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[13px] font-medium text-text-muted">Online Support</span>
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-border" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-8 max-w-[1400px] mx-auto w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {view === "home" && <HomeView trains={trains} onSearch={handleSearch} searchQuery={searchQuery} setSearchQuery={setSearchQuery} loading={loading} setMessage={setMessage} refreshTrains={fetchTrains} />}
                {view === "my-bookings" && (
                  <BookingsView 
                    passengerBookings={passengerBookings} 
                    fetchUserBookings={fetchUserBookings} 
                    loading={loading} 
                    initialQuery={currentUser?.role === 'user' ? currentUser.identifier : ""} 
                  />
                )}
                {view === "admin" && <AdminDashboard trains={trains} refreshTrains={fetchTrains} />}
                {view === "docs" && <DocumentationView setMessage={setMessage} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Notification Toast */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className={`fixed bottom-8 right-8 flex items-center gap-3 rounded-lg px-6 py-4 shadow-xl z-50 ${message.type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}
          >
            {message.type === "success" ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
            <p className="font-medium">{message.text}</p>
            <button onClick={() => setMessage(null)} className="ml-2 hover:opacity-80">×</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`px-6 py-3 flex items-center gap-3 text-sm cursor-pointer transition-all border-r-[3px] ${
        active 
          ? "bg-white/5 text-white border-accent" 
          : "border-transparent hover:text-white hover:bg-white/[0.02]"
      }`}
    >
      <span className={active ? "text-accent" : ""}>{icon}</span>
      {label}
    </div>
  );
}

// --- SUB-COMPONENTS ---

function LoginView({ onLogin }: { onLogin: (user: { role: "admin" | "user", identifier?: string }) => void }) {
  const [tab, setTab] = useState<"user" | "admin">("user");
  const [formData, setFormData] = useState({ username: "", password: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (tab === "admin") {
      try {
        const res = await fetch("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: formData.username, password: formData.password }),
        });
        if (res.ok) {
          onLogin({ role: "admin", identifier: formData.username });
        } else {
          setError("Invalid administrator credentials");
        }
      } catch (err) {
        setError("System connectivity failure");
      }
    } else {
      if (formData.phone.length >= 10) {
        onLogin({ role: "user", identifier: formData.phone });
      } else {
        setError("Invalid mobile identification string");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-100 via-white to-slate-50">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8 space-y-3">
          <div className="w-16 h-16 bg-sidebar rounded-2xl flex items-center justify-center mx-auto shadow-2xl shadow-sidebar/20">
            <Train size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-text-main italic">RAILFLOW PROTOCOL</h1>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-[3px] opacity-70 italic">Managed Railway Reservation Infrastructure</p>
        </div>

        <div className="bg-white rounded-3xl border border-border shadow-2xl overflow-hidden p-8 space-y-8">
          <div className="flex bg-slate-50 p-1 rounded-xl">
            {(['user', 'admin'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${
                  tab === t ? "bg-white text-accent shadow-sm" : "text-text-muted hover:text-text-main"
                }`}
              >
                {t === 'user' ? 'Passenger' : 'Administrator'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-2 text-[11px] text-rose-600 font-bold italic">
                <XCircle size={14} /> {error}
              </motion.div>
            )}

            <div className="space-y-4">
              {tab === "admin" ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Auth Identifier</label>
                    <input
                      required
                      type="text"
                      className="w-full rounded-xl border border-border bg-slate-50 px-4 py-3 text-sm outline-none focus:border-accent font-mono transition-all"
                      placeholder="root / admin"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Cipher Key</label>
                    <input
                      required
                      type="password"
                      className="w-full rounded-xl border border-border bg-slate-50 px-4 py-3 text-sm outline-none focus:border-accent font-mono transition-all"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Registered Mobile ID</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      required
                      type="tel"
                      className="w-full rounded-xl border border-border bg-slate-50 pl-11 pr-4 py-3 text-sm outline-none focus:border-accent font-mono transition-all"
                      placeholder="9876543210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              disabled={loading}
              className="w-full bg-sidebar text-white py-4 rounded-xl font-bold text-xs uppercase tracking-[2px] shadow-xl shadow-sidebar/20 hover:opacity-95 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "AUTHENTICATING..." : "INITIALIZE SESSION"}
            </button>
          </form>

          <p className="text-[10px] text-center text-text-muted italic opacity-60 leading-relaxed px-4">
            Authorized personnel only. All access attempts are electronically logged under the system's security protocol.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function HomeView({ trains, onSearch, searchQuery, setSearchQuery, loading, setMessage, refreshTrains }: any) {
  const [bookingTrain, setBookingTrain] = useState<TrainData | null>(null);

  const stats = [
    { label: "Trains Active", value: trains.length, color: "text-accent" },
    { label: "Avg Occupancy", value: "88.4%", color: "text-emerald-600" },
    { label: "Daily Revenue", value: "₹8.2M", color: "text-slate-900" }
  ];

  return (
    <div className="space-y-8">
      {/* Search Bar (Pills style in Header, but here we update the main search) */}
      <form onSubmit={onSearch} className="flex flex-wrap gap-4 items-end bg-white p-6 rounded-2xl border border-border">
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Departure City</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Source"
              className="w-full rounded-lg border border-border bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-accent"
              value={searchQuery.source}
              onChange={(e) => setSearchQuery({ ...searchQuery, source: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Arrival City</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Destination"
              className="w-full rounded-lg border border-border bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-accent"
              value={searchQuery.destination}
              onChange={(e) => setSearchQuery({ ...searchQuery, destination: e.target.value })}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-accent text-white px-8 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 h-[42px]"
        >
          {loading ? "..." : "Filter Trains"}
        </button>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
        {/* Left Section: Stats + Table */}
        <div className="space-y-8 min-w-0">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {stats.map((stat, i) => (
              <div key={i} className="bg-white p-5 rounded-xl border border-border">
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2">{stat.label}</p>
                <p className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Train List (Table Style) */}
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="bg-slate-50/50 border-b border-border px-6 py-3.5 grid grid-cols-[80px_1fr_1fr_120px_100px] text-[11px] font-bold uppercase tracking-wider text-text-muted">
              <div>Train ID</div>
              <div>Train Name</div>
              <div>Route</div>
              <div>Status</div>
              <div className="text-right">Action</div>
            </div>
            <div className="divide-y divide-border">
              {trains.map((train: TrainData) => (
                <div key={train.TrainID} className="px-6 py-4 grid grid-cols-[80px_1fr_1fr_120px_100px] items-center text-sm group hover:bg-slate-50 transition-colors">
                  <div className="font-mono font-semibold text-accent">#{train.TrainID * 100 + 42}</div>
                  <div className="font-bold text-text-main truncate pr-4">{train.TrainName}</div>
                  <div className="text-text-muted text-xs font-medium">
                    {train.Source} → {train.Destination}
                  </div>
                  <div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight ${train.AvailableSeats > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                      {train.AvailableSeats > 0 ? "On Time" : "Full"}
                    </span>
                  </div>
                  <div className="text-right">
                    <button 
                      onClick={() => setBookingTrain(train)}
                      disabled={train.AvailableSeats === 0}
                      className="text-accent font-bold text-[11px] uppercase tracking-widest hover:underline underline-offset-4 disabled:opacity-30"
                    >
                      Process
                    </button>
                  </div>
                </div>
              ))}
              {trains.length === 0 && !loading && (
                <div className="py-20 text-center text-text-muted text-sm italic">
                  No trains found matching criteria.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Section: Booking Panel */}
        <div className="space-y-6">
          <section className="bg-white rounded-xl border border-border p-6 flex flex-col min-h-[400px]">
            <h3 className="font-bold text-base flex items-center gap-2 mb-6 tracking-tight">
              <DatabaseIcon size={18} className="text-accent" />
              Quick Ticket Issuance
            </h3>

            {bookingTrain ? (
              <div className="space-y-6 flex-1 flex flex-col">
                <div className="bg-slate-50 border border-dashed border-border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-text-muted">Train</span>
                    <span className="font-medium">{bookingTrain.TrainName}</span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-text-muted">Availability</span>
                    <span className="font-medium text-emerald-600">{bookingTrain.AvailableSeats} Seats</span>
                  </div>
                  <div className="pt-3 border-t border-border flex justify-between items-center">
                    <span className="text-text-muted text-[13px]">Avg Fare</span>
                    <span className="text-lg font-bold font-mono text-accent tracking-tighter">₹1,250.00</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Generated PNR Reference</p>
                  <div className="bg-sidebar rounded-lg p-3 text-center font-mono text-white text-lg tracking-[2px]">
                    {Math.floor(1000000000 + Math.random() * 9000000000)}
                  </div>
                </div>

                <button 
                  onClick={() => setBookingTrain(bookingTrain)} /* This would normally open the actual form */
                  className="w-full bg-accent text-white py-3 rounded-lg font-bold text-sm mt-auto shadow-lg shadow-accent/10 hover:opacity-90 transition-opacity"
                >
                  INITIALIZE BOOKING
                </button>
                <p className="text-[10px] text-text-muted text-center mt-3 leading-relaxed">
                  Taxes and surcharge included as per standard norms.
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-text-muted opacity-50 border border-border">
                  <Search size={24} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-text-main">No Train Selected</p>
                  <p className="text-xs text-text-muted leading-relaxed px-4 italic opacity-80">
                    Select a train from the schedule to begin the ticket issuance process.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {bookingTrain && (
        <BookingModal
          train={bookingTrain}
          onClose={() => setBookingTrain(null)}
          onSuccess={(res: any) => {
            setMessage({ type: "success", text: `Success! Seat #${res.seatNumber} booked.` });
            setBookingTrain(null);
            refreshTrains();
          }}
          onError={(err: string) => setMessage({ type: "error", text: err })}
        />
      )}
    </div>
  );
}

function BookingModal({ train, onClose, onSuccess, onError }: any) {
  const [formData, setFormData] = useState({ name: "", age: "", gender: "Male", phone: "", email: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, trainId: train.TrainID }),
      });
      const data = await res.json();
      if (data.success) {
        onSuccess(data);
      } else {
        onError(data.error);
      }
    } catch (err) {
      onError("Booking failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-sidebar/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-border"
      >
        <div className="bg-sidebar p-6 text-white text-center">
          <h2 className="text-xl font-bold tracking-tight">Passenger Admission</h2>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest italic">{train.TrainName} • ROUTE {train.Source}-{train.Destination}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Full Legal Name</label>
            <input
              required
              type="text"
              className="w-full rounded-lg border border-border bg-slate-50 px-4 py-2 text-sm outline-none focus:border-accent"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Age (Years)</label>
              <input
                required
                type="number"
                className="w-full rounded-lg border border-border bg-slate-50 px-4 py-2 text-sm outline-none focus:border-accent"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Gender Category</label>
              <select
                className="w-full rounded-lg border border-border bg-slate-50 px-4 py-2 text-sm outline-none focus:border-accent"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Mobile Number</label>
              <input
                required
                type="tel"
                className="w-full rounded-lg border border-border bg-slate-50 px-4 py-2 text-sm outline-none focus:border-accent"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Email Address</label>
              <input
                required
                type="email"
                className="w-full rounded-lg border border-border bg-slate-50 px-4 py-2 text-sm outline-none focus:border-accent"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border mt-4">
             <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-dashed border-border">
                <span className="text-xs font-bold text-text-muted uppercase">Total Ticket Fare</span>
                <span className="text-lg font-bold font-mono text-accent">₹{train.BaseFare.toFixed(2)}</span>
             </div>
          </div>

          <div className="flex gap-3 pt-6">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-border py-2.5 font-bold text-text-muted text-xs uppercase tracking-widest hover:bg-slate-50 transition-colors">Abort</button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-accent py-2.5 font-bold text-white text-xs uppercase tracking-widest shadow-lg shadow-accent/20 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSubmitting ? "Processing..." : "Issue Ticket"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function BookingsView({ passengerBookings, fetchUserBookings, loading, initialQuery }: any) {
  const [query, setQuery] = useState(initialQuery || "");

  useEffect(() => {
    if (initialQuery) {
      fetchUserBookings(initialQuery);
    }
  }, [initialQuery]);

  const handleFetch = () => {
    if (!query) return;
    fetchUserBookings(query);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-bold tracking-tight text-text-main">Access Reservation Logs</h2>
        <p className="text-text-muted text-sm italic font-medium opacity-80 uppercase tracking-tight">Retrieve confirmed tickets using PNR or Registered Mobile Number</p>
      </div>

      <div className="flex gap-3 bg-white p-5 rounded-2xl border border-border shadow-sm">
        <input
          type="text"
          placeholder="Enter PNR or Mobile Number"
          className="flex-1 rounded-lg border border-border bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-accent font-mono"
          value={query}
          onChange={(e) => setQuery(e.target.value.toUpperCase())}
        />
        <button
          onClick={handleFetch}
          disabled={loading}
          className="bg-accent text-white px-8 rounded-lg font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "SEARCHING..." : "FETCH LOGS"}
        </button>
      </div>

      <div className="space-y-4">
        {passengerBookings.map((b: Booking) => (
          <div key={b.BookingID} className="bg-white rounded-xl p-6 border border-border flex flex-col md:flex-row items-start md:items-center justify-between group hover:border-accent transition-all gap-6">
            <div className="flex items-center gap-5">
              <div className="bg-slate-50 p-4 rounded-lg text-accent border border-border group-hover:bg-accent group-hover:text-white transition-colors">
                <Ticket size={24} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-text-main text-lg">{b.TrainName}</p>
                  <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded border border-border text-text-muted">PNR: {b.PNR}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-bold uppercase tracking-tight text-text-muted">
                  <span className="flex items-center gap-1 italic"><ChevronRight size={10} className="text-accent" /> {b.Source} TO {b.Destination}</span>
                  <span className="flex items-center gap-1 opacity-60"><Clock size={12} /> {new Date(b.BookingDate).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1 text-accent font-mono">SEAT #{b.SeatNumber}</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-3 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-border">
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1 opacity-60">Payment Status</p>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-mono font-bold text-slate-900">₹{b.Amount?.toFixed(2) || "0.00"}</span>
                  <span className={`text-[9px] font-bold uppercase tracking-tighter ${b.PaymentStatus === 'Completed' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {b.PaymentStatus || "PENDING"}
                  </span>
                </div>
              </div>
              <div>
                <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-tight ${b.Status === 'Confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {b.Status}
                </span>
              </div>
            </div>
          </div>
        ))}
        {passengerBookings.length === 0 && !loading && query && (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-border">
            <p className="text-text-muted text-sm italic opacity-60">No data found for ID: {query}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminDashboard({ trains, refreshTrains }: any) {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-8">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Infrastructure Management</h2>
          <p className="text-text-muted text-sm font-semibold italic uppercase tracking-tight opacity-70">Real-time scheduling and capacity override protocols</p>
        </div>
        <div className="flex gap-3">
          <button onClick={refreshTrains} className="rounded-lg bg-white border border-border px-5 py-2 text-[11px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors">Sync Database</button>
          <button className="rounded-lg bg-accent px-5 py-2 text-[11px] font-bold uppercase tracking-widest text-white shadow-lg shadow-accent/20 hover:opacity-90 transition-opacity">+ Add Asset</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-border">
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text-muted">Identifier</th>
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text-muted">Designation</th>
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text-muted">Vector Path</th>
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text-muted">Utilization</th>
              <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-text-muted">Protocol</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {trains.map((t: TrainData) => (
              <tr key={t.TrainID} className="group hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-mono text-xs font-bold text-accent">#TR-{t.TrainID * 100 + 42}</td>
                <td className="px-6 py-4 font-bold text-text-main">{t.TrainName}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-text-muted italic">
                    {t.Source} <ChevronRight size={10} className="text-accent" /> {t.Destination}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="h-1.5 flex-1 max-w-[120px] rounded-full bg-slate-100 overflow-hidden border border-border">
                      <div className="h-full bg-accent" style={{ width: `${((t.TotalSeats - t.AvailableSeats) / t.TotalSeats) * 100}%` }}></div>
                    </div>
                    <span className="text-[10px] font-bold text-text-muted italic opacity-70 uppercase tracking-tighter">
                      {Math.round(((t.TotalSeats - t.AvailableSeats) / t.TotalSeats) * 100)}% Load
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-accent font-bold text-[11px] uppercase tracking-widest hover:underline underline-offset-4 decoration-2">Modify</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DocumentationView({ setMessage }: { setMessage: any }) {
  return (
    <div className="max-w-4xl mx-auto space-y-16 py-8">
      {/* Introduction */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-4xl font-extrabold tracking-tighter italic">Technical Specification</h2>
          <p className="text-text-muted font-bold text-sm italic uppercase tracking-widest opacity-60">Railway Reservation System - DBMS Mini Project</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-2xl border border-border shadow-sm space-y-4">
            <h3 className="font-bold text-lg flex items-center gap-2 italic uppercase tracking-tight">
              <Info size={20} className="text-accent" /> Project Objectives
            </h3>
            <div className="text-[13px] text-text-muted space-y-4 font-medium italic opacity-80 leading-relaxed">
              <p>1. Design a normalized (3NF) relational database for managing railway infrastructure and passenger operations.</p>
              <p>2. Implement advanced SQL features including Triggers, Views, and Indexes for optimized performance and automated data integrity.</p>
              <p>3. Simulate complex business logic like waiting lists, automatic seat allocation, and transactional booking systems.</p>
            </div>
          </div>
          <div className="bg-white p-8 rounded-2xl border border-border shadow-sm space-y-4">
            <h3 className="font-bold text-lg flex items-center gap-2 italic uppercase tracking-tight">
              <DatabaseIcon size={20} className="text-accent" /> DBMS Architecture
            </h3>
            <div className="space-y-4">
              <TechRow label="Storage Engine" value="SQLite (compatible with MySQL 8.0)" />
              <TechRow label="Normalization" value="3rd Normal Form (3NF)" />
              <TechRow label="Concurrency" value="Atomic Transactions (ACID)" />
              <TechRow label="UI Framework" value="React 18 + Tailwind CSS" />
            </div>
          </div>
        </div>
      </section>

      {/* Methodology Section */}
      <section className="space-y-8">
        <h3 className="text-xl font-bold tracking-tight italic uppercase tracking-widest opacity-80">Methodology & Entity Mapping</h3>
        <div className="bg-sidebar rounded-3xl p-10 text-white shadow-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <EntityCard icon={<User />} label="PASSENGERS" sub="Core Actor" detail="Stores identity and contact data." />
            <EntityCard icon={<Train />} label="INFRASTRUCTURE" sub="Asset" detail="Manages routes, capacity, and fares." />
            <EntityCard icon={<BookOpen />} label="TRANSACTIONS" sub="Relation" detail="Binds passengers to trains via PNR." />
            <EntityCard icon={<Lock />} label="SECURITY" sub="Admin" detail="Privileged access for system overrides." />
          </div>
        </div>
      </section>

      {/* Conclusion */}
      <section className="bg-slate-50 rounded-2xl border border-border p-8 text-center space-y-4">
        <h3 className="font-bold text-lg italic uppercase tracking-tight">Project Conclusion</h3>
        <p className="text-sm text-text-muted italic opacity-80 max-w-2xl mx-auto leading-relaxed">
          The Railway Reservation System successfully demonstrates the application of relational algebra and database management principles. 
          By utilizing triggers for seat management and views for abstracted data retrieval, we achieved a modular and scalable architecture 
          suitable for real-world simulation.
        </p>
      </section>
    </div>
  );
}

function TechRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center border-b border-border pb-2.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">{label}</span>
      <span className="text-xs font-bold font-mono text-accent">{value}</span>
    </div>
  );
}

function EntityCard({ icon, label, sub, detail }: any) {
  return (
    <div className="p-6 border border-white/10 rounded-2xl bg-white/5 transition-all hover:bg-white/10 hover:-translate-y-1 space-y-3">
      <div className="text-accent opacity-80">{icon}</div>
      <div className="space-y-1">
        <p className="font-bold text-[11px] tracking-[2px] text-white opacity-90">{label}</p>
        <p className="text-[9px] font-bold text-accent italic opacity-60 tracking-tight uppercase">{sub}</p>
      </div>
      <p className="text-[10px] text-slate-400 italic font-medium leading-relaxed">{detail}</p>
    </div>
  );
}
