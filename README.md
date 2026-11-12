# PROJECT PARTY website

Run it:

    node server.js
    # open http://localhost:3000   (set PORT=8080 to change)

No npm install needed - it uses only Node.js built-ins (Node 16+).

## Customize
- Name/branding: search "PROJECT PARTY" in public/index.html and public/js/app.js
- Events: data/events.json
- Ticket tiers, prices, stock: data/tickets.json
- Colors/fonts: top of public/css/style.css (accent purple is --accent; display font is Cormorant Garamond)
- Gallery: drop photos/videos into public/gallery (auto-listed)
- Loading video: put intro.mp4 (or intro.webm) in public/media. Without it, a built-in neon laser animation plays.
- Orders/messages are saved to data/orders.json, data/support.json, data/subscribers.json
- Checkout is a demo reservation - add Stripe or similar for real payments.
