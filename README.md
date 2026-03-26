# Sforno Food Cost Dashboard

## Deploy in 4 passi

---

### PASSO 1 — Crea il repository GitHub

1. Vai su [github.com](https://github.com) → **New repository**
2. Nome: `sforno-dashboard`
3. Visibilità: **Private** (i tuoi dati restano privati)
4. Clicca **Create repository**

---

### PASSO 2 — Carica il progetto su GitHub

Sul tuo computer, apri il terminale nella cartella del progetto e lancia:

```bash
git init
git add .
git commit -m "primo commit"
git remote add origin https://github.com/TUO-USERNAME/sforno-dashboard.git
git branch -M main
git push -u origin main
```

Verifica che nella cartella `data/` ci sia il file `sforno-data.json`.

---

### PASSO 3 — Crea il Personal Access Token GitHub

1. Vai su: https://github.com/settings/tokens?type=beta
2. Clicca **Generate new token**
3. Nome: `sforno-dashboard`
4. Repository access: **Only select repositories** → seleziona `sforno-dashboard`
5. Permissions → **Contents**: imposta su **Read and write**
6. Clicca **Generate token**
7. **Copia il token** (lo vedi solo una volta!)

---

### PASSO 4 — Deploya su Vercel

1. Vai su [vercel.com](https://vercel.com) → accedi con GitHub
2. Clicca **Add New Project** → importa `sforno-dashboard`
3. Framework: **Vite** (viene rilevato in automatico)
4. Prima di cliccare Deploy, vai su **Environment Variables** e aggiungi:

| Nome | Valore |
|------|--------|
| `VITE_GITHUB_OWNER` | il tuo username GitHub |
| `VITE_GITHUB_REPO` | `sforno-dashboard` |
| `VITE_GITHUB_TOKEN` | il token copiato al passo 3 |

5. Clicca **Deploy**

Vercel ti darà un URL tipo `sforno-dashboard.vercel.app` — quello è il tuo sito!

---

## Come funziona il salvataggio

Ogni modifica che fai (nuova ricetta, cambio prezzo, nuovo ingrediente) viene salvata automaticamente su GitHub dopo 3 secondi dall'ultima azione. In alto a destra vedi lo stato:

- ⚪ *Dati sincronizzati* — tutto ok
- 🟡 *Salvataggio…* — sta scrivendo su GitHub
- 🟢 *✓ Salvato* — fatto
- 🔴 *⚠ Errore salvataggio* — controlla il token o la connessione

I dati vengono salvati nel file `data/sforno-data.json` dentro il tuo repository GitHub. Puoi vederli in qualsiasi momento aprendo quel file su GitHub.

---

## Aggiornare il codice in futuro

Quando vuoi aggiornare l'app con nuove funzioni:

```bash
git add .
git commit -m "aggiornamento"
git push
```

Vercel rideploya automaticamente entro 30 secondi.

---

## Sviluppo locale

```bash
npm install
cp .env.example .env   # compila con i tuoi valori
npm run dev
```

L'app gira su http://localhost:5173
