import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

// ─── Canvas-based card renderer ───────────────────────────────────────────────
// Draws the membership card entirely on a <canvas> so we can export as PNG
// for both printing and WhatsApp sharing — no external libraries needed.

async function renderCardToCanvas(member, qrSvgEl) {
  const W = 900, H = 540; // ~CR80 card ratio (5:3)
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // ── Background gradient ────────────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0d0f1a');
  bg.addColorStop(0.5, '#131628');
  bg.addColorStop(1, '#1a1d35');
  ctx.fillStyle = bg;
  roundRect(ctx, 0, 0, W, H, 28);
  ctx.fill();

  // ── Decorative circles ─────────────────────────────────────────────────────
  ctx.save();
  ctx.fillStyle = 'rgba(99,102,241,0.10)';
  ctx.beginPath(); ctx.arc(W - 140, -60, 240, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(79,70,229,0.08)';
  ctx.beginPath(); ctx.arc(60, H + 30, 180, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(139,92,246,0.05)';
  ctx.beginPath(); ctx.arc(W / 2, H / 2, 260, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // ── Left accent bar ────────────────────────────────────────────────────────
  const bar = ctx.createLinearGradient(0, 0, 0, H);
  bar.addColorStop(0, '#818cf8');
  bar.addColorStop(1, '#4f46e5');
  ctx.fillStyle = bar;
  roundRect(ctx, 0, 0, 10, H, [28, 0, 0, 28]);
  ctx.fill();

  // ── Divider line ──────────────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(99,102,241,0.20)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(W - 260, 48);
  ctx.lineTo(W - 260, H - 48);
  ctx.stroke();

  // ── Gym logo circle ───────────────────────────────────────────────────────
  const logoGrad = ctx.createLinearGradient(52, 60, 52, 108);
  logoGrad.addColorStop(0, '#818cf8');
  logoGrad.addColorStop(1, '#4f46e5');
  ctx.fillStyle = logoGrad;
  ctx.beginPath(); ctx.arc(76, 84, 34, 0, Math.PI * 2); ctx.fill();

  // Dumbbell icon (simplified, drawn with canvas)
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  // bar
  ctx.beginPath(); ctx.moveTo(56, 84); ctx.lineTo(96, 84); ctx.stroke();
  // left weight
  ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(56, 74); ctx.lineTo(56, 94); ctx.stroke();
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(62, 76); ctx.lineTo(62, 92); ctx.stroke();
  // right weight
  ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(96, 74); ctx.lineTo(96, 94); ctx.stroke();
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(90, 76); ctx.lineTo(90, 92); ctx.stroke();

  // ── Gym name ──────────────────────────────────────────────────────────────
  ctx.fillStyle = '#f1f5f9';
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.letterSpacing = '6px';
  ctx.fillText('GYM SYSTEM', 124, 80);
  ctx.font = '15px Arial, sans-serif';
  ctx.fillStyle = '#6366f1';
  ctx.letterSpacing = '3px';
  ctx.fillText('MEMBERSHIP CARD', 124, 102);

  // ── Horizontal rule ───────────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(99,102,241,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(28, 132);
  ctx.lineTo(W - 280, 132);
  ctx.stroke();

  // ── Member name ───────────────────────────────────────────────────────────
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 46px Arial, sans-serif';
  ctx.letterSpacing = '0px';
  ctx.fillText(member.name || 'Unknown', 36, 212);

  // ── Info lines ────────────────────────────────────────────────────────────
  const infoItems = [
    ['Member ID', member.member_id || '—'],
    ['Phone', member.phone_number || '—'],
    ['Joined', member.join_date || '—'],
    ['Status', (member.status || 'active').toUpperCase()],
  ];

  let iy = 268;
  for (const [label, value] of infoItems) {
    ctx.font = '15px Arial, sans-serif';
    ctx.fillStyle = '#6366f1';
    ctx.letterSpacing = '2px';
    ctx.fillText(label.toUpperCase(), 36, iy);

    ctx.font = label === 'Member ID' ? '18px monospace' : '18px Arial, sans-serif';
    ctx.fillStyle = label === 'Status'
      ? (member.status === 'active' ? '#34d399' : '#f87171')
      : '#e2e8f0';
    ctx.letterSpacing = '0px';
    ctx.fillText(value, 36, iy + 24);

    iy += 62;
  }

  // ── Bottom bar ────────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(99,102,241,0.10)';
  roundRect(ctx, 0, H - 48, W, 48, [0, 0, 28, 28]);
  ctx.fill();

  ctx.font = '14px monospace';
  ctx.fillStyle = 'rgba(148,163,184,0.6)';
  ctx.letterSpacing = '2px';
  ctx.fillText('SCAN QR CODE TO CHECK IN', 36, H - 18);

  // ── QR code ───────────────────────────────────────────────────────────────
  if (qrSvgEl) {
    const svgStr = new XMLSerializer().serializeToString(qrSvgEl);
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // White background box
        ctx.fillStyle = '#ffffff';
        roundRect(ctx, W - 244, 60, 200, 200, 12);
        ctx.fill();
        ctx.drawImage(img, W - 236, 68, 184, 184);
        URL.revokeObjectURL(url);
        resolve();
      };
      img.onerror = resolve;
      img.src = url;
    });
  }

  // ── "Scan to check in" under QR ──────────────────────────────────────────
  ctx.font = '13px Arial, sans-serif';
  ctx.fillStyle = 'rgba(148,163,184,0.7)';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '1px';
  ctx.fillText('Scan to check in', W - 144, 282);
  ctx.textAlign = 'left';

  return canvas;
}

