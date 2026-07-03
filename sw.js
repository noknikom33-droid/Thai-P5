/* Service Worker — อ่านสนุก ป.5
   ทำให้เปิดแอปได้แม้เน็ตหลุด (แคชหน้าแอป + ฟอนต์ + รูปไอคอน/ปก)
   หมายเหตุ: การเรียก API (Google Apps Script) เป็น POST จะไม่ถูกแคช
            เพราะข้อมูลต้องสด ๆ — ออฟไลน์จะเปิดแอปได้ แต่ข้อมูลสดต้องมีเน็ต
   วิธีใช้: วางไฟล์นี้ไว้โฟลเดอร์เดียวกับ index.html ในรีโป GitHub
   อยากอัปเดตแคชเวอร์ชันใหม่: เปลี่ยนเลข CACHE ด้านล่าง (เช่น v3 -> v4) */
const CACHE = 'arnsanook-p5-v5';
const SHELL = ['./', './index.html'];

self.addEventListener('install', (e) => {
  // ไม่ skipWaiting อัตโนมัติ — ให้ตัวใหม่ "รอ" จนกว่าผู้ใช้จะกด "แตะเพื่ออัปเดต"
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
});

// เมื่อผู้ใช้กดอัปเดต หน้าเว็บจะส่งข้อความมาบอกให้ข้ามการรอ แล้วรีเฟรชเป็นตัวใหม่
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                 // ไม่แตะ POST (การเรียก API)

  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;   // ข้าม blob:/data:
  if (url.hostname.indexOf('script.google.com') >= 0) return;          // ไม่แคช API

  // เปิดหน้าเว็บ (navigation): เอาเน็ตก่อน ถ้าไม่ได้ค่อยใช้หน้าที่แคชไว้
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put('./index.html', cp)).catch(() => {}); return r; })
        .catch(() => caches.match('./index.html').then((m) => m || caches.match('./')))
    );
    return;
  }

  // ทรัพยากรอื่น (ฟอนต์/รูป): ใช้แคชก่อน ถ้าไม่มีค่อยโหลดแล้วเก็บแคชไว้
  e.respondWith(
    caches.match(req).then((m) =>
      m || fetch(req).then((r) => {
        const cp = r.clone();
        caches.open(CACHE).then((c) => c.put(req, cp)).catch(() => {});
        return r;
      }).catch(() => m)
    )
  );
});
