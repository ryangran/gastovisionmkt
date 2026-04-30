# Gasto Vision Ecom — CLAUDE.md

## Visão Geral

Plataforma SaaS de calculadora de precificação para marketplaces brasileiros (Shopee, Mercado Livre, Amazon, Magalu, TikTok, Shein). Inclui também módulo de controle de estoque (StockBMS) com interface de chat para operações por comandos.

**Stack:** React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + Supabase (auth + DB + Edge Functions)

## Comandos

```bash
npm install       # instalar dependências
npm run dev       # servidor de desenvolvimento na porta 8080
npm run build     # build de produção
npm run lint      # verificar linting
npm run preview   # preview do build
```

## Estrutura de Pastas

```
src/
  pages/          # rotas da aplicação
  components/     # componentes reutilizáveis
  components/ui/  # shadcn/ui (não editar diretamente)
  hooks/          # hooks customizados
  integrations/supabase/  # cliente Supabase e tipos gerados
  lib/            # utilitários (cn, etc.)
public/           # arquivos estáticos
supabase/         # migrations e config do Supabase
```

## Variáveis de Ambiente

Copie `.env.example` para `.env` e preencha:

```env
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
VITE_ADMIN_EMAIL=<email-do-admin>
VITE_DELETE_PASSWORD=<senha-de-exclusao-de-produtos>
```

**NUNCA** commite o arquivo `.env` com valores reais.

## Rotas

| Rota           | Descrição                        | Proteção         |
|----------------|----------------------------------|------------------|
| `/`            | Landing page                     | Pública          |
| `/auth`        | Login                            | Pública          |
| `/calculadora` | Calculadora de marketplaces      | Auth + Compra    |
| `/admin-panel` | Gestão de usuários/planos        | Admin (email)    |
| `/admin`       | Controle de estoque (admin)      | Admin (role RPC) |
| `/supervisor`  | Aprovação de saídas              | Role supervisor  |

## Segurança

### Regras de ouro
- **Nunca expor credenciais no código-fonte** — sempre usar `import.meta.env.VITE_*`
- **Nunca comparar senhas no cliente** — usar RPC/Edge Function no Supabase
- **Mensagens de erro genéricas** — não revelar se email existe ou não
- **Rate limiting** — Auth.tsx tem bloqueio de 5 tentativas / 15 min
- **Verificação de role** — sempre usar `supabase.rpc("has_role", ...)` para proteger rotas admin, não apenas checar email

### Headers de segurança
Configurados em `index.html` (meta tags) e `vite.config.ts` (servidor dev):
- `Content-Security-Policy` — restringe origens de scripts e conexões
- `X-Frame-Options: DENY` — previne clickjacking
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

### Supabase RLS
Todas as tabelas devem ter Row Level Security habilitado. Verificar policies em `supabase/migrations/`.

## Arquitetura de Autenticação

1. Login via `supabase.auth.signInWithPassword`
2. Após login, valida purchase ativa na tabela `purchases`
3. Permissões de página via `user_page_permissions` (por email) ou `has_role` RPC (admin/supervisor)
4. `ProtectedRoute` encapsula páginas protegidas

## Módulo de Calculadora

- `src/pages/Calculadora.tsx` — arquivo grande (~147KB) com 4 implementações inline
- Cada marketplace tem suas próprias taxas, comissões e lógicas de frete
- Estado persistido em `sessionStorage` via `usePersistedState`

## Módulo de Estoque (StockBMS)

- Interface por chat (`ChatInterface.tsx`) — comandos em português natural
- Processamento primário via Edge Function `process-command` (IA)
- Fallback para pattern matching local quando IA indisponível
- Aprovação de saídas em produção exige supervisor via `useStockRequests`
- Senha de exclusão de produtos via `VITE_DELETE_PASSWORD` (env)

## Convenções

- Componentes em PascalCase, hooks com prefixo `use`
- Importações absolutas com `@/` (alias para `src/`)
- Tailwind CSS para estilos — evitar CSS inline
- `toast` via `sonner` para notificações
- Erros de Supabase: sempre loggar com `console.error` e exibir mensagem genérica ao usuário

## Ao Fazer Alterações

1. Sempre criar commit após cada mudança significativa
2. Não commitar `.env` ou chaves reais
3. Testar autenticação e permissões após mudanças nas rotas
4. Manter CSP atualizada se adicionar novos domínios externos
