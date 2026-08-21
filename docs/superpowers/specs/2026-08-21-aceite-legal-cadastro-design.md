# Aceite legal obrigatório no cadastro

Data: 2026-08-21

## Problema

O cadastro em `handleCadastro` ([src/pages/Auth.tsx](../../../src/pages/Auth.tsx)) chama
`supabase.auth.signUp` direto, sem nenhum aceite de termos. O projeto não tem
Termos de Uso, Política de Privacidade nem Política de Cookies escritos, e o
rodapé da landing não linka documento nenhum.

A LGPD exige que o controlador consiga **provar** o consentimento. Um aceite
que só existe na tela, sem registro, não prova nada.

## Escopo

1. Modal de aceite que trava o cadastro até a pessoa rolar os três documentos
   até o fim e marcar a concordância.
2. Registro do aceite no banco, com a versão de cada documento.
3. Os três documentos escritos por extenso.
4. Páginas públicas `/termos`, `/privacidade` e `/cookies`, linkadas no rodapé.

Fora de escopo: banner de consentimento de cookies para visitante anônimo.

## Ressalva

O texto legal não foi escrito por advogado e não substitui revisão jurídica.
Cobre a estrutura que a LGPD pede e é melhor que a ausência atual, mas precisa
passar por alguém da área antes de valer como contrato.

## Arquitetura

### 1. Fonte única do texto — `src/lib/legal/documentos.ts`

Os três documentos como dados estruturados, não como JSX solto:

```ts
interface SecaoLegal { titulo: string; blocos: BlocoLegal[] }
interface DocumentoLegal {
  id: "termos" | "privacidade" | "cookies";
  titulo: string;
  versao: string;        // data ISO, ex.: "2026-08-21"
  atualizadoEm: string;  // exibição, ex.: "21 de agosto de 2026"
  resumo: string;
  secoes: SecaoLegal[];
}
```

O modal e as páginas públicas consomem a mesma fonte. Sem isso, o texto que a
pessoa aceita e o texto publicado divergem com o tempo.

`versao` é o que vai para o banco. Ao editar um documento de forma
substantiva, sobe-se a versão e o aceite antigo deixa de cobrir o novo texto.

### 2. Modal — `src/components/legal/ModalAceiteLegal.tsx`

Sobre o `Dialog` do shadcn. Os três documentos numa **rolagem contínua única**,
com sumário no topo e barra de progresso fixa.

Trava: o botão de concordar só habilita quando
`scrollTop + clientHeight >= scrollHeight - 8`.

Dois casos que quebram esse padrão e precisam de tratamento explícito:

- **Conteúdo menor que a janela.** Em tela grande não há o que rolar, o evento
  nunca dispara e a trava nunca abre — o cadastro fica impossível. Verificar no
  mount e a cada resize se `scrollHeight <= clientHeight + 8` e liberar já.
- **Teclado e leitor de tela.** Sem um botão "ir para o fim", quem não usa
  mouse não consegue concluir. O botão é requisito de acessibilidade, não
  conveniência.

Depois de liberado: um checkbox único cobrindo os três documentos, e só então
o botão de criar conta habilita.

### 3. Banco — `supabase/migrations/*_aceites_legais.sql`

```sql
public.aceites_legais (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  documento TEXT,   -- 'termos' | 'privacidade' | 'cookies'
  versao TEXT,
  aceito_em TIMESTAMPTZ,
  origem TEXT       -- 'cadastro'
)
```

Uma linha por documento. RLS: o dono lê o próprio, admin lê todos, ninguém faz
UPDATE nem DELETE — registro de consentimento que pode ser alterado depois não
serve como prova.

### 4. Gravação — trigger em `auth.users`

O cliente manda as versões aceitas em `signUp({ options: { data } })`, e um
trigger `AFTER INSERT ON auth.users` copia para `aceites_legais`.

Alternativa descartada: insert pelo cliente após o `signUp`. Quebra no fluxo de
confirmação por email, onde `data.session` volta nulo — sem sessão o RLS barra
o insert, e o aceite se perde justamente em quem ainda não confirmou.

Escrever pelo trigger também tira a gravação das mãos do cliente, então o
usuário não forja o próprio registro.

### 5. Páginas públicas

`PaginaLegal.tsx` renderiza qualquer `DocumentoLegal`. Rotas `/termos`,
`/privacidade` e `/cookies` em `App.tsx`, links no rodapé da landing.

## Fluxo

1. Pessoa preenche email e senha, clica em criar conta.
2. Validação de senha roda antes — não faz sentido obrigar a leitura para
   depois reprovar a senha.
3. Modal abre. Rolagem até o fim libera o checkbox.
4. Checkbox marcado, botão habilita.
5. `signUp` com as versões no metadata.
6. Trigger grava as três linhas.

## Verificação

- `npx tsc --noEmit` e `npm run build` limpos.
- Trava: botão desabilitado antes de rolar, habilitado depois.
- Caso da tela grande: conteúdo sem rolagem libera sozinho.
- Cancelar o modal não cria conta.
