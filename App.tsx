
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Package, 
  User, 
  MapPin, 
  ClipboardList, 
  Info, 
  Loader2, 
  Search, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  AlertCircle, 
  ExternalLink, 
  Check, 
  ListChecks, 
  Copy, 
  LogOut, 
  Lock, 
  UserCircle, 
  Camera, 
  ImagePlus, 
  XCircle, 
  UserPlus,
  LogIn,
  Eye,
  EyeOff,
  ChevronRight,
  Filter
} from 'lucide-react';
import { Assignment, Station } from './types';
import { STATIONS } from './data';
import { getLogisticsInsights } from './services/geminiService';
import { fetchSpreadsheetData } from './services/spreadsheetService';
import { QRCodeSVG } from 'qrcode.react';

// URL Logo SPX Express
const DEFAULT_SPX_LOGO = "https://spx.co.id/static/media/logo.201d4a04.svg";

// Helper for Avatar Colors
const getAvatarColor = (name: string) => {
  const colors = [
    'bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 
    'bg-amber-600', 'bg-rose-600', 'bg-indigo-600', 'bg-cyan-600'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const getInitials = (name: string) => {
  const cleanName = name.trim();
  // Using the second letter as requested ("huruf kedua")
  if (cleanName.length >= 2) {
    return cleanName.charAt(1).toUpperCase();
  }
  return cleanName.charAt(0).toUpperCase();
};

// Interface for grouped data
interface GroupedAssignment {
  courierName: string;
  totalPackages: number;
  station: Station;
  tasks: Assignment[];
  status: 'Pending' | 'Ongoing' | 'Completed';
  lastUpdated: string;
}

const StatCard: React.FC<{ title: string, value: string | number, icon: any, colorClass: string }> = ({ title, value, icon: Icon, colorClass }) => (
  <div className="bg-white p-3 md:p-4 rounded-xl shadow-md border border-gray-100 flex items-center gap-2 md:gap-4 relative z-10 hover:translate-y-[-2px] transition-transform">
    <div className={`p-2 md:p-3 rounded-lg ${colorClass} shrink-0 shadow-sm`}>
      <Icon size={18} className="text-white md:w-5 md:h-5" />
    </div>
    <div className="min-w-0">
      <p className="text-[8px] md:text-[10px] text-gray-500 font-bold uppercase tracking-wider truncate">{title}</p>
      <p className="text-base md:text-xl font-black text-gray-800 leading-tight">{value}</p>
    </div>
  </div>
);

const AssignmentCard: React.FC<{ group: GroupedAssignment, onClick: () => void }> = ({ group, onClick }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-700';
      case 'Ongoing': return 'bg-blue-100 text-blue-700';
      default: return 'bg-amber-100 text-amber-700';
    }
  };

  const avatarBg = getAvatarColor(group.courierName);

  return (
    <div 
      onClick={onClick}
      className="group bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-orange-200 transition-all cursor-pointer relative overflow-hidden"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-12 h-12 rounded-full ${avatarBg} flex items-center justify-center text-white font-black text-xl shadow-md ring-4 ring-gray-50 shrink-0`}>
             {getInitials(group.courierName)}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 leading-tight text-sm md:text-base truncate">{group.courierName}</h3>
            <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5 font-medium">
              <Clock size={10} /> {group.lastUpdated}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter ${getStatusColor(group.status)}`}>
            {group.status === 'Completed' ? 'Selesai' : group.status}
          </span>
          <span className="text-[9px] font-medium text-gray-400">{group.tasks.length} Task</span>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black text-gray-800 tracking-tighter">{group.totalPackages}</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase">Paket</span>
        </div>
        <div className="flex items-center gap-1 text-[#EE4D2D] font-bold text-xs group-hover:gap-2 transition-all">
          Detail <ArrowRight size={14} />
        </div>
      </div>
      
      <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity rotate-12">
        <Package size={80} />
      </div>
    </div>
  );
};

