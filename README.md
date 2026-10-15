# GymTracker

Diario di allenamento per **palestra** e **corpo libero (calisthenics)**, pensato per iPhone.
È una web app installabile (PWA): gratuita, funziona offline, i dati restano sul telefono.

## Funzioni

- **Diario con calendario**: scegli il giorno, tocca «Esercizio», compila le serie e salva.
  - Ogni serie ha ripetizioni **oppure** tempo (min:sec, es. plank) e carico in kg (0 = corpo libero).
  - I valori dell'ultima volta compaiono in grigio: se lasci un campo vuoto viene usato quello.
  - Avviso automatico quando batti un record.
- **Libreria di oltre 200 esercizi** divisi per muscolo e tipo (palestra / corpo libero, comprese le skill
  come front lever, planche e muscle-up), con ricerca e la possibilità di crearne di propri.
- **Schede**: più schede divise in giorni (A/B/C…), con serie, ripetizioni (anche a range), tempo, carico,
  recupero e note. Le consulti in palestra con l'ultima prestazione accanto a ogni esercizio, e con
  «Allenati oggi» le carichi nel diario già compilate.
- **Progressi** esercizio per esercizio: record, 1RM stimato, volume, ripetizioni e tempi massimi,
  grafico nel tempo e storico con i record evidenziati.
- **Backup**: esporta e importa un file JSON (es. su iCloud Drive).

## Architettura

- React + TypeScript + Vite, nessun server.
- Dati in IndexedDB (tramite Dexie), salvati solo sul dispositivo.
- Service worker (vite-plugin-pwa) per l'uso offline e l'installazione sulla schermata Home.
- Pubblicazione gratuita su GitHub Pages: a ogni push su `main` una GitHub Action
  (`.github/workflows/deploy.yml`) compila la app e la pubblica sul branch `gh-pages`.

## Pubblicazione

La app è online su https://alevegro.github.io/GymTracker/ e si aggiorna da sola a ogni push su `main`.
Il branch `gh-pages` è generato automaticamente: non va modificato a mano.

## Installazione su iPhone

Apri l'indirizzo con **Safari** → pulsante **Condividi** → **Aggiungi alla schermata Home**.

## Sviluppo

```bash
npm install
npm run dev       # server di sviluppo
npm run build     # typecheck + build in dist/
npm run preview   # anteprima della build
```
