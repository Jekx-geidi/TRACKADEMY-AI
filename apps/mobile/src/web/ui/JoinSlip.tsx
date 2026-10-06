import { Button } from './Button';

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);

/** A no-install, paper-friendly invite for classrooms with mixed digital access. */
export function PrintJoinSlip({ className, teacher, joinCode, inviteLink }: { className: string; teacher?: string | null; joinCode: string; inviteLink: string }) {
  const print = () => {
    const popup = window.open('', '_blank', 'width=720,height=900');
    if (!popup) return;
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(inviteLink)}`;
    popup.document.write(`<!doctype html><html><head><title>Trackademic Join Sheet</title><style>body{font-family:Arial,sans-serif;color:#16143d;padding:38px;max-width:620px;margin:auto}.brand{font-weight:800;letter-spacing:1px;color:#4635b8}.code{font-size:46px;font-weight:800;letter-spacing:8px;margin:16px 0}.qr{width:210px;height:210px}.box{border:2px solid #16143d;border-radius:18px;padding:25px;margin-top:25px}ol{line-height:1.7}small{overflow-wrap:anywhere}@media print{body{padding:0}}</style></head><body><p class="brand">TRACKADEMY · CLASS JOIN</p><h1>${escapeHtml(className)}</h1><p>${teacher ? `Teacher: ${escapeHtml(teacher)}` : 'Join your class in one step.'}</p><div class="box"><p>STUDENT JOIN CODE</p><div class="code">${escapeHtml(joinCode)}</div><img class="qr" src="${qr}" alt="QR code for class join"/><p><strong>How to join</strong></p><ol><li>Open Trackademic in any browser</li><li>Choose Student and sign in</li><li>Scan this QR or enter the code above</li><li>Confirm ${escapeHtml(className)}</li></ol><small>${escapeHtml(inviteLink)}</small></div><script>window.onload=()=>window.print()</script></body></html>`);
    popup.document.close();
  };
  return <Button label="Print Class Join Sheet" icon="document-text" variant="secondary" onPress={print} />;
}
