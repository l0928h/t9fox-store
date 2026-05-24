# T9FOX 商店 — 專案進度（自架，截至建立日期）

## 目標
自架網路商店：Next.js 全端 + Prisma + PostgreSQL。

## 目錄結構
- `docker-compose.yml`：PostgreSQL 16（`t9fox` / `t9fox_dev` / 資料庫 `t9fox_store`）
- `web/`：主要應用（勿在根目錄 `T9FOX_STORE` 直接建 Next 專案，因 npm 不允許套件名大寫）

## 技術棧
- Next.js 15、React 19 RC、Turbopack 開發
- Prisma 6、PostgreSQL
- NextAuth v5（Credentials + JWT），密碼 bcryptjs
- 驗證：Zod
- 介面：Tailwind、繁中 UI

## 已實作功能
- 首頁、商品列表/詳情、購物車（訪客 cookie session + 登入可綁 user cart）
- 註冊/登入、訂單（結帳需登入；示範流程直接 `PAID`，未接真實金流）
- 我的訂單、管理後台訂單列表/狀態變更（僅 `ADMIN`）
- Middleware：`/admin` 與 `/api/admin` 用 `getToken` 檢查 `role=ADMIN`（不經 `lib/auth`，避免 Edge 拉入 bcryptjs）

## 資料模型（Prisma）
User、Category、Product、ProductImage、ProductVariant、Cart、CartItem、Order、OrderItem

## 本機執行
1. 根目錄：`docker compose up -d`
2. `cd web`：複製 `.env.example` → `.env`（可沿用範例連線與 `AUTH_SECRET` 開發用）
3. `npm run db:setup`（`generate` + `db push` + `seed`）
4. `npm run dev` → http://localhost:3000

## 種子帳號
- 管理員：`admin@t9fox.local` / `admin1234`
- 會員：`user@t9fox.local` / `user1234`  
（若資料庫已有商品，`seed` 會跳過建立商品，帳號仍 upsert 更新。）

## 建置
- 曾修正 ESLint 與 middleware/Edge 相容；`npx next build` 可通過。

## 未作 / 可延伸
- 真實金流與金流回調、Email、進階庫存鎖/併發、圖片改走自有 S3 等。
