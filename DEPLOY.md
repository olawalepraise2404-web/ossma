# Putting OSSMA online (no technical skills needed)

We use **GitHub** (stores the code) and **Render** (runs the website). Budget roughly $7-10 per month;
check Render's current pricing. The paid plan is needed so registrations are saved permanently.

## Part 1: Put the code on GitHub
1. Create a free account at github.com and sign in.
2. Click **+** (top right) > **New repository**. Name it `ossma`, choose **Private**, click **Create repository**.
3. Unzip `ossma-website.zip` on your computer.
4. On the new repository page click **uploading an existing file**. Open the unzipped `ossma` folder, select everything inside it
   (including the `public` and `lib` folders), drag it into the browser, then click **Commit changes**.
   Check that `server.js`, `package.json` and `render.yaml` are listed at the top level of the repository.

## Part 2: Run it on Render
1. Create an account at render.com (sign up with GitHub for ease).
2. Click **New +** > **Blueprint**, connect your GitHub, and pick the `ossma` repository.
3. Render reads `render.yaml`. When asked for **BASE_URL**, type your website address (e.g. `https://ossma.com`;
   if you don't have a domain yet, put the temporary `https://ossma.onrender.com` and fix it in Part 3).
4. Click **Apply** and wait for the build to finish (a few minutes). Open the web address Render shows you.
5. Test: go to `/verify?sticker_number=OD/JYW8DM`, serial `424076`.

## Part 3: Your own domain
1. In Render open the service > **Settings** > **Custom Domains** > add your domain and follow the DNS instructions it shows.
   Do this at the company where you bought the domain. HTTPS is set up automatically.
2. Then go to **Environment**, set **BASE_URL** to your real https address, and save.
   **Do this before generating QR codes**, because the address is printed on every sticker.

## Part 4: Go live with the real 10,005 stickers
1. In Render > **Environment**: change **SEED_ON_EMPTY** from `test` to `10005`.
2. In **Shell** (or Manual Deploy), clear the test data by running: `node seed.js --count 10005 --force`
   (only do this before any real owner has registered).
3. Download the print file in your browser:
   `https://YOUR-DOMAIN/admin/export.csv?key=YOUR_ADMIN_KEY`
   (Find ADMIN_KEY under **Environment**; keep it secret.) Use that CSV to make the QR codes.

## Backups
Render > your service > **Disks** > enable snapshots, and download the CSV above now and then.