const Modal: React.FC<{ 
  group: GroupedAssignment, 
  onClose: () => void, 
  onCompleteAll: () => void,
  onUploadPhoto: (taskId: string, photoUrl: string) => void 
}> = ({ group, onClose, onCompleteAll, onUploadPhoto }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTaskForPhoto, setActiveTaskForPhoto] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Ongoing' | 'Completed'>('All');

  const handleComplete = async () => {
    setIsUpdating(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    onCompleteAll();
    setIsUpdating(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeTaskForPhoto) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUploadPhoto(activeTaskForPhoto, reader.result as string);
        setActiveTaskForPhoto(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileUpload = (taskId: string) => {
    setActiveTaskForPhoto(taskId);
    fileInputRef.current?.click();
  };

  const filteredTasks = useMemo(() => {
    if (statusFilter === 'All') return group.tasks;
    return group.tasks.filter(t => t.status === statusFilter);
  }, [group.tasks, statusFilter]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md transition-opacity">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />
      <div className="bg-white rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl transform transition-all animate-in fade-in zoom-in duration-300">
        <div className="bg-[#EE4D2D] p-6 text-white relative">
          <button onClick={onClose} className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 p-1.5 rounded-full transition-colors z-20">
            <XCircle size={22} />
          </button>
          
          <div className="flex flex-col items-center relative z-10">
             <div className={`w-16 h-16 rounded-full ${getAvatarColor(group.courierName)} flex items-center justify-center text-white font-black text-2xl mb-3 shadow-xl ring-4 ring-white/20`}>
                {getInitials(group.courierName)}
             </div>
             <h2 className="text-2xl font-black text-center leading-tight tracking-tight">{group.courierName}</h2>
             <div className="flex items-center gap-2 mt-1.5">
               <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-white/20 px-2 py-0.5 rounded-md">{group.station} Station</span>
             </div>
          </div>
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
          </div>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto bg-gray-50/50">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white p-4 rounded-2xl border border-orange-100 shadow-sm text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Paket</p>
              <p className="text-2xl font-black text-[#EE4D2D]">{group.totalPackages}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Tugas</p>
              <p className="text-2xl font-black text-blue-600">{group.tasks.length}</p>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Filter size={12} /> Filter Status
            </h4>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {['All', 'Pending', 'Ongoing', 'Completed'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status as any)}
                  className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border whitespace-nowrap shadow-sm ${
                    statusFilter === status
                      ? 'bg-[#EE4D2D] text-white border-[#EE4D2D]'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-orange-200'
                  }`}
                >
                  {status === 'All' ? 'Semua' : status === 'Completed' ? 'Selesai' : status}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => (
                <div key={task.id} className="flex flex-col items-stretch p-4 bg-white rounded-2xl border border-gray-100 gap-3 shadow-sm hover:border-orange-200 transition-all">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="p-1.5 bg-white rounded-xl border border-gray-100 shadow-inner">
                        <QRCodeSVG value={task.taskId} size={44} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">ID Tugas</p>
                        <p className="font-mono text-sm font-bold text-gray-800">{task.taskId}</p>
                        <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase mt-1 inline-block ${
                          task.status === 'Completed' ? 'bg-green-100 text-green-700' : 
                          task.status === 'Ongoing' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-200 text-gray-500'
                        }`}>
                          {task.status === 'Completed' ? 'Selesai' : task.status}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => copyToClipboard(task.taskId)}
                      className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 bg-gray-50 border border-gray-100"
                    >
                      {copiedId === task.taskId ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                    </button>
                  </div>
                  
                  <div className="h-[1px] w-full bg-gray-100"></div>

                  <button 
                    onClick={() => triggerFileUpload(task.id)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl font-black text-[10px] transition-all border ${
                      task.photoUrl 
                      ? 'bg-green-50 text-green-700 border-green-200' 
                      : 'bg-orange-50 text-[#EE4D2D] border-orange-200 hover:bg-orange-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {task.photoUrl ? (
                        <div className="relative">
                          <img src={task.photoUrl} alt="Bukti" className="w-10 h-10 rounded-lg object-cover border-2 border-white shadow-md" />
                          <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-0.5 shadow-sm">
                            <Check size={10} />
                          </div>
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
                          <ImagePlus size={20} />
                        </div>
                      )}
                      <span className="uppercase tracking-widest">
                        {task.photoUrl ? 'Foto Terunggah (Ubah)' : 'Ambil Bukti Foto'}
                      </span>
                    </div>
                    {task.photoUrl ? <CheckCircle2 size={16} className="text-green-500" /> : <ChevronRight size={16} className="opacity-40" />}
                  </button>
                </div>
              ))
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center opacity-30">
                <ClipboardList size={48} className="mb-3" />
                <p className="text-xs font-black uppercase tracking-widest">Tidak ada tugas ditemukan</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 bg-white flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 px-4 rounded-2xl font-black text-gray-500 border border-gray-200 hover:bg-gray-50 text-xs uppercase tracking-widest transition-colors"
          >
            Tutup
          </button>
          <button 
            onClick={handleComplete}
            disabled={isUpdating || group.status === 'Completed'}
            className="flex-[2] py-4 px-4 rounded-2xl font-black text-white bg-[#EE4D2D] hover:bg-[#d73d1d] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-xl shadow-orange-100 text-xs uppercase tracking-[0.1em]"
          >
            {isUpdating ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
            {group.status === 'Completed' ? 'Selesai' : 'Konfirmasi Selesai'}
          </button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStation, setSelectedStation] = useState<Station | 'All'>('All');
  const [selectedGroup, setSelectedGroup] = useState<GroupedAssignment | null>(null);
  const [insights, setInsights] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Login form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const allData: Assignment[] = [];
      
      for (const station of STATIONS) {
        try {
          const stationData = await fetchSpreadsheetData(station);
          allData.push(...stationData);
        } catch (e) {
          console.error(`Error loading station ${station}:`, e);
        }
      }
      
      setAssignments(allData);
      
      if (allData.length > 0) {
        const insightText = await getLogisticsInsights(allData);
        setInsights(insightText);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const groupedAssignments = useMemo(() => {
    const filtered = selectedStation === 'All' 
      ? assignments 
      : assignments.filter(a => a.station === selectedStation);
    
    const searched = filtered.filter(a => 
      a.courierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.taskId.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groups: Record<string, GroupedAssignment> = {};
    
    searched.forEach(a => {
      const key = `${a.courierName}-${a.station}`;
      if (!groups[key]) {
        // Fix: Explicitly cast 'Ongoing' to ensure it's treated as a literal for the GroupedAssignment union type.
        groups[key] = {
          courierName: a.courierName,
          station: a.station,
          totalPackages: 0,
          tasks: [],
          status: 'Ongoing' as 'Ongoing',
          lastUpdated: a.lastUpdated
        };
      }
      groups[key].totalPackages += a.packageCount;
      groups[key].tasks.push(a);
    });

    // Fix: Explicitly return GroupedAssignment type to prevent status widening to string.
    return Object.values(groups).map((g): GroupedAssignment => ({
      ...g,
      status: (g.tasks.every(t => t.status === 'Completed') ? 'Completed' : 
              g.tasks.every(t => t.status === 'Pending') ? 'Pending' : 'Ongoing') as 'Pending' | 'Ongoing' | 'Completed'
    }));
  }, [assignments, selectedStation, searchQuery]);

  const stats = useMemo(() => {
    return {
      totalPackages: assignments.reduce((sum, a) => sum + a.packageCount, 0),
      totalCouriers: new Set(assignments.map(a => a.courierName)).size,
      completedTasks: assignments.filter(a => a.status === 'Completed').length,
      pendingTasks: assignments.filter(a => a.status !== 'Completed').length,
    };
  }, [assignments]);

  const handleCompleteAll = () => {
    if (!selectedGroup) return;
    
    setAssignments(prev => prev.map(a => {
      if (a.courierName === selectedGroup.courierName && a.station === selectedGroup.station) {
        return { 
          ...a, 
          status: 'Completed', 
          lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        };
      }
      return a;
    }));
    setSelectedGroup(null);
  };

  const handleUploadPhoto = (taskId: string, photoUrl: string) => {
    setAssignments(prev => prev.map(a => 
      a.id === taskId ? { ...a, photoUrl } : a
    ));
    if (selectedGroup) {
      const updatedTasks = selectedGroup.tasks.map(t => t.id === taskId ? { ...t, photoUrl } : t);
      // Fix: Cast explicitly to GroupedAssignment to avoid type widening during state update.
      setSelectedGroup({ ...selectedGroup, tasks: updatedTasks } as GroupedAssignment);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsername("");
    setPassword("");
    setLoginError(false);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && password.trim()) {
      setIsLoggingIn(true);
      setLoginError(false);
      // Simulate verification delay
      setTimeout(() => {
        setIsAuthenticated(true);
        setIsLoggingIn(false);
      }, 1000);
    } else {
      setLoginError(true);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Animated Background Decor */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-200/40 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-orange-300/30 rounded-full blur-[100px]"></div>

        <div className="max-w-md w-full bg-white rounded-[48px] shadow-2xl p-10 flex flex-col items-center animate-in fade-in zoom-in duration-700 relative z-10 border border-orange-100">
           {/* LOGIN LOGO: ORANGE BACKGROUND WITH WHITE TEXT SPX Express */}
           <div className="bg-[#EE4D2D] px-8 py-5 rounded-[32px] shadow-2xl mb-8 border border-white/10 ring-8 ring-orange-100/50 flex items-center justify-center">
             <div className="flex items-center gap-1.5 select-none">
                <span className="text-white font-[900] text-3xl md:text-4xl italic tracking-tighter leading-none">SPX</span>
                <span className="text-white font-light text-3xl md:text-4xl tracking-tighter leading-none">Express</span>
             </div>
           </div>
           
           <h1 className="text-3xl font-black text-gray-800 tracking-tighter text-center">SPX Logistics Hub</h1>
           <p className="text-gray-400 text-xs font-bold mt-2 mb-10 text-center uppercase tracking-[0.3em]">Control Center Dashboard</p>
           
           <form onSubmit={handleLogin} className="w-full space-y-6">
              <div className={`group bg-gray-50 p-5 rounded-3xl border ${loginError && !username ? 'border-red-300' : 'border-gray-100'} focus-within:border-[#EE4D2D] focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-50 transition-all flex items-center gap-4`}>
                <UserCircle className="text-gray-300 group-focus-within:text-[#EE4D2D]" size={26} />
                <div className="flex-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">User ID</p>
                  <input 
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Courier or Hub ID"
                    className="w-full bg-transparent text-sm font-black text-gray-800 outline-none placeholder:text-gray-300 placeholder:font-medium"
                    required
                  />
                </div>
              </div>

              <div className={`group bg-gray-50 p-5 rounded-3xl border ${loginError && !password ? 'border-red-300' : 'border-gray-100'} focus-within:border-[#EE4D2D] focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-50 transition-all flex items-center gap-4 relative`}>
                <Lock className="text-gray-300 group-focus-within:text-[#EE4D2D]" size={26} />
                <div className="flex-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Password</p>
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-transparent text-sm font-black text-gray-800 outline-none placeholder:text-gray-300 tracking-widest"
                    required
                  />
                </div>
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-300 hover:text-[#EE4D2D] transition-colors"
                >
                  {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>

              {loginError && (
                <p className="text-[10px] font-black text-red-500 text-center uppercase tracking-widest animate-shake">
                  Invalid credentials. Please check again.
                </p>
              )}

              <button 
                type="submit"
                disabled={isLoggingIn}
                className="w-full mt-4 bg-[#EE4D2D] text-white py-6 rounded-[28px] font-black text-lg hover:bg-[#d73d1d] transition-all shadow-2xl shadow-orange-200 flex items-center justify-center gap-4 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed group"
              >
                {isLoggingIn ? <Loader2 className="animate-spin" size={26} /> : <LogIn className="group-hover:translate-x-1 transition-transform" size={26} />}
                {isLoggingIn ? 'Verifying...' : 'Access Dashboard'}
              </button>
           </form>
           
           <p className="mt-12 text-[10px] font-black text-gray-300 uppercase tracking-[0.4em]">SPX EXPRESS INDONESIA</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-12 rounded-[56px] shadow-2xl flex flex-col items-center ring-1 ring-orange-100">
          <Loader2 className="animate-spin text-[#EE4D2D] mb-8" size={72} />
          <h2 className="text-2xl font-black text-gray-800 tracking-tighter">System Initializing</h2>
          <p className="text-xs text-gray-400 mt-3 font-bold uppercase tracking-[0.2em]">Synchronizing Delivery Hub Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 z-50 bg-gray-50/90 backdrop-blur-xl border-b border-gray-100">
        <header className="bg-[#EE4D2D] text-white pt-5 pb-14 px-8 rounded-b-[48px] shadow-2xl overflow-hidden relative">
          <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '30px 30px' }}></div>
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-[100px]"></div>
          
          <div className="relative z-10 flex flex-row items-center justify-between gap-4 max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              <div className="bg-black px-4 py-2 rounded-2xl shadow-2xl shrink-0 group hover:scale-105 transition-transform flex items-center justify-center border border-white/20">
                 <div className="flex items-center gap-1.5 select-none">
                    <span className="text-white font-[900] text-xl md:text-2xl italic tracking-tighter leading-none">SPX</span>
                    <span className="text-white font-light text-xl md:text-2xl tracking-tighter leading-none">Express</span>
                 </div>
              </div>
              <div className="hidden md:block">
                <h1 className="text-2xl font-black tracking-tighter leading-none italic uppercase">Hub Control</h1>
                <p className="text-[9px] font-bold opacity-80 uppercase tracking-[0.2em] flex items-center gap-2 mt-2">
                  <MapPin size={12} className="text-white" /> Tompobulu Monitoring
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 md:gap-5">
              <button 
                onClick={fetchData}
                disabled={refreshing}
                className={`p-3 md:p-4 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md transition-all border border-white/20 shadow-lg ${refreshing ? 'animate-spin' : ''}`}
                title="Refresh Operasional"
              >
                <RefreshCw size={20} />
              </button>
              
              <div className="h-10 w-[1px] bg-white/20 hidden sm:block"></div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 bg-black/15 p-1.5 pl-4 rounded-[20px] backdrop-blur-md hidden sm:flex border border-white/10">
                  <span className="text-[10px] font-black uppercase tracking-widest truncate max-w-[100px]">{username || 'Admin'}</span>
                  <div className="w-10 h-10 rounded-xl bg-white text-[#EE4D2D] flex items-center justify-center text-sm font-black shadow-lg">
                    {getInitials(username || 'A')}
                  </div>
                </div>
                
                <button 
                  onClick={handleLogout}
                  className="p-3 md:p-4 rounded-2xl bg-white/10 hover:bg-white/30 backdrop-blur-md transition-all flex items-center gap-3 border border-white/20 group shadow-lg"
                  title="Logout"
                >
                  <LogOut size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-8 -mt-10 pb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <StatCard title="Paket Terdata" value={stats.totalPackages} icon={Package} colorClass="bg-orange-600" />
            <StatCard title="Total Kurir" value={stats.totalCouriers} icon={User} colorClass="bg-blue-600" />
            <StatCard title="Task Selesai" value={stats.completedTasks} icon={CheckCircle2} colorClass="bg-emerald-600" />
            <StatCard title="Dalam Proses" value={stats.pendingTasks} icon={Clock} colorClass="bg-gray-500" />
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-8 mt-8 space-y-8 relative z-10">
        {insights && (
          <div className="bg-white p-3 md:p-4 rounded-3xl border border-orange-100 shadow-xl flex flex-col md:flex-row items-center gap-4 animate-in slide-in-from-bottom duration-700 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-[0.02] pointer-events-none">
               <Info size={80} />
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
               <AlertCircle size={20} className="text-[#EE4D2D]" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-1.5 mb-1">
                {/* AI INTELLIGENCE UNIT LABEL */}
                <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em]">AI Intelligence Unit</span>
                <div className="h-[1px] w-4 bg-orange-200"></div>
              </div>
              {/* KETERANGAN AI - MINIMIZED AS REQUESTED */}
              <p className="text-gray-600 font-medium text-[9px] leading-tight italic tracking-tight">"{insights}"</p>
            </div>
            <div className="shrink-0 flex flex-col items-center md:items-end">
               <span className="text-[7px] font-black text-gray-300 uppercase tracking-widest mb-0.5">Engine</span>
               <div className="px-1.5 py-0.5 bg-gray-50 rounded-md border border-gray-100 text-[8px] font-bold text-gray-400">GEMINI-3 PRO</div>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6 items-center">
          <div className="relative w-full lg:w-[450px] group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#EE4D2D] transition-colors" size={22} />
            <input 
              type="text" 
              placeholder="Search courier name or task ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-6 py-5 rounded-[24px] border border-gray-200 focus:outline-none focus:ring-4 focus:ring-orange-50 focus:border-[#EE4D2D] transition-all shadow-md bg-white text-sm font-bold placeholder:text-gray-300 placeholder:font-medium"
            />
          </div>
          
          <div className="flex gap-3 overflow-x-auto w-full pb-2 lg:pb-0 no-scrollbar">
            <button 
              onClick={() => setSelectedStation('All')}
              className={`px-8 py-5 rounded-[24px] font-black text-xs transition-all shrink-0 whitespace-nowrap uppercase tracking-[0.2em] shadow-md border ${
                selectedStation === 'All' 
                  ? 'bg-gray-900 text-white border-gray-900 shadow-gray-200' 
                  : 'bg-white text-gray-400 border-gray-100 hover:border-orange-200'
              }`}
            >
              All Hubs
            </button>
            {STATIONS.map(station => (
              <button 
                key={station}
                onClick={() => setSelectedStation(station)}
                className={`px-8 py-5 rounded-[24px] font-black text-xs transition-all shrink-0 whitespace-nowrap uppercase tracking-[0.2em] shadow-md border ${
                  selectedStation === station 
                    ? 'bg-[#EE4D2D] text-white border-[#EE4D2D] shadow-orange-100' 
                    : 'bg-white text-gray-400 border-gray-100 hover:border-orange-200'
                }`}
              >
                {station}
              </button>
            ))}
          </div>
        </div>

        {groupedAssignments.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-16">
            {groupedAssignments.map((group, idx) => (
              <AssignmentCard 
                key={`${group.courierName}-${group.station}-${idx}`} 
                group={group} 
                onClick={() => setSelectedGroup(group)} 
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-[56px] p-20 flex flex-col items-center text-center border-4 border-dashed border-gray-100 animate-in fade-in duration-500">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-8 shadow-inner">
              <ClipboardList size={48} className="text-gray-200" />
            </div>
            <h3 className="text-2xl font-black text-gray-800">No Assignments Found</h3>
            <p className="text-gray-400 mt-3 max-w-sm font-bold uppercase tracking-widest text-[10px]">Adjust your hub filters or search query to find active operational data.</p>
            <button 
              onClick={() => {setSelectedStation('All'); setSearchQuery("");}}
              className="mt-10 bg-gray-900 text-white px-10 py-4 rounded-[20px] font-black text-xs uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl active:scale-95"
            >
              Reset Filters
            </button>
          </div>
        )}
      </main>

      {selectedGroup && (
        <Modal 
          group={selectedGroup} 
          onClose={() => setSelectedGroup(null)} 
          onCompleteAll={handleCompleteAll}
          onUploadPhoto={handleUploadPhoto}
        />
      )}
      
      <footer className="max-w-7xl mx-auto px-8 mt-10 text-center">
        <div className="flex items-center justify-center gap-6 mb-8 opacity-20">
           <div className="h-[1px] flex-1 bg-gray-900"></div>
           <div className="flex items-center gap-1 grayscale scale-75 opacity-50">
             <span className="font-black italic text-lg tracking-tighter">SPX</span>
             <span className="font-light text-lg tracking-tighter">Express</span>
           </div>
           <div className="h-[1px] flex-1 bg-gray-900"></div>
        </div>
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.5em]">SPX EXPRESS INDONESIA • LOGISTICS OPERATION TECHNOLOGY • 2026</p>
      </footer>
    </div>
  );
};

export default App;
