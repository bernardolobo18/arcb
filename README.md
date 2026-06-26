# Registadora POS privada com PIN

Aplicacao web/PWA de registadora privada. O fluxo final e simples:

1. Abrir o link publicado.
2. Ver o ecra **Codigo da registadora**.
3. Inserir PIN de 4 digitos.
4. Entrar diretamente na caixa.
5. Clicar **Sair** para limpar a sessao local.

Nao existe login por email, password, magic link ou bloqueio por dispositivo.

## Seguranca

- O PIN nao esta hardcoded no frontend.
- O PIN e validado pela Supabase Edge Function `verify-pin`.
- A funcao compara o PIN recebido com `POS_PIN_HASH` + `POS_PIN_SALT`.
- A app guarda `localStorage.setItem("pos_pin_session", "true")` e um token de sessao aleatorio.
- As tabelas nao ficam abertas publicamente.
- A Edge Function `pos-state` valida o token antes de ler ou gravar dados.
- Ha limite de tentativas: 5 falhas por IP em 10 minutos.

## Ficheiros principais

- `src/components/PinLogin.tsx`: ecra do PIN.
- `src/utils/pinSession.js`: sessao local `pos_pin_session`.
- `src/utils/cloudStorage.js`: chamadas a Edge Function `pos-state`.
- `supabase/functions/verify-pin/index.ts`: valida PIN e cria token.
- `supabase/functions/pos-state/index.ts`: le/grava dados protegidos.
- `supabase/schema.sql`: tabelas cloud sem `authorized_devices`.
- `scripts/hash-pin.mjs`: gera salt/hash do PIN.

## Configurar Supabase

1. Abrir o projeto Supabase.
2. Ir a **SQL Editor**.
3. Executar o ficheiro:

```txt
supabase/schema.sql
```

Nota: este schema remove a tabela antiga `authorized_devices` e as funcoes antigas de dispositivo. Se ainda tiver dados antigos importantes, exporte antes.

## Gerar o hash do PIN

Escolha o PIN, por exemplo `1234`, e execute:

```bash
node scripts/hash-pin.mjs 1234
```

O comando devolve:

```txt
POS_PIN_SALT=...
POS_PIN_HASH=...
```

Guarde estes dois valores como segredos das Edge Functions.

## Configurar segredos das Edge Functions

No Supabase Dashboard:

1. Ir a **Project Settings > Edge Functions** ou **Functions > Secrets/Environment variables**.
2. Adicionar:

```txt
POS_PIN_SALT=o-salt-gerado
POS_PIN_HASH=o-hash-gerado
POS_SESSION_DAYS=365
```

O Supabase fornece automaticamente `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` nas Edge Functions.

Tambem pode configurar por CLI:

```bash
supabase secrets set POS_PIN_SALT=o-salt-gerado
supabase secrets set POS_PIN_HASH=o-hash-gerado
supabase secrets set POS_SESSION_DAYS=365
```

## Publicar Edge Functions

Com Supabase CLI:

```bash
supabase login
supabase link --project-ref ibetsigcotwdkpamfqzm
supabase functions deploy verify-pin
supabase functions deploy pos-state
```

## Variaveis da app

No ficheiro `.env` local e na Vercel, usar:

```txt
VITE_SUPABASE_URL=https://ibetsigcotwdkpamfqzm.supabase.co
VITE_SUPABASE_ANON_KEY=a-sua-anon-key
```

Importante: `VITE_SUPABASE_URL` deve ser o URL base do projeto, sem `/rest/v1/`.

## Publicar na Vercel

1. Subir o projeto para GitHub.
2. Na Vercel, importar o repositorio.
3. Framework: Vite.
4. Build command:

```bash
npm run build
```

5. Output directory:

```txt
dist
```

6. Em **Environment Variables**, adicionar:

```txt
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

7. Fazer novo deploy.

## Instalar como PWA

Depois de publicado em HTTPS:

- Chrome/Edge desktop: clicar no icone de instalar na barra de endereco.
- Android Chrome: menu > **Instalar aplicacao**.
- iPhone/iPad Safari: partilhar > **Adicionar ao ecra principal**.

## Referencias oficiais

- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Supabase Edge Function secrets: https://supabase.com/docs/guides/functions/secrets
- Supabase CORS em Edge Functions: https://supabase.com/docs/guides/functions/cors
- Deploy Edge Functions: https://supabase.com/docs/guides/functions/deploy
- Vercel + Vite: https://vercel.com/docs/frameworks/frontend/vite
