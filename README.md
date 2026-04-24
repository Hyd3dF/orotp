# SohbetApp

React, Vite ve Supabase ile geliştirilen sohbet, sosyal akış ve profil uygulaması.

## Gereksinimler

- Node.js 22 veya uyumlu güncel LTS sürümü
- npm
- Docker ve Docker Compose
- Supabase projesi

## Ortam Değişkenleri

`.env.example` dosyasını `.env` olarak kopyalayın ve Supabase bilgilerinizi girin:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Bu değişkenler Vite tarafından build sırasında uygulamaya gömülür. Docker Compose ile yayınlarken `.env` dosyasını build komutundan önce hazır tutun.

## Local Development

```bash
npm ci
npm run dev
```

Uygulama varsayılan olarak Vite geliştirme sunucusunda çalışır.

## Production Docker Compose

Temiz bir sunucuda çalıştırmak için:

```bash
cp .env.example .env
# .env dosyasını gerçek Supabase değerleriyle düzenleyin
docker compose build
docker compose up -d
```

Uygulama `http://localhost:3000` adresinden servis edilir. Hash router kullanıldığı için doğrudan sayfa adresleri şu formatta çalışır:

```text
http://localhost:3000/#/login
http://localhost:3000/#/register
http://localhost:3000/#/chat
```

Logları görmek için:

```bash
docker compose logs -f web
```

Yeniden build edip yayınlamak için:

```bash
docker compose build --no-cache
docker compose up -d
```

## Supabase Setup

Veritabanı şeması için Supabase SQL editor içinde `supabase-schema.sql` dosyasını çalıştırın.

Storage bucket ve policy kurulumu için `supabase-storage-migration.sql` dosyasını çalıştırın. Uygulama şu bucket adlarını kullanır:

- `avatars`
- `chat-images`

`.env` eksik olduğunda uygulama çökmeden açılır, ancak Supabase gerektiren giriş, kayıt, sohbet ve yükleme akışları çalışmaz.

## Verification

Yayın öncesi önerilen kontroller:

```bash
npm ci
npm run lint
npm run build
npm run preview
```

Docker doğrulaması:

```bash
docker compose build
docker compose up -d
docker compose ps
```

Sonrasında `http://localhost:3000`, `/#/login`, `/#/register` ve `/#/chat` adreslerini kontrol edin.
