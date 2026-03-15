import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useAttendance } from '../hooks/useAttendance';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { useMembers } from '../hooks/useMembers';
import { today, daysBetween, formatDate } from '../utils/helpers';
import { IconCamera, IconStop, IconCheckCircle, IconWarning, IconX, IconQrCode } from './Icons';

const SCANNER_ID = 'qr-floating-reader';

export default function QRScanner() {
  const { markAttendance, checkDuplicateAttendance, fetchTodayAttendance } = useAttendance();
  const { getLatestSubscription } = useSubscriptions();
  const { searchMembers } = useMembers();

  const scannerRef = useRef(null);
  const cooldownRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [minimized, setMinimized] = useState(false);

  const todayStr = today();

  const handleScan = useCallback(async (memberId) => {
    const cleaned = memberId.trim();
    if (!cleaned) return;
    try {
      const results = await searchMembers(cleaned);
      const member = results.find((m) => m.member_id === cleaned);
      if (!member) {
        setLastResult({ type: 'error', text: `Not found: ${cleaned}` });
        return;
      }

      const isDup = await checkDuplicateAttendance(member.member_id, todayStr);
      if (isDup) {
        setLastResult({ type: 'warning', text: `${member.name} already marked today` });
        return;
      }

      const latest = await getLatestSubscription(member.member_id);
      const isOverdue = !latest || latest.end_date < todayStr;

      await markAttendance(member.member_id, 'barcode', isOverdue);
      fetchTodayAttendance();

      if (isOverdue && latest) {
        const pending = daysBetween(latest.end_date, todayStr);
        setLastResult({ type: 'warning', text: `${member.name} ✓ (expired ${formatDate(latest.end_date)}, ${pending}d overdue)` });
      } else {
        setLastResult({ type: 'success', text: `${member.name} ✓ marked` });
      }
    } catch (err) {
      setLastResult({ type: 'error', text: err.message });
    }
  }, [searchMembers, checkDuplicateAttendance, getLatestSubscription, markAttendance, fetchTodayAttendance, todayStr]);

  // Start/stop camera
  useEffect(() => {
    if (!scanning || !open) {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {}).finally(() => {
          try { scannerRef.current?.clear(); } catch {}
          scannerRef.current = null;
        });
      }
      return;
    }

    setError(null);
    // Small delay so the DOM element is rendered
    const timer = setTimeout(() => {
      const el = document.getElementById(SCANNER_ID);
      if (!el) return;

      const html5QrCode = new Html5Qrcode(SCANNER_ID);
      scannerRef.current = html5QrCode;

      html5QrCode
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 200, height: 200 }, aspectRatio: 1.0 },
          (decodedText) => {
            if (cooldownRef.current) return;
            cooldownRef.current = true;
            setTimeout(() => { cooldownRef.current = false; }, 2500);
            handleScan(decodedText);
          },
          () => {}
        )
        .catch((err) => {
          console.error('QR Scanner error:', err);
          setError(
            err?.toString?.().includes('NotAllowedError')
              ? 'Camera permission denied.'
              : err?.toString?.().includes('NotFoundError')
                ? 'No camera found.'
                : 'Failed to start camera.'
          );
          setScanning(false);
        });
    }, 100);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        try { scannerRef.current.clear(); } catch {}
        scannerRef.current = null;
      }
    };
  }, [scanning, open, handleScan]);

  // Floating toggle button (when closed)
  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setScanning(true); }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-lg shadow-indigo-500/25 flex items-center justify-center transition-all hover:scale-105"
        title="Open QR Camera Scanner"
      >
        <IconQrCode className="w-6 h-6" />
      </button>
    );
  }

  // Minimized pill
  if (minimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
        {lastResult && (
          <div className={`rounded-full px-3 py-1.5 text-[11px] font-medium border shadow-lg animate-fade-in ${
            lastResult.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              : lastResult.type === 'warning' ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-red-500/20 border-red-500/40 text-red-300'
          }`}>
            {lastResult.text}
          </div>
        )}
        <button
          onClick={() => setMinimized(false)}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 ${
            scanning
              ? 'bg-indigo-600 text-white shadow-indigo-500/25 pulse-scanner'
              : 'bg-[#1e2130] border border-[#2d3148] text-slate-300'
          }`}
          title="Expand QR Scanner"
        >
          <IconCamera className="w-6 h-6" />
        </button>
      </div>
    );
  }

  // Full floating panel
  return (
    <div className="fixed bottom-6 right-6 z-50 w-72 bg-[#1a1d27] border border-[#2d3148] rounded-2xl shadow-2xl shadow-black/40 overflow-hidden animate-slide-in">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-[#2d3148] flex items-center justify-between bg-[#151826]">
        <h3 className="text-xs font-semibold text-slate-100 inline-flex items-center gap-1.5">
          <IconCamera className="w-3.5 h-3.5 text-indigo-400" />
          QR Scanner
          {scanning && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMinimized(true)}
            className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-[#262a3a] text-xs"
            title="Minimize"
          >
            ─
          </button>
          <button
            onClick={() => { setOpen(false); setScanning(false); }}
            className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-[#262a3a]"
            title="Close"
          >
            <IconX className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Camera feed */}
      <div className="p-3">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 mb-2 text-[11px] text-red-300 flex items-start gap-1.5">
            <IconWarning className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {scanning ? (
          <div className="relative">
            <div id={SCANNER_ID} className="rounded-lg overflow-hidden [&_video]:rounded-lg [&_video]:w-full" />
            <div className="mt-2 flex items-center justify-between">
              <p className="text-[10px] text-slate-500 animate-pulse">Scanning continuously...</p>
              <button
                onClick={() => setScanning(false)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25"
              >
                <IconStop className="w-3 h-3" /> Pause
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <IconCamera className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <button
              onClick={() => setScanning(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-500"
            >
              <IconCamera className="w-3.5 h-3.5" /> Start Camera
            </button>
          </div>
        )}

        {/* Last scan result */}
        {lastResult && (
          <div className={`mt-2 rounded-lg border p-2 flex items-start gap-1.5 text-[11px] ${
            lastResult.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : lastResult.type === 'warning' ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}>
            {lastResult.type === 'error' ? <IconWarning className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <IconCheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
            <span>{lastResult.text}</span>
          </div>
        )}
      </div>
    </div>
  );
}
