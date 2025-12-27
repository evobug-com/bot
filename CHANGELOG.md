# Changelog

Všechny důležité změny v Allcom Botu jsou zaznamenány v tomto souboru.

Formát je založen na [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

<!-- Podporované sekce / Supported sections:
  - Přidáno / Added      🚀 Nové funkce
  - Změněno / Changed    🔄 Změny
  - Opraveno / Fixed     🐛 Opravy
  - Odstraněno / Removed 🗑️ Odstraněno
  - Zastaralé / Deprecated ⚠️ Zastaralé
  - Bezpečnost / Security 🔒 Bezpečnost
-->

## [2.5.0] - 2024-12-26

### Přidáno
- Dockerfile a GitHub Actions workflow pro sestavení Docker obrazů
- CHANGELOG.md pro sledování aktualizací bota (a v češtině!)

### Změněno
- Changelog nyní čte ze souboru místo z gitu (kompatibilní s Dockerem)

### Opraveno
- Monitorování gateway připojení pro detekci mrtvých WebSocket spojení
- Chybějící složka sounds již nezobrazuje error v logu

## [2.4.0] - 2024-12-20

### Přidáno
- AI generované větvení příběhů s admin nastavením
- Inkrementální AI generování příběhů s nastavitelnou šancí
- Deník příběhů pro úplné sledování narativu
- Generování obrázků pro momenty příběhu

### Opraveno
- Logika opakování pro generování obrázků příběhu
- Rozhodovací uzly směřující přímo na koncové stavy

## [2.3.0] - 2024-12-15

### Přidáno
- Interaktivní systém větvených příběhů
- Volby v příběhu jsou nyní ephemeral s veřejným shrnutím po dokončení
- 43 nových pracovních aktivit a 8 interaktivních příběhů

### Změněno
- Odstraněny lineární generátory příběhů ve prospěch větvícího systému

### Opraveno
- Duplicitní titulky a česká gramatika v příbězích
- Konzistentní náhodné hodnoty mezi narativem a mincemi

## [2.2.0] - 2024-12-01

### Přidáno
- Systém sledování aktivity
- Body aktivity za příkazy a zprávy
- Moderování zpráv s GPT odůvodněním
- Režim dry run pro moderování

### Změněno
- Vyžadována veřejná voice místnost pro body aktivity
- Zvýšeny body aktivity za zprávy na 2

### Opraveno
- Vyloučen textový chat voice kanálu z aktivity zpráv

## [2.1.0] - 2024-11-15

### Přidáno
- Příkaz pro export místností
- Ovládání virtuálních místností
- Funkce voice časovače

### Opraveno
- Tlačítka v DM pro nastavení soukromého/veřejného kanálu
- Spam chyb discord.js paketů v logech

## [2.0.0] - 2024-11-01

### Přidáno
- Investiční systém s žebříčkem
- Odměny za vyprávění příběhů
- Práce s příběhy založená na šanci s nastavením pro uživatele
- Stránkování pro investiční aktiva

### Změněno
- Přepracování architektury pracovního systému
- Sloučení příběhových prací do běžných prací

## [1.0.0] - 2024-10-01

### Přidáno
- První vydání
- Pracovní systém s aktivitami
- Systém achievementů
- Žebříčky
- Voice funkce
