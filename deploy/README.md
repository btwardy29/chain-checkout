# Production Deploy Notes

This setup is for a single VPS running Docker Compose, with Nginx installed on the host.

## First Deploy

Create the production env file on the VPS:

```bash
cp .env.production.example .env.production
nano .env.production
```

For the domain deploy, keep these values pointed at the public app origin:

```env
CORS_ORIGIN="https://chain-checkout.twardy.dev"
NEXT_PUBLIC_API_URL="https://chain-checkout.twardy.dev"
```

Build and start the database and cache first:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d postgres redis
```

Run Prisma migrations:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm api pnpm --filter @chain-checkout/api db:deploy
```

Start the application:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

## Nginx

Install the domain Nginx config:

```bash
cp deploy/nginx/chain-checkout-domain.conf /etc/nginx/sites-available/chain-checkout
ln -s /etc/nginx/sites-available/chain-checkout /etc/nginx/sites-enabled/chain-checkout
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

Issue a Let's Encrypt certificate:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d chain-checkout.twardy.dev
```

The host Nginx routes:

- `https://chain-checkout.twardy.dev/` to the web container on `127.0.0.1:3000`
- `https://chain-checkout.twardy.dev/api/` to the API container on `127.0.0.1:4000`

## Useful Commands

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f api
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f worker
docker compose --env-file .env.production -f docker-compose.prod.yml down
```
