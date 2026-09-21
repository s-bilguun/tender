# Tender MN (vendor)

Монгол улсын төрийн худалдан авах ажиллагааны (tender.gov.mn) нээлттэй өгөгдлийг хялбархан хайх, дүн шинжилгээ хийх, AI туслахтай интерактив портал систем.

## Онцлогууд (Features)

- **Нээлттэй өгөгдлийн шууд хайлт (Public Tender Search):**
  - Төрөл, салбар, төсөвт өртөг, тендерийн дугаар, огноогоор бодит цагт шүүж хайх
  - Table (хүснэгт) болон Card (картын) харагдацын горим
  - Хүснэгтийн багануудыг эрэмбэлэх (өртөг, огноо, хүчинтэй хугацаа)
- **AI Зөвлөх туслах (OpenRouter AI Assistant):**
  - OpenRouter үнэгүй загваруудтай (Nemotron 3, Laguna S, Ling 3 г.м.) уялдан тендерийн өгөгдөл дээр суурилсан тайлбар, зөвлөгөө, тоон мэдээлэл өгөх
  - Монгол хэлээр чөлөөтэй харилцах боломж
- **Хос хэлний сонголт (MN / EN):**
  - Монгол болон Англи хэл хооронд шууд шилжих
- **Мэргэжлийн, цэвэрхэн дизайн (Clean Design):**
  - `ibelick/ui-skills` зарчимд нийцсэн нейтраль өнгө, тодорхой шатлал, tabular тоон формат

## Технологийн стек (Tech Stack)

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **AI Routing:** OpenRouter API (`openrouter/free`)

## Эхлүүлэх заавар (Quickstart)

1. **Хамааралтай сангуудыг суулгах:**
   ```bash
   npm install
   ```

2. **Орчны хувьсагч тохируулах (.env.local):**
   `.env.example` файлыг хуулж `.env.local` үүсгэнэ:
   ```bash
   cp .env.example .env.local
   ```
   `OPENROUTER_API_KEY` утгад өөрийн OpenRouter түлхүүрийг оруулна.

3. **Хөгжүүлэлтийн сервер асаах:**
   ```bash
   npm run dev
   # эсвэл өөр порт дээр:
   npm run dev:3001
   ```

4. **Тендерийн өгөгдлийг шинэчлэх (Сонголттой):**
   ```bash
   node scripts/sync-tenders.js
   ```
