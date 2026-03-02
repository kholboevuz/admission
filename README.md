# Admission (Qabul) Platformasi — DSBA

DSBA qabul jarayonlarini raqamlashtirish uchun mo‘ljallangan Next.js (App Router) asosidagi veb-ilova.

## Texnologiyalar
- Next.js (App Router)
- Node.js 20+
- Docker / Docker Compose (dev & prod)
- (Ixtiyoriy) PM2, Nginx Reverse Proxy

---

## Talablar
- Node.js 20+ (Docker ishlatmasang)
- Docker + Docker Compose v2 (tavsiya)
- `.env` fayl (majburiy)

---

## 1) Muhit sozlamalari (ENV)
Root papkada quyidagi fayllar bo‘lishi kerak:

- `.env`
- (ixtiyoriy) `.env.sentry-build-plugin`

> `.env` tarkibi loyihaga mos ravishda to‘ldiriladi (DB, JWT, API URL, va h.k.).

---

## 2) Lokal ishga tushirish (Docker bilan) — DEV (Hot Reload)
`docker-compose.yml` ichida `admission-dev` dev profilga ulangan.

### Ishga tushirish:
```bash
docker compose --profile dev up -d admission-dev