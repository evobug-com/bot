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


## Unreleased

<!-- commits after XXX -->


## [2.8.2] - 2026-03-30

### Přidáno
- Mickle Voice Counter — nový voice kanál zobrazující počet aktivních uživatelů v hlasových místnostech Mickle (např. `Mickle-Voice:3`)
- Automatická aktualizace každých 5 minut přes LiveKit Server API
- Kanál se vytvoří automaticky při startu bota (view-only, nelze se připojit)


## [2.8.1] - 2026-03-04

### Přidáno
- Admin AI — admini mohou zmínit bota s přirozeným jazykem (např. `@bot přidej novou místnost do kategorie XY`) a Claude interpretuje požadavek a navrhne akce
- Potvrzovací krok před provedením akcí (preview embed + tlačítka Potvrdit/Zrušit)
- Podporované operace: vytvoření kanálu, přejmenování, přesunutí, nastavení oprávnění
- Příkaz `/story` omezen pouze na adminy (testovací fáze)

### Opraveno
- Příběhy se předčasně ukončovaly po prvním rozhodnutí — chybělo druhé rozhodnutí a/nebo druhý hod kostkou
- Všech 22 hardcoded příběhů opraveno tak, aby vždy procházely kompletní cestou: úvod → rozhodnutí 1 → hod 1 → rozhodnutí 2 → hod 2 → závěr
- Přidána validace do `validateStory()` pro detekci zkratkových cest (outcome→terminal, decision→terminal)


## [2.8.0] - 2026-02-28

### Změněno
- Kombinatorický systém "Story DNA" pro AI příběhy — náhodná kombinace prostředí (25), zápletky (20) a role postavy (25) = 12 500 unikátních kombinací místo opakujících se témat
- AI příběhy nyní musí povinně zapracovat náhodná slova do děje (min. 5 podstatných jmen, 1 sloveso) místo volitelné "inspirace"
- Pokračovací vrstvy příběhu (Layer 2, 3) nyní mají instrukci dodržovat prostředí a tón prvního dílu

### Opraveno
- Opakující se témata AI příběhů (vždy vesmírní králíci apod.) — model nyní dostává konkrétní zadání místo vágního "buď originální"


## [2.7.0] - 2025-01-17

### Přidáno
- Ticket systém pro podporu - uživatelé mohou vytvářet dočasné privátní kanály pro žádosti o podporu
- Příkaz `/send-ticket-button` pro administrátory k nasazení tlačítka pro vytvoření ticketu
- Automatické nastavení oprávnění: tvůrce ticketu + moderátoři mají přístup
- Tlačítko "Zavřít Ticket" s 5 sekundovým odpočtem před smazáním kanálu

### Opraveno
- Částečně verifikovaní uživatelé nyní mají přístup k dočasným hlasovým kanálům

### Změněno
- Oznámení o streamu nyní používá roli `@Twitch Notifikace` místo `@here` - uživatelé mohou odebráním role zrušit notifikace


## [2.6.2] - 2025-01-17

### Přidáno
- Vizuální zpětná vazba při zpracování volby v příběhu - tlačítka se ihned deaktivují s ikonou ⏳ na zvoleném tlačítku
- Mechanismus obnovení příběhu po vypršení Discord tlačítek - při spuštění `/story` s rozpracovaným příběhem se zobrazí možnost pokračovat nebo začít nový
- Podpora obnovení příběhu po restartu botu - sessions se ukládají do SQLite a lze je obnovit

### Změněno
- Vylepšeny AI prompty pro generování příběhů s pravidly narativní koherence:
  - Volby musí být akční slovesné fráze přímo reagující na situaci
  - Výsledky musí logicky vyplývat ze zvolené akce (příčina-následek)
  - Závěry musí odkazovat na cestu hráče a být uspokojivé

### Opraveno
- Příběhy již neukazují nesouvisející volby (např. "Koupit zmrzlinu" když jde o podezřelý balíček)
- Výsledky voleb nyní správně popisují co se stalo při pokusu o zvolenou akci
- Tlačítka příběhu nyní okamžitě reagují na kliknutí místo čekání na AI generování
- Opravena duplikace textu v souhrnu příběhu - výsledek hodu se již nezobrazuje dvakrát


## [2.6.1] - 2025-01-15

### Opraveno
- Změněn model pro generování obrázků z `gemini-2.5-flash-image-preview` na `gemini-2.5-flash-image` (původní endpoint již nefungoval)


## [2.6.0] - 2025-01-08

<!-- commits 0affe67..4cb28f5 -->

### Přidáno
- Náhodná slova a personalizace uživatelů pro AI příběhy - příběhy jsou nyní rozmanitější
- Databáze 1000 českých podstatných jmen a 100 sloves pro inspiraci příběhů
- Soubor `data/story-members.txt` pro přidání faktů o uživatelích do příběhů

### Změněno
- Různé šance úspěchu pro kroky AI příběhů (50% první krok, 75% druhý)
- Odměny za AI příběhy nyní určuje kód místo LLM (konzistentnější)
- Při spuštění AI příběhu se zobrazuje "🤖 AI Příběh" místo nesouvisející aktivity
- Mírně upraveny AI prompty pro příběhy

### Opraveno
- Chyba "InteractionAlreadyReplied" - nyní se automaticky vygeneruje nový příběh
- Opakované klikání na tlačítka při generování AI příběhu - nyní zablokováno s upozorněním
- Poškození stavu session při selhání generování vrstvy - nyní se automaticky vrátí zpět
- AI generování nyní zkouší až 3x při dočasném selhání a normalizuje hodnoty do platných rozsahů
- Snížen spam v logu při opakovaných pokusech o generování obrázků
- Některé achievementy byly nesprávně vypnuté od 25 .prosince - nyní opraveno

### Odstraněno
- Nepoužívané soubory

## [2.5.0] - 2024-12-26

### Přidáno
- Dockerfile a GitHub Actions workflow pro sestavení Docker obrazů
- CHANGELOG.MD pro sledování aktualizací bota (a v češtině!)

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
