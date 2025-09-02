# 🚀 Automatisk Email Generator

En professionel email marketing platform bygget med Next.js og integreret med Acumbamail API.

## ✨ Features

- **🔐 Brugerautentificering** - Sikker login/registrering med NextAuth.js
- **📧 Email Marketing** - Opret og send kampagner via Acumbamail
- **📋 Template Management** - Import og håndter email templates
- **👥 Abonnent Håndtering** - Synkroniser lister og abonnenter
- **🎯 Test Emails** - Send test emails til specifikke lister
- **📊 Campaign Tracking** - Følg kampagne status og resultater
- **🎨 Moderne UI** - Responsiv design med Tailwind CSS

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js
- **Database**: SQLite med Prisma ORM
- **Email Service**: Acumbamail API
- **Deployment**: Vercel Ready

## 🚀 Quick Start

### 1. Klon Repository
\`\`\`bash
git clone https://github.com/Skallerup/acumba.git
cd acumba
\`\`\`

### 2. Installer Dependencies
\`\`\`bash
npm install
\`\`\`

### 3. Opsæt Environment Variables
Opret \`.env\` fil:
\`\`\`env
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:9999"
NEXTAUTH_SECRET="your-secret-key"
\`\`\`

### 4. Opsæt Database
\`\`\`bash
npm run db:push
npm run db:generate
\`\`\`

### 5. Start Development Server
\`\`\`bash
npm run dev
\`\`\`

Åbn [http://localhost:9999](http://localhost:9999) i din browser.

## 📁 Projekt Struktur

\`\`\`
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── auth/          # Authentication endpoints
│   │   └── acumbamail/    # Acumbamail integration
│   ├── acumbamail/        # Main application page
│   ├── login/             # Login page
│   ├── register/          # Registration page
│   └── profile/           # User profile page
├── components/            # Reusable components
├── lib/                   # Utility libraries
│   ├── auth.ts           # NextAuth configuration
│   ├── prisma.ts         # Database client
│   └── acumbamail.ts     # Acumbamail API client
└── types/                 # TypeScript type definitions
\`\`\`

## 🔧 Available Scripts

- \`npm run dev\` - Start development server (port 9999)
- \`npm run build\` - Build for production
- \`npm run start\` - Start production server
- \`npm run lint\` - Run ESLint
- \`npm run db:push\` - Push database schema changes
- \`npm run db:generate\` - Generate Prisma client
- \`npm run db:studio\` - Open Prisma Studio
- \`npm run update-github\` - Update GitHub with changes
- \`npm run sync\` - Quick sync to GitHub

## 🔐 Acumbamail Integration

1. **Opret Acumbamail Account** på [acumbamail.com](https://acumbamail.com)
2. **Få API Token** fra din Acumbamail dashboard
3. **Konfigurer Integration** i applikationen
4. **Synkroniser Data** - Lister, abonnenter, templates og kampagner

## 📊 Database Schema

- **User** - Bruger information og Acumbamail token
- **AcumbamailList** - Email lister fra Acumbamail
- **Subscriber** - Abonnenter i lister
- **EmailTemplate** - Email templates
- **EmailCampaign** - Kampagner og deres status

## 🚀 Deployment

### Vercel (Anbefalet)
1. Push kode til GitHub
2. Forbind repository til Vercel
3. Konfigurer environment variables
4. Deploy automatisk

### Environment Variables for Production
\`\`\`env
DATABASE_URL="your-production-database-url"
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-production-secret"
\`\`\`

## 🤝 Contributing

1. Fork repository
2. Opret feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit ændringer (\`git commit -m 'feat: add amazing feature'\`)
4. Push til branch (\`git push origin feature/amazing-feature\`)
5. Opret Pull Request

## 📝 Commit Convention

Vi bruger conventional commits:
- \`feat:\` - Nye features
- \`fix:\` - Bug fixes
- \`docs:\` - Dokumentation
- \`style:\` - Styling ændringer
- \`refactor:\` - Code refactoring
- \`test:\` - Tests
- \`chore:\` - Maintenance

## 📄 License

Dette projekt er licenseret under MIT License - se [LICENSE](LICENSE) filen for detaljer.

## 🔗 Links

- **GitHub Repository**: [https://github.com/Skallerup/acumba](https://github.com/Skallerup/acumba)
- **Acumbamail**: [https://acumbamail.com](https://acumbamail.com)
- **Next.js**: [https://nextjs.org](https://nextjs.org)
- **Prisma**: [https://prisma.io](https://prisma.io)

## 📞 Support

Hvis du har spørgsmål eller problemer, opret venligst en [Issue](https://github.com/Skallerup/acumba/issues) på GitHub.

---

**Udviklet med ❤️ af Martin Skallerup**