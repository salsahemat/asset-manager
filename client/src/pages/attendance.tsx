import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  Bell,
  Building2,
  Home,
  FileX,
  Stethoscope,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  Camera,
  RefreshCw,
  ImageIcon,
} from "lucide-react";

interface AttendancePageProps {
  workspaceId: string;
  userRole?: string;
}

type AttendanceStatus = "present" | "wfh" | "permission" | "sick";

const STATUS_CONFIG: Record<
  AttendanceStatus,
  { label: string; color: string; bg: string; icon: typeof Building2 }
> = {
  present: {
    label: "Hadir",
    color: "text-green-600",
    bg: "bg-green-100",
    icon: Building2,
  },
  wfh: { label: "WFH", color: "text-blue-600", bg: "bg-blue-100", icon: Home },
  permission: {
    label: "Izin",
    color: "text-yellow-600",
    bg: "bg-yellow-100",
    icon: FileX,
  },
  sick: {
    label: "Sakit",
    color: "text-red-600",
    bg: "bg-red-100",
    icon: Stethoscope,
  },
};

const ATTENDANCE_TIME_ZONE = "Asia/Jakarta";

function formatTime(iso: string | null) {
  if (!iso) return "--:--";
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(checkIn: string | null, checkOut: string | null) {
  if (!checkIn || !checkOut) return null;
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return `${hours}j ${minutes}m`;
}

function formatLocalDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ATTENDANCE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) return "";
  return `${year}-${month}-${day}`;
}

function normalizeAttendanceDate(value: string | Date | null | undefined) {
  if (!value) return "";
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return formatLocalDateKey(parsed);
}

// ── Camera Modal ──────────────────────────────────────────────
interface CameraModalProps {
  open: boolean;
  onClose: () => void;
  onCapture: (photoBase64: string) => void;
  title: string;
}

