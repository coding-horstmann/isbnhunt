# VintedCron

Ein automatisiertes Tool zum Finden von Arbitrage-Möglichkeiten zwischen Vinted.de und eBay.de.

## Features

- 🔍 **Automatisches Scraping** von Vinted Katalog-URLs
- 💰 **eBay API Integration** für realistische Preisvergleiche
- 🤖 **KI-Fallback** mit Gemini (optional ein/ausschaltbar)
- 📊 **Dashboard** mit Profit- und ROI-Analyse
- ⏰ **Automatische Cron-Jobs** alle 2 Stunden (8:00 - 20:00 Uhr)
- 📧 **E-Mail Reports** für Deals mit hohem ROI
- ⚙️ **Konfigurierbare URLs** für verschiedene Kategorien
- 🛡️ **Rate Limiting** zum Schutz vor Bot-Erkennung

## Installation

**Prerequisites:** Node.js 20+

1. Dependencies installieren:
```bash
npm install
```

2. Umgebungsvariablen konfigurieren:

Erstelle eine `.env.local` Datei basierend auf `env.example`:

```env
# eBay API Konfiguration (OAuth2 - erforderlich für echte Preise)
EBAY_CLIENT_ID=your_ebay_client_id_here
EBAY_CLIENT_SECRET=your_ebay_client_secret_here

# Max. Seiten pro Kategorie beim Scraping
MAX_SCAN_PAGES=3

# E-Mail Reports (optional)
EMAIL_FROM=your_gmail@gmail.com
EMAIL_TO=recipient@example.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
MIN_ROI_EMAIL=150
```

3. App starten:
```bash
npm run dev
```

## Konfiguration

### Vinted URLs konfigurieren

Bearbeite `config/vinted-urls.json` um URLs hinzuzufügen oder zu entfernen:

```json
{
  "urls": [
    {
      "id": "sachbuecher-all",
      "name": "Sachbücher (Sehr gut, Neu, Neu mit Etikett)",
      "url": "https://www.vinted.de/catalog?catalog[]=2320&status_ids[]=1&status_ids[]=2&status_ids[]=6&order=newest_first",
      "category": "Bücher & Medien - Sachbücher",
      "enabled": true
    }
  ]
}
```

**Vinted URL Parameter:**
- `catalog[]=2320` = Kategorie-ID (2320 = Sachbücher)
- `status_ids[]=1` = Neu
- `status_ids[]=2` = Sehr gut
- `status_ids[]=6` = Neu mit Etikett
- `order=newest_first` = Sortierung

### eBay API Setup

1. Registriere dich bei [eBay Developers](https://developer.ebay.com/)
2. Erstelle eine neue App (Production oder Sandbox)
3. Kopiere `Client ID` (App ID) und `Client Secret` in deine `.env.local`
4. Die App verwendet automatisch OAuth2 Token-Caching (Token wird 2 Stunden gecacht)

### E-Mail Reports konfigurieren

Um automatische E-Mail-Reports zu erhalten:

1. **Gmail App-Passwort erstellen:**
   - Gehe zu https://myaccount.google.com/security
   - Aktiviere 2-Faktor-Authentifizierung
   - Gehe zu https://myaccount.google.com/apppasswords
   - Erstelle ein neues App-Passwort für "VintedCron"

2. **Umgebungsvariablen setzen:**
   - `EMAIL_FROM` = Deine Gmail-Adresse
   - `EMAIL_TO` = Empfänger für die Reports
   - `GMAIL_APP_PASSWORD` = Das 16-stellige App-Passwort
   - `MIN_ROI_EMAIL` = Minimaler ROI für E-Mail-Benachrichtigung (Standard: 150)

## Automatische Scans (Cron-Job)

Die App führt automatisch alle 2 Stunden einen Scan durch:
- **Zeiten:** 8:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00 Uhr (Europe/Berlin)
- **E-Mail Reports:** Werden nach jedem Scan gesendet (nur Deals mit ROI ≥ MIN_ROI_EMAIL)

Der Cron-Job kann auch manuell über `/api/cron` oder die `/results`-Seite ausgelöst werden.

## Seiten

- `/` - Dashboard mit manuellem Scan
- `/results` - Ergebnisse des automatischen Scans
- `/settings` - Einstellungen

## Architektur

- **Frontend**: React + TypeScript + Next.js
- **Backend**: Next.js API Routes
- **Scraping**: Axios + Cheerio (Vinted)
- **API**: eBay Browse API mit OAuth2 (automatisches Token-Caching)
- **Cron**: node-cron für automatische Scans
- **E-Mail**: Nodemailer mit Gmail
- **KI**: Google Gemini (optional)

## Deployment auf Railway

1. Push zu GitHub
2. Verbinde Repository mit Railway
3. **Umgebungsvariablen setzen:**
   - Gehe zu deinem **Service** (nicht Project Settings!)
   - Klicke auf den Tab **"Variables"**
   - Füge folgende Variablen hinzu:

   | Variable | Erforderlich | Beschreibung |
   |----------|-------------|--------------|
   | `EBAY_CLIENT_ID` | ✅ | eBay API Client ID |
   | `EBAY_CLIENT_SECRET` | ✅ | eBay API Client Secret |
   | `MAX_SCAN_PAGES` | ❌ | Seiten pro Kategorie (Standard: 3) |
   | `APP_PASSWORD` | ❌ | Login-Schutz für die App |
   | `EMAIL_FROM` | ❌ | Gmail-Adresse für Reports |
   | `EMAIL_TO` | ❌ | Empfänger der Reports |
   | `GMAIL_APP_PASSWORD` | ❌ | Gmail App-Passwort |
   | `MIN_ROI_EMAIL` | ❌ | Min. ROI für E-Mail (Standard: 150) |

4. **Domain generieren:**
   - Gehe zu deinem **Service** → **Settings** → **Networking**
   - Klicke auf **"Generate Domain"**

**Wichtig für Railway:**
- Der Cron-Job läuft automatisch im Server (node-cron)
- E-Mails werden nach jedem automatischen Scan gesendet
- Der Server läuft auf dem PORT, den Railway setzt

## Bot-Schutz

Die App verwendet verschiedene Strategien um Bot-Erkennung zu vermeiden:

- ✅ User-Agent Rotation
- ✅ Rate Limiting (2-5 Sekunden zwischen Requests)
- ✅ Realistische HTTP Headers
- ✅ Referer Header
- ✅ Delays zwischen eBay API Calls

**Hinweis**: Bei intensivem Scraping kann Vinted trotzdem sperren. In diesem Fall:
- Längere Delays verwenden
- Proxies einsetzen
- Weniger Items pro Scan verarbeiten

## Lizenz

MIT
