# Sistema Monitoraggio Olio - Vercel Preview

This project is configured for preview deployments on Vercel. The build is executed from the `sistema_monitoraggio_olio/app` directory.

## Environment variables
Set these variables in Vercel for both Preview and Production builds:

- DATABASE_URL
- AWARIO_API_KEY
- AWARIO_BASE_URL
- CRON_SECRET
- ABACUSAI_API_KEY
- NEXTAUTH_SECRET

## Deployment notes
- Root Vercel: `sistema_monitoraggio_olio/`
- Install command: `npm i --legacy-peer-deps`
- Build command: `npm run build`
- CI skips Prisma generate with `npm ci --ignore-scripts` and `PRISMA_SKIP_POSTINSTALL_GENERATE=1`; on Vercel the client is generated via `postinstall`
- Optional: if the Prisma CDN returns 403 in Preview, set `PRISMA_ENGINES_MIRROR=https://prisma-builds.s3.us-east-1.amazonaws.com`
