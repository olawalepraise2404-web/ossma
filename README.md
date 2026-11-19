# OSSMA - Ondo State Signage and Mobile Advertisement

    npm install
    cp .env.example .env         # set BASE_URL and a long random ADMIN_KEY
    npm run seed                 # 10 test stickers (see below)
    npm start                    # http://localhost:3000

## Test stickers
`npm run seed` wipes and loads 10 stickers and prints them. Two are fixed:

| Sticker ID | Serial | Purpose |
|---|---|---|
| OD/JYW8DM | 424076 | unregistered: verify, then fill the registration form |
| OD/TEST02 | 111222 | pre-registered demo vehicle: shows the "valid sticker" screen |

Try http://localhost:3000/verify?sticker_number=OD/JYW8DM. The other 8 have random serials (printed by the seed command).
Re-run `npm run seed` to reset the test data.

## Scaling up
    npm run seed:prod                  # wipe + generate 10,005 (refuses if any sticker is registered)
    npm run seed:add -- 5000           # append more without touching existing rows
    node seed.js --count 500 --force --out batch.csv   # custom size, plus a CSV of what was generated

Generation logic lives in `lib/stickers.js` and is reusable.

## QR print CSV
    curl -H "x-admin-key: $ADMIN_KEY" https://your-domain/admin/export.csv -o ossma-stickers.csv

Put the official crest at `public/img/ondo-crest.png`. Serve over HTTPS; `node --env-file=.env server.js` loads env on Node 20+.
