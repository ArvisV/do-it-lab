# Do It Lab

**Do It Lab** ir hobiju un radošo projektu koplietošanas platforma. Tā palīdz lietotājiem apkopot savas idejas, dokumentēt projekta tapšanas procesu pa soļiem un dalīties ar paveikto ar citiem.

Projekts tiek izstrādāts kā bakalaura darba prototips.

## Galvenās iespējas

- Lietotāja reģistrācija un pieslēgšanās.
- E-pasta adreses apstiprināšana ar sešu ciparu kodu.
- Lietotāja sesiju pārvaldība.
- Projektu izveide, rediģēšana un pārvaldība.
- Projektu publicēšana kopienas katalogā.
- Projektu organizēšana pēc kategorijām.
- Projekta izstrādes soļu pievienošana un aprakstīšana.
- Materiālu uzskaite un piesaiste projekta soļiem.
- Projekta vāka attēlu, galerijas attēlu un soļu attēlu pievienošana.
- Projektu saglabāšana izlasei.
- Lietotāja profila attēlojamā vārda pārvaldība.
- Sākumlapa ar jaunākajiem publicētajiem projektiem.

## Tehnoloģijas

### Frontend
- React
- TypeScript
- Vite
- React Router
- Lucide React

### Backend
- Node.js
- Express
- TypeScript
- Prisma ORM
- PostgreSQL
- Nodemailer
- Multer

## Projekta struktūra

```text
do-it-lab/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   └── index.ts
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   └── pages/
    └── package.json
```

## Prasības

Lai palaistu projektu lokāli, nepieciešams:

- Node.js un npm.
- PostgreSQL datubāzes serveris.
- SMTP konts e-pasta apstiprināšanas ziņojumu nosūtīšanai.

## Uzstādīšana un palaišana

### 1. Klonē repozitoriju

```bash
git clone https://github.com/ArvisV/do-it-lab.git
cd do-it-lab
```

Ja vēlies izmantot izstrādes zaru ar jaunāko dizainu:

```bash
git switch redesign/new-design
```

### 2. Sagatavo backend

```bash
cd backend
npm install
```

Izveido `.env` failu mapē `backend/` un norādi šādus mainīgos:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/do_it_lab?schema=public"

SESSION_SECRET="ievieto-garu-un-nejaušu-noslepumu"
EMAIL_VERIFICATION_SECRET="ievieto-citu-garu-un-nejaušu-noslepumu"

SMTP_HOST="smtp.gmail.com"
SMTP_PORT=465
SMTP_USER="tavs-epasta-konts"
SMTP_PASS="epasta-lietotnes-parole"
EMAIL_FROM="Do It Lab <tavs-epasta-konts>"
```

Aizstāj piemēra vērtības ar saviem PostgreSQL un SMTP piekļuves datiem. Noslēpumus un paroles nedrīkst publicēt repozitorijā.

Pārliecinies, ka PostgreSQL darbojas un datubāze `do_it_lab` ir izveidota. Pēc tam ģenerē Prisma Client un izpildi datubāzes migrācijas:

```bash
npx prisma generate --config prisma7.config.ts
npx prisma migrate dev --config prisma7.config.ts
```

Palaid backend izstrādes režīmā:

```bash
npm run dev
```

Backend pēc noklusējuma darbojas adresē `http://localhost:5000`.

Datubāzes savienojumu vari pārbaudīt adresē:

`http://localhost:5000/api/health/db`

### 3. Sagatavo frontend

Atver otru termināļa logu un no projekta saknes izpildi:

```bash
cd frontend
npm install
npm run dev
```

Frontend pēc noklusējuma būs pieejams adresē:

`http://localhost:5173`

## Izstrādes piezīmes

- Frontend API pieprasījumi pašlaik izmanto backend adresi `http://localhost:5000/api`.
- Lietotāja sesija tiek uzturēta ar HTTP-only sīkdatni.
- Attēli tiek glabāti backend mapē `uploads/`.
- E-pasta apstiprināšanai nepieciešama korekti konfigurēta SMTP piekļuve.

## Projekta statuss

Do It Lab ir aktīvi izstrādāts prototips. Funkcionalitāte un tehniskā dokumentācija tiek papildināta projekta izstrādes gaitā.