function CameraModal({ open, onClose, onCapture, title }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(
    async (facing: "user" | "environment" = "user") => {
      setCameraError(null);
      setIsLoading(true);
      stopCamera();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing,
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        setCameraError(
          err.name === "NotAllowedError"
            ? "Akses kamera ditolak. Izinkan akses kamera di pengaturan browser."
            : "Kamera tidak tersedia di perangkat ini.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [stopCamera],
  );

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        setCapturedPhoto(null);
        setCameraError(null);
        startCamera(facingMode);
      } else {
        stopCamera();
        setCapturedPhoto(null);
        onClose();
      }
    },
    [facingMode, startCamera, stopCamera, onClose],
  );

  // When open prop changes from outside
  const prevOpenRef = useRef(false);
  if (open !== prevOpenRef.current) {
    prevOpenRef.current = open;
    if (open) {
      setTimeout(() => {
        setCapturedPhoto(null);
        setCameraError(null);
        startCamera(facingMode);
      }, 150);
    } else {
      stopCamera();
    }
  }

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedPhoto(dataUrl);
    stopCamera();
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    startCamera(facingMode);
  };

  const handleConfirm = () => {
    if (capturedPhoto) {
      onCapture(capturedPhoto);
      stopCamera();
      setCapturedPhoto(null);
      onClose();
    }
  };

  const toggleCamera = () => {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    startCamera(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-4 h-4" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-5 space-y-3">
          {/* Camera / Preview area */}
          <div className="relative bg-black rounded-lg overflow-hidden aspect-[4/3]">
            {cameraError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3 p-4 text-center">
                <Camera className="w-10 h-10 opacity-50" />
                <p className="text-sm opacity-80">{cameraError}</p>
              </div>
            ) : capturedPhoto ? (
              <img
                src={capturedPhoto}
                alt="Attendance Photo"
                className="w-full h-full object-cover"
              />
            ) : (
              <>
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent" />
                  </div>
                )}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{
                    transform: facingMode === "user" ? "scaleX(-1)" : "none",
                  }}
                />
                <button
                  onClick={toggleCamera}
                  className="absolute top-2 right-2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition"
                  title="Ganti kamera"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                {/* Face guide */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-44 h-44 border-2 border-white/60 rounded-full" />
                </div>
              </>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <p className="text-xs text-muted-foreground text-center">
            {new Date().toLocaleString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>

          <div className="flex gap-2">
            {capturedPhoto ? (
              <>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleRetake}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Foto Ulang
                </Button>
                <Button className="flex-1" onClick={handleConfirm}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Gunakan Foto
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="flex-1" onClick={onClose}>
                  Batal
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleCapture}
                  disabled={!!cameraError || isLoading}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Ambil Foto
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function AttendancePage({
  workspaceId,
  userRole = "member",
}: AttendancePageProps) {
  const { toast } = useToast();
  const isAdmin = ["owner", "admin"].includes(userRole);

  const today = new Date();
  const [viewDate, setViewDate] = useState(today);
  const [checkInStatus, setCheckInStatus] =
    useState<AttendanceStatus>("present");
  const [checkInNote, setCheckInNote] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [showCheckInCamera, setShowCheckInCamera] = useState(false);
  const [showCheckOutCamera, setShowCheckOutCamera] = useState(false);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth() + 1;
  const todayStr = formatLocalDateKey(today);

  const { data: todayAttendance, isLoading: todayLoading } = useQuery<any>({
    queryKey: [`/api/workspaces/${workspaceId}/attendance/today`],
  });

  const { data: monthlyData = [] } = useQuery<any[]>({
    queryKey: [
      `/api/workspaces/${workspaceId}/attendance?year=${year}&month=${month}`,
    ],
  });

  const { data: members = [] } = useQuery<any[]>({
    queryKey: [`/api/workspaces/${workspaceId}/members`],
  });

  const uniqueMembers = members.filter(
    (member, index, list) =>
      list.findIndex((candidate) => candidate.userId === member.userId) === index,
  );

  const invalidateAttendance = () => {
    queryClient.invalidateQueries({
      queryKey: [`/api/workspaces/${workspaceId}/attendance/today`],
    });
    queryClient.invalidateQueries({
      queryKey: [
        `/api/workspaces/${workspaceId}/attendance?year=${year}&month=${month}`,
      ],
    });
  };

  const checkInMutation = useMutation({
    mutationFn: async (photo: string) =>
      apiRequest("POST", `/api/workspaces/${workspaceId}/attendance/check-in`, {
        status: checkInStatus,
        note: checkInNote || null,
        checkInPhoto: photo,
      }),
    onSuccess: () => {
      invalidateAttendance();
      setCheckInNote("");
      setShowNoteInput(false);
      toast({ title: "✅ Check-in berhasil!" });
    },
    onError: () => toast({ title: "Gagal check-in", variant: "destructive" }),
  });

  const checkOutMutation = useMutation({
    mutationFn: async (photo: string) =>
      apiRequest(
        "POST",
        `/api/workspaces/${workspaceId}/attendance/check-out`,
        {
          checkOutPhoto: photo,
        },
      ),
    onSuccess: () => {
      invalidateAttendance();
      toast({ title: "✅ Check-out berhasil!" });
    },
    onError: () => toast({ title: "Gagal check-out", variant: "destructive" }),
  });

  const remindMutation = useMutation({
    mutationFn: async () =>
      apiRequest(
        "POST",
        `/api/workspaces/${workspaceId}/attendance/remind`,
        {},
      ),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/notifications/unread-count"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: `Reminder terkirim ke ${data.reminded} anggota` });
    },
    onError: () =>
      toast({ title: "Gagal kirim reminder", variant: "destructive" }),
  });

  const prevMonth = () => setViewDate(new Date(year, month - 2, 1));
  const nextMonth = () => setViewDate(new Date(year, month, 1));

  const todayRecords = monthlyData.filter((a) => {
    return normalizeAttendanceDate(a.date) === todayStr;
  });

  const statusCount = (status: AttendanceStatus) =>
    todayRecords.filter((a) => a.status === status).length;

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();

  const getMonthlyUserSummary = (userId: string) => {
    const records = monthlyData.filter((a) => a.userId === userId);
    return {
      present: records.filter((a) => a.status === "present").length,
      wfh: records.filter((a) => a.status === "wfh").length,
      permission: records.filter((a) => a.status === "permission").length,
      sick: records.filter((a) => a.status === "sick").length,
      total: records.length,
    };
  };

  const hasTodayRecord = !!todayAttendance;
  const hasCheckedOut = !!todayAttendance?.checkOut;

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {today.toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => remindMutation.mutate()}
              disabled={remindMutation.isPending}
            >
              <Bell className="w-4 h-4 mr-2" />
              Kirim Reminder
            </Button>
          )}
        </div>

        {/* My Today Card */}
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
            Kehadiran Saya Hari Ini
          </h2>

          {todayLoading ? (
            <div className="h-20 flex items-center justify-center text-muted-foreground text-sm">
              Memuat...
            </div>
          ) : hasTodayRecord ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 flex-wrap">
                {(() => {
                  const conf =
                    STATUS_CONFIG[todayAttendance.status as AttendanceStatus];
                  const Icon = conf.icon;
                  return (
                    <div
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${conf.bg}`}
                    >
                      <Icon className={`w-4 h-4 ${conf.color}`} />
                      <span className={`text-sm font-medium ${conf.color}`}>
                        {conf.label}
                      </span>
                    </div>
                  );
                })()}
                <div className="flex items-center gap-4 text-sm flex-wrap">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <LogIn className="w-4 h-4" />
                    <span>
                      Check-in:{" "}
                      <span className="font-medium text-foreground">
                        {formatTime(todayAttendance.checkIn)}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <LogOut className="w-4 h-4" />
                    <span>
                      Check-out:{" "}
                      <span className="font-medium text-foreground">
                        {formatTime(todayAttendance.checkOut)}
                      </span>
                    </span>
                  </div>
                  {formatDuration(
                    todayAttendance.checkIn,
                    todayAttendance.checkOut,
                  ) && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span className="font-medium text-foreground">
                        {formatDuration(
                          todayAttendance.checkIn,
                          todayAttendance.checkOut,
                        )}
                      </span>
                    </div>
                  )}
                </div>
                {!hasCheckedOut && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowCheckOutCamera(true)}
                    disabled={checkOutMutation.isPending}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Check-out + Foto
                  </Button>
                )}
                {hasCheckedOut && (
                  <div className="flex items-center gap-1.5 text-green-600 text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    Selesai
                  </div>
                )}
              </div>

              {/* Foto check-in / check-out */}
              <div className="flex gap-4 flex-wrap">
                {todayAttendance.checkInPhoto && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" /> Foto Check-in
                    </p>
                    <img
                      src={todayAttendance.checkInPhoto}
                      alt="check-in"
                      className="w-28 h-28 object-cover rounded-lg border shadow-sm"
                    />
                  </div>
                )}
                {todayAttendance.checkOutPhoto && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" /> Foto Check-out
                    </p>
                    <img
                      src={todayAttendance.checkOutPhoto}
                      alt="check-out"
                      className="w-28 h-28 object-cover rounded-lg border shadow-sm"
                    />
                  </div>
                )}
              </div>

              {todayAttendance.note && (
                <p className="text-xs text-muted-foreground italic">
                  Catatan: {todayAttendance.note}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <Select
                  value={checkInStatus}
                  onValueChange={(v) => setCheckInStatus(v as AttendanceStatus)}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([key, conf]) => {
                      const Icon = conf.icon;
                      return (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <Icon className={`w-3.5 h-3.5 ${conf.color}`} />
                            {conf.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => setShowNoteInput(!showNoteInput)}
                >
                  + Tambah catatan
                </Button>
                <Button
                  onClick={() => setShowCheckInCamera(true)}
                  disabled={checkInMutation.isPending}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Check-in + Foto
                </Button>
              </div>
              {showNoteInput && (
                <Textarea
                  placeholder="Catatan (opsional)..."
                  value={checkInNote}
                  onChange={(e) => setCheckInNote(e.target.value)}
                  className="text-sm h-16 resize-none"
                />
              )}
            </div>
          )}
        </Card>

        {/* Admin: Today Summary */}
        {isAdmin && (
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
              Ringkasan Hari Ini
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="col-span-2 sm:col-span-1 flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                <Users className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-bold">
                    {todayRecords.length}/{uniqueMembers.length}
                  </p>
                </div>
              </div>
              {(
                Object.entries(STATUS_CONFIG) as [
                  AttendanceStatus,
                  (typeof STATUS_CONFIG)[AttendanceStatus],
                ][]
              ).map(([key, conf]) => {
                const Icon = conf.icon;
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-3 p-3 rounded-lg ${conf.bg}`}
                  >
                    <Icon className={`w-5 h-5 ${conf.color}`} />
                    <div>
                      <p className={`text-xs ${conf.color}`}>{conf.label}</p>
                      <p className={`text-lg font-bold ${conf.color}`}>
                        {statusCount(key)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {todayRecords.length > 0 && (
              <div className="mt-4 space-y-2">
                {todayRecords.map((record) => {
                  const conf = STATUS_CONFIG[record.status as AttendanceStatus];
                  const Icon = conf.icon;
                  return (
                    <div
                      key={record.id}
                      className="flex items-center gap-3 py-2 border-b last:border-0"
                    >
                      {record.checkInPhoto ? (
                        <img
                          src={record.checkInPhoto}
                          alt="foto"
                          className="w-8 h-8 rounded-full object-cover border"
                        />
                      ) : (
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={record.user?.profileImageUrl} />
                          <AvatarFallback className="text-[10px]">
                            {record.user?.firstName?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <span className="text-sm flex-1 font-medium">
                        {[record.user?.firstName, record.user?.lastName]
                          .filter(Boolean)
                          .join(" ") || "User"}
                      </span>
                      <div
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${conf.bg} ${conf.color}`}
                      >
                        <Icon className="w-3 h-3" />
                        {conf.label}
                      </div>
                      <span className="text-xs text-muted-foreground w-16 text-right">
                        {formatTime(record.checkIn)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            {todayRecords.length === 0 && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <XCircle className="w-4 h-4" />
                Belum ada yang absen hari ini
              </div>
            )}
          </Card>
        )}

        {/* Monthly Recap */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Rekap Bulanan
            </h2>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={prevMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium min-w-[120px] text-center">
                {viewDate.toLocaleDateString("id-ID", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <Button variant="ghost" size="icon" onClick={nextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {isAdmin ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground text-xs">
                      Anggota
                    </th>
                    {Object.entries(STATUS_CONFIG).map(([key, conf]) => (
                      <th
                        key={key}
                        className={`text-center py-2 px-3 font-medium text-xs ${conf.color}`}
                      >
                        {conf.label}
                      </th>
                    ))}
                    <th className="text-center py-2 px-3 font-medium text-xs text-muted-foreground">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {uniqueMembers.map((m: any) => {
                    const summary = getMonthlyUserSummary(m.userId);
                    return (
                      <tr key={m.userId} className="border-b last:border-0">
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={m.user?.profileImageUrl} />
                              <AvatarFallback className="text-[9px]">
                                {m.user?.firstName?.[0] || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-xs">
                              {[m.user?.firstName, m.user?.lastName]
                                .filter(Boolean)
                                .join(" ") || "User"}
                            </span>
                          </div>
                        </td>
                        <td className="text-center py-2.5 px-3">
                          <span className="text-green-600 font-medium">
                            {summary.present}
                          </span>
                        </td>
                        <td className="text-center py-2.5 px-3">
                          <span className="text-blue-600 font-medium">
                            {summary.wfh}
                          </span>
                        </td>
                        <td className="text-center py-2.5 px-3">
                          <span className="text-yellow-600 font-medium">
                            {summary.permission}
                          </span>
                        </td>
                        <td className="text-center py-2.5 px-3">
                          <span className="text-red-600 font-medium">
                            {summary.sick}
                          </span>
                        </td>
                        <td className="text-center py-2.5 px-3">
                          <Badge variant="secondary" className="text-[10px]">
                            {summary.total}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1 text-center">
              {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((d) => (
                <div
                  key={d}
                  className="text-[10px] font-medium text-muted-foreground py-1"
                >
                  {d}
                </div>
              ))}
              {Array.from({ length: firstDay }, (_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const record = monthlyData.find(
                  (a) => normalizeAttendanceDate(a.date) === dateStr,
                );
                const isToday = dateStr === todayStr;
                const conf = record
                  ? STATUS_CONFIG[record.status as AttendanceStatus]
                  : null;
                return (
                  <div
                    key={day}
                    title={conf ? conf.label : undefined}
                    className={`aspect-square flex items-center justify-center rounded-full text-xs font-medium
                      ${isToday ? "ring-2 ring-primary" : ""}
                      ${conf ? `${conf.bg} ${conf.color}` : "text-muted-foreground"}`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Camera Modals */}
      <CameraModal
        open={showCheckInCamera}
        onClose={() => setShowCheckInCamera(false)}
        onCapture={(photo) => checkInMutation.mutate(photo)}
        title="Foto Check-in"
      />
      <CameraModal
        open={showCheckOutCamera}
        onClose={() => setShowCheckOutCamera(false)}
        onCapture={(photo) => checkOutMutation.mutate(photo)}
        title="Foto Check-out"
      />
    </div>
  );
}