// Polyfill roundRect for older browsers
function roundRect(ctx, x, y, w, h, r) {
  const radii = typeof r === 'number' ? [r, r, r, r] : r;
  ctx.beginPath();
  ctx.moveTo(x + radii[0], y);
  ctx.lineTo(x + w - radii[1], y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radii[1]);
  ctx.lineTo(x + w, y + h - radii[2]);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radii[2], y + h);
  ctx.lineTo(x + radii[3], y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radii[3]);
  ctx.lineTo(x, y + radii[0]);
  ctx.quadraticCurveTo(x, y, x + radii[0], y);
  ctx.closePath();
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function BarcodeCard({ member }) {
  const qrRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [canvasUrl, setCanvasUrl] = useState(null); // preview of the generated card image

  // Pre-render card preview when member changes
  useEffect(() => {
    if (!member) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const qrSvgEl = qrRef.current?.querySelector('svg');
      const canvas = await renderCardToCanvas(member, qrSvgEl);
      if (!cancelled) setCanvasUrl(canvas.toDataURL('image/png'));
    }, 100);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [member]);

  if (!member) return null;

  const getCanvas = async () => {
    const qrSvgEl = qrRef.current?.querySelector('svg');
    return renderCardToCanvas(member, qrSvgEl);
  };

  const handlePrint = async () => {
    setExporting(true);
    try {
      const canvas = await getCanvas();
      const dataUrl = canvas.toDataURL('image/png');
      const printWin = window.open('', '_blank');
      printWin.document.write(`
        <!DOCTYPE html><html><head>
          <title>Member Card – ${member.name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { background: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
            img { max-width: 100%; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.2); }
            @media print {
              body { margin: 0; }
              img { width: 14cm; box-shadow: none; }
            }
          </style>
        </head><body>
          <img src="${dataUrl}" />
          <script>window.onload = () => { setTimeout(() => window.print(), 300); }<\/script>
        </body></html>
      `);
      printWin.document.close();
    } finally {
      setExporting(false);
    }
  };

  const handleDownload = async () => {
    setExporting(true);
    try {
      const canvas = await getCanvas();
      const link = document.createElement('a');
      link.download = `${member.member_id}-card.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setExporting(false);
    }
  };

  const handleWhatsApp = async () => {
    setExporting(true);
    try {
      const canvas = await getCanvas();
      // Step 1: download the card image
      const link = document.createElement('a');
      link.download = `${member.member_id}-card.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      // Step 2: open WhatsApp directly to the member's number (skips share sheet)
      const rawPhone = (member.phone_number || '').replace(/^\+/, '');
      const waText = encodeURIComponent(`Here is your Gym Membership Card 🏋️\nName: ${member.name}\nID: ${member.member_id}\n\n(Please attach the downloaded card image)`);
      const waUrl = rawPhone
        ? `https://wa.me/${rawPhone}?text=${waText}`
        : `https://wa.me/?text=${waText}`;
      setTimeout(() => window.open(waUrl, '_blank'), 600);
    } catch {
      // ignore
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4 w-full max-w-2xl">
      {/* Hidden QR for canvas capture */}
      <div ref={qrRef} className="sr-only absolute -left-[9999px]" aria-hidden>
        <QRCodeSVG value={member.member_id} size={200} level="M" bgColor="#ffffff" fgColor="#000000" />
      </div>

      {/* Card preview */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 shadow-2xl shadow-indigo-950/50">
        {canvasUrl ? (
          <img src={canvasUrl} alt="Member card preview" className="w-full block" style={{ imageRendering: 'high-quality' }} />
        ) : (
          /* Live preview while canvas loads */
          <div style={{ background: 'linear-gradient(135deg, #0d0f1a 0%, #131628 50%, #1a1d35 100%)' }}
            className="w-full aspect-[5/3] flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handlePrint}
          disabled={exporting || !canvasUrl}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
          </svg>
          Print
        </button>

        <button
          onClick={handleDownload}
          disabled={exporting || !canvasUrl}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-sm font-medium transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Download
        </button>

        <button
          onClick={handleWhatsApp}
          disabled={exporting || !canvasUrl}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium transition"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.114 1.526 5.847L.057 23.571a.75.75 0 00.916.902l5.908-1.548A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.75 9.75 0 01-5.029-1.393l-.36-.214-3.734.979.996-3.63-.235-.374A9.75 9.75 0 1112 21.75z"/>
          </svg>
          WhatsApp
        </button>
      </div>

      {exporting && (
        <p className="text-xs text-center text-slate-500 animate-pulse">Generating card image…</p>
      )}
    </div>
  );
}


