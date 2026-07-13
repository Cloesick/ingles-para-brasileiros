# 💶 Monetização: gratis + anúncios, Premium para o ponto de equilíbrio

Filosofia: o curso continua **100% gratuito para sempre**. Anúncios pagam o básico; o Premium
(compra única barata) cobre o resto e financia conteúdo novo.

**Nota:** este projeto é irmão das três versões de neerlandês, mas é um app e domínio
**completamente separados**. Nenhuma conta de Stripe/Supabase/AdSense/GA4 daquelas apps deve ser
reutilizada aqui (misturaria dados/tráfego não relacionado nos painéis) - cada conta/projeto abaixo
precisa ser criado especificamente para `ingles-para-brasileiros.vercel.app`.

## ✅ Já pronto no código
- `db/entitlements.sql`, `api/checkout.js`, `api/stripe-webhook.js`, `api/premium-status.js`
- Tela `#/premium` com lista de benefícios e botão de compra
- Espaço de anúncio (`adSlotHTML`) só aparece com AdSense configurado E usuário não-Premium
- Aviso de cookies com Google Consent Mode v2
- `config.js` — tudo em `null`/`false`, pronto para preencher

## 🔲 Passo 1 — Supabase
Crie um projeto **novo** em [supabase.com](https://supabase.com/dashboard) específico para esta
app, rode `db/entitlements.sql`, copie a Project URL e a service_role key.

## 🔲 Passo 2 — Stripe
Crie o produto "Inglês! Premium" (sugestão: € 4,99), copie Price ID, Secret key, e configure o
webhook para `https://ingles-para-brasileiros.vercel.app/api/stripe-webhook`.

## 🔲 Passo 3 — variáveis de ambiente na Vercel
`STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_URL`,
`SUPABASE_SERVICE_KEY`. Depois: `config.js` → `PREMIUM_ENABLED: true`.

## 🔲 Passo 4 — Google AdSense
Adicione `ingles-para-brasileiros.vercel.app` como site novo no AdSense, aguarde aprovação, crie um
bloco de anúncio, edite `config.js` com `ADSENSE_CLIENT`/`ADSENSE_SLOT`.

## 🔲 Passo 5 — Google Analytics 4 (opcional)
Crie uma propriedade **nova** específica para este site, retenção de dados em 2 meses, edite
`config.js` com `GA4_MEASUREMENT_ID`.

## 🔐 Segurança
O navegador nunca fala direto com Stripe/Supabase, só com `/api/*`. `api/checkout.js` usa uma lista
fixa de origens permitidas, não derivada de headers da requisição.
