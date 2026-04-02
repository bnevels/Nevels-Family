BUDGET PLANNER PREMIUM PLUS — NETLIFY READY

WHAT'S INCLUDED
- Installable budget app
- Insurance category built in
- Add unlimited extra billing as it arrives
- Searchable bill list
- Payment Center with per-bill pay link or global payment template
- Settings screen for API provider, base URL, and API key storage
- Export and import backup JSON
- Offline support after first load

IMPORTANT ABOUT PAYMENTS
This is a static Netlify-safe app.
It can OPEN payment links from inside the app, but it does not process card payments directly on its own.
To do true in-app payment processing, you would need a secure backend or payment provider integration.

NETLIFY DEPLOY
1. Open Netlify
2. Drag and drop this whole folder, or the zip contents, into Netlify
3. Wait for deploy
4. Open the live URL
5. In Chrome or Edge click Install App

LOCAL RUN
- Windows: double-click start_budget_app.bat
- Mac: run start_budget_app.command

PAYMENT LINK TEMPLATE TOKENS
You can use these in Settings > Global Payment Link Template:
{billId}
{amount}
{title}
{category}
{merchant}

Example:
https://pay.example.com?bill={billId}&amount={amount}&name={title}

FILES
index.html
styles.css
app.js
sw.js
manifest.json
icons/icon-192.png
icons/icon-512.png
start_budget_app.bat
start_budget_app.command
