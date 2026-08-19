# Vetrex — Ecossistema de Precificação: Plano de Implementação

> **Para executores agênticos:** SUB-SKILL OBRIGATÓRIA: usar `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para implementar tarefa a tarefa. Os passos usam checkbox (`- [ ]`).

**Goal:** Transformar a calculadora Vetrex num painel de precificação com dashboard, comparador entre marketplaces, precificação reversa, calculadora de ads e taxas administráveis pelo banco.

**Architecture:** A matemática das 6 plataformas hoje vive dentro dos componentes de UI em `src/pages/Calculadora.tsx` (~3.000 linhas). Ela é extraída para módulos puros em `src/lib/pricing/`, cada um exportando uma função `calcular<Plataforma>(input, taxas)` sem dependência de React. Todas as features novas (comparador, reversa, ads, recálculo por mudança de taxa) consomem essas mesmas funções — sem essa extração, cada uma duplicaria a lógica. As funções recebem a tabela de taxas como parâmetro opcional desde o início, o que permite trocar a fonte (constante no código → linha no Supabase) na Fase 6 sem reescrever nada.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind, shadcn/ui, Supabase (Postgres + RLS + Edge Functions), Recharts (já em `package.json`), Vitest (a instalar).

## Global Constraints

- Marca: **Vetrex**. Nunca "Gasto Vision". Cores só via tokens (`text-primary`, `bg-card`), nunca hex inline.
- Tema escuro é o padrão e a identidade principal; toda tela nova funciona nos dois temas.
- Logos de marketplace sempre via `<MarketplaceLogo platform="..." />`, nunca importando o PNG direto.
- Textos de UI em português do Brasil. Sem jargão de IA, sem emoji decorativo, sem exclamação em texto de interface.
- Toda tabela nova no Supabase nasce com RLS habilitado e policies por `user_email`.
- Dinheiro em `NUMERIC` no banco e `number` em TS; formatação só na borda de UI via `formatCurrency`.
- Importações absolutas com `@/`.
- Commit após cada tarefa concluída.

---

## Estrutura de Arquivos

**Criar:**

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/pricing/types.ts` | Tipos compartilhados: `PlatformKey`, `PricingResult`, inputs por plataforma |
| `src/lib/pricing/shopee.ts` | Tabela de comissão Shopee + `calcularShopee` |
| `src/lib/pricing/mercadolivre.ts` | Tabelas ML + `calcularMercadoLivre` |
| `src/lib/pricing/amazon.ts` | Tabelas Amazon + `calcularAmazon` |
| `src/lib/pricing/magalu.ts` | Tabelas Magalu + `calcularMagalu` |
| `src/lib/pricing/tiktok.ts` | Tabelas TikTok + `calcularTikTok` |
| `src/lib/pricing/shein.ts` | Tabelas Shein + `calcularShein` |
| `src/lib/pricing/index.ts` | Registro `CALCULADORAS` e `calcular(platform, input)` |
| `src/lib/pricing/reverse.ts` | `precoParaMargem` — resolve preço dado alvo de margem |
| `src/lib/pricing/ads.ts` | `roasEquilibrio`, `recomendarRoas` |
| `src/lib/pricing/*.test.ts` | Testes unitários por módulo |
| `src/components/layout/AppSidebar.tsx` | Navegação lateral |
| `src/components/layout/AppShell.tsx` | Casca: sidebar + topo + `<Outlet />` |
| `src/components/MargemSlider.tsx` | Slider de margem alvo (0–50%) |
| `src/components/SalvarProdutoDialog.tsx` | Modal de salvar com quantidade em estoque |
| `src/pages/Dashboard.tsx` | Painel do seller |
| `src/pages/Comparador.tsx` | Comparação entre as 6 plataformas |
| `src/pages/CalculadoraAds.tsx` | ROAS de equilíbrio e recomendação |
| `src/lib/carteira.ts` | Agregação pura da carteira |
| `src/hooks/useCarteira.ts` | Leitura de `saved_calculations` + agregados |

**Modificar:**

| Arquivo | Mudança |
|---|---|
| `src/pages/Calculadora.tsx` | Passa a consumir `src/lib/pricing`; ganha slider de reversa |
| `src/hooks/useSavedCalculations.ts` | Salva `inputs` completos, `stock_quantity`, `fee_version` |
| `src/App.tsx` | Rotas novas sob `AppShell` |
| `package.json` | Scripts e dependências de teste |

---

## Fase 1 — Fundação: testes, matemática pura e schema

### Task 1: Infraestrutura de teste

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

**Interfaces:**
- Produces: comando `npm test`, usado por todas as tarefas seguintes.

- [ ] **Passo 1: Instalar o Vitest**

```bash
npm install -D vitest@^2.1.8
```

- [ ] **Passo 2: Criar `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Passo 3: Adicionar os scripts em `package.json`**

Dentro de `"scripts"`, após `"lint"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Passo 4: Verificar que roda**

Run: `npm test`
Expected: `No test files found`. Confirma que o Vitest está instalado e configurado.

- [ ] **Passo 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: adiciona Vitest para testar a matemática de precificação"
```

---

### Task 2: Tipos compartilhados de precificação

**Files:**
- Create: `src/lib/pricing/types.ts`

**Interfaces:**
- Produces: `PlatformKey`, `PLATFORM_LABELS`, `LinhaDetalhe`, `BaseInput`, `PricingResult`, `RESULTADO_VAZIO` — consumidos pelas Tasks 3–15.

- [ ] **Passo 1: Criar `src/lib/pricing/types.ts`**

```ts
export type PlatformKey =
  | "shopee"
  | "mercadolivre"
  | "amazon"
  | "magalu"
  | "tiktok"
  | "shein";

export const PLATFORM_LABELS: Record<PlatformKey, string> = {
  shopee: "Shopee",
  mercadolivre: "Mercado Livre",
  amazon: "Amazon",
  magalu: "Magalu",
  tiktok: "TikTok Shop",
  shein: "Shein",
};

/** Uma linha da composição do preço, para mostrar de onde saiu o número. */
export interface LinhaDetalhe {
  label: string;
  valor: number;
  /** true quando o valor soma na receita (ex.: subsídio Pix). */
  credito?: boolean;
}

/** Campos que toda plataforma consome. */
export interface BaseInput {
  precoVenda: number;
  custoProduto: number;
  impostoPercent: number;
  marketingPercent: number;
}

export interface PricingResult {
  precoVenda: number;
  custoProduto: number;
  valorComissao: number;
  valorImposto: number;
  valorMarketing: number;
  valorFrete: number;
  subsidio: number;
  receitaLiquida: number;
  lucro: number;
  /** Margem sobre o preço de venda, em pontos percentuais (18.5 = 18,5%). */
  margemPercent: number;
  lucrativo: boolean;
  detalhes: LinhaDetalhe[];
}

/** Resultado neutro, devolvido quando o preço ainda não foi informado. */
export const RESULTADO_VAZIO: PricingResult = {
  precoVenda: 0,
  custoProduto: 0,
  valorComissao: 0,
  valorImposto: 0,
  valorMarketing: 0,
  valorFrete: 0,
  subsidio: 0,
  receitaLiquida: 0,
  lucro: 0,
  margemPercent: 0,
  lucrativo: false,
  detalhes: [],
};
```

- [ ] **Passo 2: Verificar que compila**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: sem saída, exit code 0.

- [ ] **Passo 3: Commit**

```bash
git add src/lib/pricing/types.ts
git commit -m "feat: tipos compartilhados de precificação"
```

---

### Task 3: Extrair a matemática da Shopee

A Shopee vem primeiro porque tem a regra mais irregular (abaixo de R$8 a taxa fixa vira percentual do item) e serve de molde para as outras cinco.

**Files:**
- Create: `src/lib/pricing/shopee.ts`
- Create: `src/lib/pricing/shopee.test.ts`
- Modify: `src/pages/Calculadora.tsx` — remover `ShopeeComissao`, `SHOPEE_COMISSOES`, `getShopeeComissao` e `getShopeeTaxaFixa` (linhas 25–50) e o cálculo inline do componente `ShopeeCalculadora`

**Interfaces:**
- Consumes: `BaseInput`, `LinhaDetalhe`, `PricingResult`, `RESULTADO_VAZIO` (Task 2).
- Produces:
  - `interface ShopeeFaixa { max; percentual; fixo; fixoPercentual?; subsidioPix }`
  - `type ShopeeTaxas = ShopeeFaixa[]`
  - `SHOPEE_TAXAS: ShopeeTaxas`
  - `faixaShopee(preco: number, taxas?: ShopeeTaxas): ShopeeFaixa`
  - `interface ShopeeInput extends BaseInput { usarSubsidioPix: boolean }`
  - `calcularShopee(input: ShopeeInput, taxas?: ShopeeTaxas): PricingResult`

- [ ] **Passo 1: Escrever o teste que falha**

Criar `src/lib/pricing/shopee.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { calcularShopee } from "./shopee";

const base = {
  custoProduto: 40,
  impostoPercent: 0,
  marketingPercent: 0,
  usarSubsidioPix: false,
};

describe("calcularShopee", () => {
  it("aplica 14% + R$20 fixo na faixa de R$100 a R$199,99", () => {
    const r = calcularShopee({ ...base, precoVenda: 100 });
    // 100 * 0,14 = 14 de comissão + 20 de taxa fixa = 34
    expect(r.valorComissao).toBeCloseTo(34, 2);
    expect(r.receitaLiquida).toBeCloseTo(66, 2);
    expect(r.lucro).toBeCloseTo(26, 2);
    expect(r.margemPercent).toBeCloseTo(26, 2);
    expect(r.lucrativo).toBe(true);
  });

  it("cobra a taxa fixa como 50% do item abaixo de R$8", () => {
    const r = calcularShopee({ ...base, precoVenda: 5, custoProduto: 1 });
    // 5 * 0,20 = 1 de comissão + 5 * 0,5 = 2,50 de taxa fixa = 3,50
    expect(r.valorComissao).toBeCloseTo(3.5, 2);
  });

  it("usa a faixa de R$79,99 no limite exato da fronteira", () => {
    const r = calcularShopee({ ...base, precoVenda: 79.99, custoProduto: 10 });
    // 79,99 * 0,20 = 15,998 + 4 de taxa fixa
    expect(r.valorComissao).toBeCloseTo(19.998, 2);
  });

  it("soma o subsídio Pix como crédito, não como desconto", () => {
    const semPix = calcularShopee({ ...base, precoVenda: 150, custoProduto: 50 });
    const comPix = calcularShopee({
      ...base, precoVenda: 150, custoProduto: 50, usarSubsidioPix: true,
    });
    expect(comPix.subsidio).toBeCloseTo(7.5, 2); // 150 * 0,05
    expect(comPix.lucro).toBeCloseTo(semPix.lucro + 7.5, 2);
  });

  it("desconta imposto e marketing sobre o preço de venda", () => {
    const r = calcularShopee({
      ...base, precoVenda: 100, custoProduto: 30,
      impostoPercent: 10, marketingPercent: 5,
    });
    expect(r.valorImposto).toBeCloseTo(10, 2);
    expect(r.valorMarketing).toBeCloseTo(5, 2);
  });

  it("marca como não lucrativo quando o custo supera a receita líquida", () => {
    const r = calcularShopee({ ...base, precoVenda: 100, custoProduto: 90 });
    expect(r.lucrativo).toBe(false);
    expect(r.lucro).toBeLessThan(0);
  });

  it("devolve resultado zerado quando o preço é zero", () => {
    const r = calcularShopee({ ...base, precoVenda: 0, custoProduto: 0 });
    expect(r.margemPercent).toBe(0);
    expect(r.valorComissao).toBe(0);
    expect(Number.isNaN(r.margemPercent)).toBe(false);
  });
});
```

- [ ] **Passo 2: Rodar o teste e confirmar a falha**

Run: `npx vitest run src/lib/pricing/shopee.test.ts`
Expected: FAIL — `Failed to resolve import "./shopee"`.

- [ ] **Passo 3: Criar `src/lib/pricing/shopee.ts`**

As constantes vêm de `src/pages/Calculadora.tsx:25-50` **sem alteração de valores**. O cálculo replica exatamente `src/pages/Calculadora.tsx:75-88`.

```ts
import type { BaseInput, LinhaDetalhe, PricingResult } from "./types";
import { RESULTADO_VAZIO } from "./types";

export interface ShopeeFaixa {
  max: number;
  percentual: number;
  fixo: number;
  /** Taxa fixa como percentual do item, usada na faixa abaixo de R$8. */
  fixoPercentual?: number;
  subsidioPix: number;
}

export type ShopeeTaxas = ShopeeFaixa[];

export const SHOPEE_TAXAS: ShopeeTaxas = [
  { max: 7.99, percentual: 0.2, fixo: 0, fixoPercentual: 0.5, subsidioPix: 0 },
  { max: 79.99, percentual: 0.2, fixo: 4, subsidioPix: 0 },
  { max: 99.99, percentual: 0.14, fixo: 16, subsidioPix: 0.05 },
  { max: 199.99, percentual: 0.14, fixo: 20, subsidioPix: 0.05 },
  { max: 499.99, percentual: 0.14, fixo: 26, subsidioPix: 0.05 },
  { max: Infinity, percentual: 0.14, fixo: 26, subsidioPix: 0.08 },
];

export function faixaShopee(preco: number, taxas: ShopeeTaxas = SHOPEE_TAXAS): ShopeeFaixa {
  return taxas.find((f) => preco <= f.max) ?? taxas[taxas.length - 1];
}

function taxaFixaShopee(faixa: ShopeeFaixa, preco: number): number {
  return faixa.fixoPercentual ? preco * faixa.fixoPercentual : faixa.fixo;
}

export interface ShopeeInput extends BaseInput {
  usarSubsidioPix: boolean;
}

export function calcularShopee(
  input: ShopeeInput,
  taxas: ShopeeTaxas = SHOPEE_TAXAS,
): PricingResult {
  const { precoVenda: preco, custoProduto: custo, impostoPercent, marketingPercent } = input;
  if (preco <= 0) return { ...RESULTADO_VAZIO, custoProduto: custo };

  const faixa = faixaShopee(preco, taxas);
  const valorComissao = preco * faixa.percentual + taxaFixaShopee(faixa, preco);
  const valorImposto = preco * (impostoPercent / 100);
  const valorMarketing = preco * (marketingPercent / 100);
  const subsidio = input.usarSubsidioPix ? preco * faixa.subsidioPix : 0;

  const receitaLiquida = preco + subsidio - valorComissao - valorImposto - valorMarketing;
  const lucro = receitaLiquida - custo;

  const detalhes: LinhaDetalhe[] = [
    { label: "Preço de venda", valor: preco, credito: true },
    { label: `Comissão (${(faixa.percentual * 100).toFixed(0)}% + fixo)`, valor: valorComissao },
    { label: "Imposto", valor: valorImposto },
    { label: "Marketing", valor: valorMarketing },
    { label: "Subsídio Pix", valor: subsidio, credito: true },
    { label: "Custo do produto", valor: custo },
  ].filter((l) => l.valor !== 0);

  return {
    precoVenda: preco,
    custoProduto: custo,
    valorComissao,
    valorImposto,
    valorMarketing,
    valorFrete: 0,
    subsidio,
    receitaLiquida,
    lucro,
    margemPercent: (lucro / preco) * 100,
    lucrativo: lucro > 0,
    detalhes,
  };
}
```

- [ ] **Passo 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/lib/pricing/shopee.test.ts`
Expected: PASS, 7 testes.

- [ ] **Passo 5: Ligar a UI da Shopee ao módulo**

Em `src/pages/Calculadora.tsx`, importar:

```ts
import { calcularShopee, faixaShopee } from "@/lib/pricing/shopee";
```

Substituir o bloco de derivação do componente `ShopeeCalculadora` (de `const comissao = ...` até `const isLucrativo = ...`) por:

```ts
const resultado = calcularShopee({
  precoVenda: preco,
  custoProduto: custo,
  impostoPercent: impostoPerc,
  marketingPercent: usarMarketing ? marketingPerc : 0,
  usarSubsidioPix,
});
const { valorComissao, valorImposto, valorMarketing, subsidio, receitaLiquida, lucro } = resultado;
const margemLucro = resultado.margemPercent;
const isLucrativo = resultado.lucrativo;
const comissao = preco > 0 ? faixaShopee(preco) : null;
```

- [ ] **Passo 6: Verificar que a UI segue idêntica**

Run: `npm run build` — Expected: build OK.
Run: `npx tsc --noEmit -p tsconfig.app.json` — Expected: exit 0.

Conferir na tela: aba Shopee com preço 100 e custo 40 deve mostrar margem 26%. Divergência aqui significa que a extração alterou comportamento — corrigir antes do commit.

- [ ] **Passo 7: Commit**

```bash
git add src/lib/pricing/ src/pages/Calculadora.tsx
git commit -m "refactor: extrai a matemática da Shopee para módulo puro testado"
```

---

### Task 4: Extrair as outras cinco plataformas

Mesma mecânica da Task 3, **uma plataforma por vez, com commit entre cada uma**. Repetir o ciclo completo: teste falhando → módulo → teste passando → ligar a UI → conferir na tela → commit.

Os limites exatos de cada componente em `src/pages/Calculadora.tsx`, e os campos extras que o input precisa carregar além de `BaseInput` (levantados a partir dos `usePersistedState` de cada um):

| Plataforma | Componente (linhas) | Módulo | Campos extras no input |
|---|---|---|---|
| Amazon | `AmazonCalculadora`, 629–1225 | `amazon.ts` | `categoria`, `modelo: AmazonModelo`, `dbaZona: AmazonDBAZona` |
| Magalu | `MagaluCalculadora`, 1226–1727 | `magalu.ts` | `tipoProduto: MagaluTipoProduto`, `descontoFrete: MagaluDescontoFrete`, `pesoKg`, `comprimento`, `largura`, `altura`, `taxaFixa`, `usarFrete` |
| Mercado Livre | `MercadoLivreCalculadora`, 1728–2258 | `mercadolivre.ts` | `tipoAnuncio: "classico" \| "premium"`, `produto`, `categorias: MLProduto[]`, `pesoKg`, `usarFrete` |
| TikTok | `TikTokCalculadora`, 2259–2559 | `tiktok.ts` | `freteGratis`, `incentivoComissao` |
| Shein | `SheinCalculadora`, 2560–2871 | `shein.ts` | `pesoKg`, `comprimento`, `largura`, `altura` |

Conferir a lista contra os `usePersistedState` do componente antes de escrever o tipo — a tabela acima foi levantada pelas chaves `calc_<plataforma>_*` e chave nova acrescentada depois deste plano não estará aqui.

Cada módulo exporta, no mesmo padrão da Shopee — os quatro nomes são exigidos pelo registro da Task 5:

1. `type <Plataforma>Taxas` — o formato da tabela de taxas
2. `<PLATAFORMA>_TAXAS: <Plataforma>Taxas` — a tabela padrão
3. `interface <Plataforma>Input extends BaseInput` — com os campos extras da coluna acima
4. `calcular<Plataforma>(input: <Plataforma>Input, taxas?: <Plataforma>Taxas): PricingResult`

**Regra que não pode ser violada:** valores de tabela e fórmulas são copiados sem alteração. Esta tarefa é refactor puro — nenhum número muda. Se durante a extração aparecer o que parece ser um erro na fórmula atual, **reportar e parar**, não corrigir em silêncio: mudar um número aqui muda o preço que o cliente cobra.

Testes mínimos por plataforma:
1. caso de faixa/categoria intermediária, com números conferidos à mão;
2. fronteira exata entre duas faixas (preço igual ao `max`);
3. imposto e marketing descontados corretamente;
4. cenário de prejuízo (`lucrativo === false`);
5. preço zero devolvendo resultado neutro sem `NaN`.

- [ ] Mercado Livre extraído, testado e commitado
- [ ] Amazon extraída, testada e commitada
- [ ] Magalu extraída, testada e commitada
- [ ] TikTok extraído, testado e commitado
- [ ] Shein extraída, testada e commitada

---

### Task 5: Registro unificado

**Files:**
- Create: `src/lib/pricing/index.ts`
- Create: `src/lib/pricing/index.test.ts`

**Interfaces:**
- Consumes: as seis funções `calcular*` (Tasks 3–4).
- Produces:
  - `PLATFORM_KEYS: PlatformKey[]`
  - `interface PlatformInputMap` — mapa de `PlatformKey` para o input daquela plataforma
  - `interface PlatformTaxasMap` — mapa de `PlatformKey` para o tipo de tabela de taxas daquela plataforma
  - `calcular<K extends PlatformKey>(platform: K, input: PlatformInputMap[K], taxas?: PlatformTaxasMap[K]): PricingResult`

O parâmetro `taxas` é opcional e fica sem uso até a Fase 6. Ele entra na assinatura agora, e não depois, porque incluí-lo mais tarde obrigaria a mexer em todos os pontos de chamada criados nas Fases 2 a 5.

- [ ] **Passo 1: Escrever o teste que falha**

```ts
import { describe, it, expect } from "vitest";
import { calcular, PLATFORM_KEYS } from "./index";

describe("calcular", () => {
  it("expõe as seis plataformas", () => {
    expect(PLATFORM_KEYS).toHaveLength(6);
  });

  it("despacha para a calculadora da plataforma pedida", () => {
    const r = calcular("shopee", {
      precoVenda: 100, custoProduto: 40, impostoPercent: 0,
      marketingPercent: 0, usarSubsidioPix: false,
    });
    expect(r.valorComissao).toBeCloseTo(34, 2);
  });

  it("nunca devolve margem NaN, qualquer que seja a plataforma", () => {
    for (const key of PLATFORM_KEYS) {
      const r = calcular(key, {
        precoVenda: 0, custoProduto: 0, impostoPercent: 0, marketingPercent: 0,
      } as never);
      expect(Number.isNaN(r.margemPercent)).toBe(false);
    }
  });
});
```

- [ ] **Passo 2: Rodar e confirmar a falha**

Run: `npx vitest run src/lib/pricing/index.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Passo 3: Implementar o registro**

```ts
import type { PlatformKey, PricingResult } from "./types";
import { calcularShopee, type ShopeeInput, type ShopeeTaxas } from "./shopee";
import { calcularMercadoLivre, type MercadoLivreInput, type MercadoLivreTaxas } from "./mercadolivre";
import { calcularAmazon, type AmazonInput, type AmazonTaxas } from "./amazon";
import { calcularMagalu, type MagaluInput, type MagaluTaxas } from "./magalu";
import { calcularTikTok, type TikTokInput, type TikTokTaxas } from "./tiktok";
import { calcularShein, type SheinInput, type SheinTaxas } from "./shein";

export * from "./types";

export interface PlatformInputMap {
  shopee: ShopeeInput;
  mercadolivre: MercadoLivreInput;
  amazon: AmazonInput;
  magalu: MagaluInput;
  tiktok: TikTokInput;
  shein: SheinInput;
}

export interface PlatformTaxasMap {
  shopee: ShopeeTaxas;
  mercadolivre: MercadoLivreTaxas;
  amazon: AmazonTaxas;
  magalu: MagaluTaxas;
  tiktok: TikTokTaxas;
  shein: SheinTaxas;
}

export const PLATFORM_KEYS: PlatformKey[] = [
  "shopee", "mercadolivre", "amazon", "magalu", "tiktok", "shein",
];

const CALCULADORAS = {
  shopee: calcularShopee,
  mercadolivre: calcularMercadoLivre,
  amazon: calcularAmazon,
  magalu: calcularMagalu,
  tiktok: calcularTikTok,
  shein: calcularShein,
} as const;

export function calcular<K extends PlatformKey>(
  platform: K,
  input: PlatformInputMap[K],
  taxas?: PlatformTaxasMap[K],
): PricingResult {
  const fn = CALCULADORAS[platform] as (
    i: PlatformInputMap[K],
    t?: PlatformTaxasMap[K],
  ) => PricingResult;
  return fn(input, taxas);
}
```

- [ ] **Passo 4: Rodar e confirmar que passa**

Run: `npm test`
Expected: PASS em todos os arquivos.

- [ ] **Passo 5: Commit**

```bash
git add src/lib/pricing/index.ts src/lib/pricing/index.test.ts
git commit -m "feat: registro unificado das calculadoras de precificação"
```

---

### Task 6: Schema — inputs completos e estoque

Hoje `saved_calculations` guarda só preço, custo e margem. Sem os inputs, nenhum produto salvo pode ser recalculado quando a taxa mudar — e é exatamente isso que trava o aviso da Fase 6.

**Files:**
- Create: `supabase/migrations/<timestamp>_saved_calculations_inputs_estoque.sql`
- Modify: `src/hooks/useSavedCalculations.ts`
- Modify: `src/integrations/supabase/types.ts`

**Interfaces:**
- Produces: colunas `inputs`, `stock_quantity`, `fee_version`, `updated_at`; `SaveCalcData` com `inputs` e `stock_quantity`.

- [ ] **Passo 1: Escrever a migration**

Nome no padrão dos existentes (`YYYYMMDDHHMMSS_...`).

```sql
ALTER TABLE public.saved_calculations
  ADD COLUMN IF NOT EXISTS inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_version TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

ALTER TABLE public.saved_calculations
  ADD CONSTRAINT saved_calculations_stock_quantity_nao_negativo
  CHECK (stock_quantity >= 0);

COMMENT ON COLUMN public.saved_calculations.inputs IS
  'Entradas completas da calculadora, para permitir recálculo quando a taxa mudar.';

CREATE INDEX IF NOT EXISTS saved_calculations_user_email_idx
  ON public.saved_calculations (user_email);

CREATE POLICY "Users can update own saved calculations"
  ON public.saved_calculations FOR UPDATE
  USING (user_email = (SELECT auth.jwt() ->> 'email'))
  WITH CHECK (user_email = (SELECT auth.jwt() ->> 'email'));
```

- [ ] **Passo 2: Aplicar a migration**

Rodar pelo SQL Editor do Supabase ou `supabase db push`, conforme o fluxo já usado no projeto.
Expected: as quatro colunas aparecem em `saved_calculations`.

- [ ] **Passo 3: Estender `useSavedCalculations`**

```ts
import type { PlatformKey } from "@/lib/pricing/types";

interface SaveCalcData {
  platform: PlatformKey;
  product_name: string;
  sale_price: number;
  cost: number;
  profit_margin_percent: number;
  profit_margin_value: number;
  /** Entradas completas da calculadora, para recálculo posterior. */
  inputs: Record<string, unknown>;
  stock_quantity: number;
}
```

No `insert`, acrescentar `inputs: data.inputs` e `stock_quantity: data.stock_quantity`.

- [ ] **Passo 4: Verificar**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: erros nos pontos de chamada que ainda não passam `inputs` e `stock_quantity`. Corrigir cada um passando os valores reais do componente e rodar de novo até exit 0.

- [ ] **Passo 5: Commit**

```bash
git add supabase/migrations/ src/hooks/useSavedCalculations.ts src/integrations/supabase/types.ts src/pages/Calculadora.tsx
git commit -m "feat: salva inputs completos e quantidade em estoque nos produtos"
```

---

### Task 7: Modal de salvar com estoque

**Files:**
- Create: `src/components/SalvarProdutoDialog.tsx`
- Modify: `src/pages/Calculadora.tsx` — os 6 botões de salvar

**Interfaces:**
- Consumes: `useSavedCalculations`, `PricingResult`, `PlatformKey`.
- Produces: `<SalvarProdutoDialog platform inputs resultado nomeInicial />`.

- [ ] **Passo 1: Criar o componente**

Modal com: nome do produto, quantidade em estoque (`type="number"`, `min={0}`, padrão 0) e resumo do resultado. Abaixo do campo de estoque, em texto pequeno, o custo imobilizado (`quantidade × custo`) formatado com `formatCurrency`. Ao confirmar, chama `saveCalculation`.

- [ ] **Passo 2: Substituir os botões de salvar nas 6 calculadoras**

Cada uma passa seus próprios `inputs` — o objeto exato entregue a `calcular` — e o `resultado`.

- [ ] **Passo 3: Verificar**

Run: `npm run build` — Expected: OK.
Salvar um produto com quantidade 3 e custo R$10; conferir no Supabase que `stock_quantity = 3` e que `inputs` traz o objeto completo.

- [ ] **Passo 4: Commit**

```bash
git add src/components/SalvarProdutoDialog.tsx src/pages/Calculadora.tsx
git commit -m "feat: modal de salvar produto com quantidade em estoque"
```

**Ponto de revisão da Fase 1** — parar e validar com o usuário antes da Fase 2.

---

## Fase 2 — Casca do app: sidebar e dashboard

### Task 8: `AppShell` e `AppSidebar`

**Files:**
- Create: `src/components/layout/AppSidebar.tsx`, `src/components/layout/AppShell.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: `<AppShell />` como rota-mãe com `<Outlet />`.

Navegação, agrupada como na referência visual:

```
VISÃO GERAL   Dashboard
PRECIFICAR    Calculadora · Comparador · Calculadora de Ads
CARTEIRA      Produtos Salvos
```

O item de admin (`/admin-panel`) só aparece quando `has_role` confirmar. A sidebar vira drawer no mobile via `use-mobile`. O logo no topo usa `logo-horizontal` com o par claro/escuro.

- [ ] **Passo 1:** Criar `AppSidebar` com os grupos acima. Item ativo marcado por barra vertical `bg-primary` à esquerda e rótulo em `text-primary`.
- [ ] **Passo 2:** Criar `AppShell` com sidebar fixa à esquerda e `<Outlet />` na área de conteúdo.
- [ ] **Passo 3:** Em `App.tsx`, aninhar `/dashboard`, `/calculadora`, `/comparador`, `/ads` e `/produtos-salvos` sob `AppShell`, todas dentro de `ProtectedRoute`. Após o login, redirecionar para `/dashboard`.
- [ ] **Passo 4:** Verificar — `npm run build`, navegar por todos os itens, conferir nos dois temas e em viewport mobile.
- [ ] **Passo 5:** Commit.

---

### Task 9: `useCarteira` — agregados da carteira

**Files:**
- Create: `src/lib/carteira.ts`, `src/lib/carteira.test.ts`
- Create: `src/hooks/useCarteira.ts`

A agregação fica em `src/lib/carteira.ts` para ser testável sem Supabase; o hook só busca e delega.

**Interfaces:**
- Produces:
  - `interface ProdutoSalvo { id; platform; product_name; sale_price; cost; profit_margin_percent; profit_margin_value; stock_quantity; inputs; created_at }`
  - `interface ResumoCarteira { totalProdutos; custoTotalEstoque; valorVendaEstoque; lucroPotencial; margemMedia; porPlataforma; produtosNoPrejuizo }`
  - `agregarCarteira(produtos: ProdutoSalvo[]): ResumoCarteira`

- [ ] **Passo 1: Escrever o teste que falha**

```ts
import { describe, it, expect } from "vitest";
import { agregarCarteira } from "./carteira";

const base = {
  id: "1",
  platform: "shopee" as const,
  product_name: "X",
  inputs: {},
  created_at: "2026-01-01T00:00:00Z",
};

describe("agregarCarteira", () => {
  it("soma o custo do estoque como custo × quantidade", () => {
    const r = agregarCarteira([
      { ...base, sale_price: 100, cost: 40, profit_margin_percent: 26, profit_margin_value: 26, stock_quantity: 3 },
      { ...base, id: "2", sale_price: 50, cost: 20, profit_margin_percent: 10, profit_margin_value: 5, stock_quantity: 2 },
    ]);
    expect(r.custoTotalEstoque).toBeCloseTo(160, 2); // 40*3 + 20*2
    expect(r.valorVendaEstoque).toBeCloseTo(400, 2); // 100*3 + 50*2
    expect(r.lucroPotencial).toBeCloseTo(88, 2); // 26*3 + 5*2
  });

  it("não conta no custo imobilizado o produto sem estoque, mas o conta no total", () => {
    const r = agregarCarteira([
      { ...base, sale_price: 100, cost: 40, profit_margin_percent: 26, profit_margin_value: 26, stock_quantity: 0 },
    ]);
    expect(r.custoTotalEstoque).toBe(0);
    expect(r.totalProdutos).toBe(1);
  });

  it("lista os produtos com margem negativa", () => {
    const r = agregarCarteira([
      { ...base, sale_price: 100, cost: 95, profit_margin_percent: -5, profit_margin_value: -5, stock_quantity: 1 },
    ]);
    expect(r.produtosNoPrejuizo).toHaveLength(1);
  });

  it("devolve zeros para carteira vazia, sem NaN", () => {
    const r = agregarCarteira([]);
    expect(r.margemMedia).toBe(0);
    expect(Number.isNaN(r.margemMedia)).toBe(false);
    expect(r.custoTotalEstoque).toBe(0);
  });
});
```

- [ ] **Passo 2:** Rodar e confirmar a falha.
- [ ] **Passo 3:** Implementar `agregarCarteira`. `margemMedia` é **ponderada pelo valor de venda em estoque**, não a média simples das margens — a média simples distorce quando um SKU barato tem margem alta.
- [ ] **Passo 4:** Rodar e confirmar que passa.
- [ ] **Passo 5:** Criar `useCarteira`, buscando de `saved_calculations` e devolvendo `{ produtos, resumo, loading, error }`.
- [ ] **Passo 6:** Commit.

---

### Task 10: Página Dashboard

**Files:**
- Create: `src/pages/Dashboard.tsx`

**SUB-SKILLS OBRIGATÓRIAS antes de escrever a tela:** `kpi-dashboard-design` (escolha e hierarquia de métricas), `dataviz` (paleta e escolha de gráfico), `frontend-design` (evitar estética genérica).

Cartões de topo, na ordem de importância para quem vende:

| Métrica | Origem |
|---|---|
| Custo total em estoque | `resumo.custoTotalEstoque` |
| Lucro potencial | `resumo.lucroPotencial` |
| Margem média ponderada | `resumo.margemMedia` |
| Produtos no prejuízo | `resumo.produtosNoPrejuizo.length` |

Abaixo: margem por produto (barras horizontais, ordenado do pior para o melhor, para o problema aparecer primeiro) e distribuição do custo de estoque por plataforma.

Regra: nenhum número inventado — todo valor sai de `useCarteira`. Carteira vazia mostra estado vazio com chamada para a calculadora, nunca dados de exemplo.

- [ ] **Passo 1:** Invocar as três sub-skills.
- [ ] **Passo 2:** Implementar a tela.
- [ ] **Passo 3:** Verificar com carteira vazia, com 1 produto e com produto no prejuízo. Conferir nos dois temas.
- [ ] **Passo 4:** Commit.

**Ponto de revisão da Fase 2.**

---

## Fase 3 — Comparador

### Task 11: Página Comparador

**Files:**
- Create: `src/pages/Comparador.tsx`

Um formulário único (nome, custo, preço de venda, imposto, peso, dimensões) alimenta as 6 calculadoras via `calcular` e produz uma tabela ordenada por lucro.

O ponto delicado: cada plataforma tem entradas próprias (Amazon precisa de modelo de envio, ML de tipo de anúncio). O comparador assume um padrão por plataforma e **mostra qual premissa usou** em cada linha, com controle para ajustar. Comparação que esconde a premissa induz o usuário a erro.

Colunas: Plataforma · Comissão · Frete · Imposto · Receita líquida · Lucro · Margem. A melhor linha recebe `border-primary`; linhas com prejuízo mostram o valor em `text-destructive`.

- [ ] **Passo 1:** Implementar com `PLATFORM_KEYS.map` chamando `calcular`.
- [ ] **Passo 2:** Exibir e permitir editar as premissas por plataforma.
- [ ] **Passo 3:** Verificar que o lucro de cada linha bate com o da aba correspondente na Calculadora para a mesma entrada. Divergência aqui é bug de premissa.
- [ ] **Passo 4:** Commit.

**Ponto de revisão da Fase 3.**

---

## Fase 4 — Precificação reversa

### Task 12: `precoParaMargem`

**Files:**
- Create: `src/lib/pricing/reverse.ts`, `src/lib/pricing/reverse.test.ts`

**Interfaces:**
- Consumes: `calcular`, `PlatformInputMap` (Task 5).
- Produces: `precoParaMargem<K extends PlatformKey>(platform: K, margemAlvo: number, input: Omit<PlatformInputMap[K], "precoVenda">): number | null`

Busca binária sobre o preço. A margem cresce com o preço dentro de cada faixa, mas **salta nas fronteiras** (a Shopee muda de 20%+R$4 para 14%+R$16 em R$80). Por isso a busca roda por segmento entre fronteiras e devolve o menor preço que atinge o alvo. Devolve `null` quando o alvo é inalcançável.

- [ ] **Passo 1: Escrever o teste que falha**

```ts
import { describe, it, expect } from "vitest";
import { precoParaMargem } from "./reverse";
import { calcularShopee } from "./shopee";

const args = {
  custoProduto: 40, impostoPercent: 0, marketingPercent: 0, usarSubsidioPix: false,
};

describe("precoParaMargem", () => {
  it("encontra um preço cuja margem bate com o alvo", () => {
    const preco = precoParaMargem("shopee", 20, args);
    expect(preco).not.toBeNull();
    const r = calcularShopee({ ...args, precoVenda: preco! });
    expect(r.margemPercent).toBeCloseTo(20, 1);
  });

  it("devolve null quando a margem alvo é inalcançável", () => {
    expect(precoParaMargem("shopee", 95, args)).toBeNull();
  });

  it("exige preço maior para margem maior", () => {
    const p10 = precoParaMargem("shopee", 10, args)!;
    const p30 = precoParaMargem("shopee", 30, args)!;
    expect(p30).toBeGreaterThan(p10);
  });
});
```

- [ ] **Passo 2:** Rodar e confirmar a falha.
- [ ] **Passo 3:** Implementar com 80 iterações por segmento e tolerância de 0,05 ponto percentual.
- [ ] **Passo 4:** Rodar e confirmar que passa.
- [ ] **Passo 5:** Commit.

---

### Task 13: Slider de margem nas calculadoras

**Files:**
- Create: `src/components/MargemSlider.tsx`
- Modify: `src/pages/Calculadora.tsx` — as 6 calculadoras

Slider horizontal de 0 a 50%, passo 0,5. Ao arrastar, chama `precoParaMargem` e escreve o resultado no campo de preço de venda. Quando o alvo for inalcançável, mostra a mensagem de limite em vez de deixar o campo em branco. Usa `@/components/ui/slider`, que já existe no projeto.

- [ ] **Passo 1:** Criar `MargemSlider` com props `platform`, `input`, `onPreco`.
- [ ] **Passo 2:** Encaixar nas 6 calculadoras, abaixo do campo de preço.
- [ ] **Passo 3:** Verificar — arrastar até 30% na Shopee com custo R$40 e conferir que o resultado exibido mostra margem 30%.
- [ ] **Passo 4:** Commit.

**Ponto de revisão da Fase 4.**

---

## Fase 5 — Calculadora de Ads

### Task 14: `roasEquilibrio` e `recomendarRoas`

**Files:**
- Create: `src/lib/pricing/ads.ts`, `src/lib/pricing/ads.test.ts`

**Interfaces:**
- Produces:
  - `roasEquilibrio(margemPercent: number): number | null`
  - `acosEquilibrio(margemPercent: number): number | null`
  - `type Objetivo = "giro" | "rentabilidade"`
  - `interface RecomendacaoAds { roasEquilibrio; acosEquilibrio; roasAlvo; acosAlvo; margemResultante; texto }`
  - `recomendarRoas(margemPercent: number, objetivo: Objetivo): RecomendacaoAds | null`

Regra: com margem de 20% do preço, cada real vendido deixa R$0,20, e o anúncio se paga em ROAS 5 (`100 / 20`). O ACOS de equilíbrio é a própria margem. Alvo por objetivo: `giro` usa `equilíbrio × 1,25` (aceita margem menor em troca de volume); `rentabilidade` usa `equilíbrio × 2` (preserva metade da margem). Margem zero ou negativa devolve `null` — não existe ROAS que salve produto que já nasce no prejuízo.

- [ ] **Passo 1: Escrever o teste que falha**

```ts
import { describe, it, expect } from "vitest";
import { roasEquilibrio, acosEquilibrio, recomendarRoas } from "./ads";

describe("roasEquilibrio", () => {
  it("margem de 20% exige ROAS 5 para empatar", () => {
    expect(roasEquilibrio(20)).toBeCloseTo(5, 2);
  });

  it("margem de 50% exige ROAS 2", () => {
    expect(roasEquilibrio(50)).toBeCloseTo(2, 2);
  });

  it("ACOS de equilíbrio é a própria margem", () => {
    expect(acosEquilibrio(20)).toBeCloseTo(20, 2);
  });

  it("devolve null para margem zero ou negativa", () => {
    expect(roasEquilibrio(0)).toBeNull();
    expect(roasEquilibrio(-5)).toBeNull();
  });
});

describe("recomendarRoas", () => {
  it("giro aceita ROAS mais perto do equilíbrio que rentabilidade", () => {
    const giro = recomendarRoas(20, "giro")!;
    const rent = recomendarRoas(20, "rentabilidade")!;
    expect(giro.roasAlvo).toBeLessThan(rent.roasAlvo);
    expect(giro.roasAlvo).toBeGreaterThan(giro.roasEquilibrio);
  });

  it("explica o número em texto, sem deixar o usuário interpretar sozinho", () => {
    const r = recomendarRoas(20, "giro")!;
    expect(r.texto.length).toBeGreaterThan(40);
    expect(r.texto).toContain("5");
  });

  it("devolve null quando o produto já está no prejuízo", () => {
    expect(recomendarRoas(-3, "giro")).toBeNull();
  });
});
```

- [ ] **Passo 2:** Rodar e confirmar a falha.
- [ ] **Passo 3:** Implementar. Os textos explicam em linguagem direta: abaixo do ROAS de equilíbrio o anúncio consome o lucro; no equilíbrio, empata; acima, sobra. Sem jargão e sem promessa de resultado.
- [ ] **Passo 4:** Rodar e confirmar que passa.
- [ ] **Passo 5:** Commit.

---

### Task 15: Página Calculadora de Ads

**Files:**
- Create: `src/pages/CalculadoraAds.tsx`

Fluxo: escolher um produto salvo (ou digitar preço e custo) → mostrar ROAS e ACOS de equilíbrio → perguntar o objetivo (giro ou rentabilidade) → mostrar alvo recomendado, margem resultante e o texto explicativo. Campo opcional para o ROAS atual da campanha, comparado contra o equilíbrio.

- [ ] **Passo 1:** Implementar consumindo `useCarteira` e `recomendarRoas`.
- [ ] **Passo 2:** Verificar com produto de margem 20% (equilíbrio 5) e com produto no prejuízo (deve explicar que não há ROAS viável).
- [ ] **Passo 3:** Commit.

**Ponto de revisão da Fase 5.**

---

## Fase 6 — Taxas no banco e aviso de mudança

### Task 16: Tabela de taxas e leitura

**Files:**
- Create: `supabase/migrations/<timestamp>_platform_fees.sql`
- Create: `src/hooks/usePlatformFees.ts`

```sql
CREATE TABLE public.platform_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  version TEXT NOT NULL,
  config JSONB NOT NULL,
  active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT
);

CREATE UNIQUE INDEX platform_fees_ativa_por_plataforma
  ON public.platform_fees (platform) WHERE active;

ALTER TABLE public.platform_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer autenticado lê as taxas ativas"
  ON public.platform_fees FOR SELECT
  TO authenticated USING (active);

CREATE POLICY "Só admin escreve taxas"
  ON public.platform_fees FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
```

A tabela do código continua sendo o padrão de fallback: sem linha ativa para a plataforma, `calcular` usa a constante. Isso garante que o app não quebra se o banco estiver indisponível.

- [ ] **Passo 1:** Migration.
- [ ] **Passo 2:** Seed com as tabelas atuais, versão `v1`, `active = true`.
- [ ] **Passo 3:** Hook de leitura com cache.
- [ ] **Passo 4:** Ligar as chamadas de `calcular` para receber as taxas do hook.
- [ ] **Passo 5:** Verificar que todos os testes seguem passando (usam o fallback).
- [ ] **Passo 6:** Commit.

---

### Task 17: Edição de taxas no admin e recálculo

**Files:**
- Modify: `src/pages/AdminPanel.tsx`
- Create: `supabase/functions/recalcular-carteiras/index.ts`

Ao salvar uma taxa nova, a Edge Function percorre `saved_calculations`, recalcula cada produto com os `inputs` guardados na Task 6, grava a margem nova e marca quais produtos mudaram de faixa ou entraram em prejuízo.

- [ ] **Passo 1:** Tela de edição das taxas por plataforma, com **pré-visualização do impacto antes de confirmar**: quantos produtos são afetados e quantos entram em prejuízo.
- [ ] **Passo 2:** Edge Function de recálculo, reusando os módulos de `src/lib/pricing` copiados para `supabase/functions/_shared/pricing/`.
- [ ] **Passo 3:** Verificar num produto de teste: alterar a comissão da Shopee de 14% para 20% e conferir que a margem gravada mudou e que o produto foi marcado.
- [ ] **Passo 4:** Commit.

---

### Task 18: Aviso ao usuário

**Files:**
- Modify: `src/pages/Dashboard.tsx`

Faixa no topo do Dashboard quando houver produto afetado desde a última visita: quantos mudaram, quantos entraram em prejuízo, e link para a lista. Sem push e sem e-mail nesta fase — o aviso aparece quando o usuário entra.

- [ ] **Passo 1:** Implementar.
- [ ] **Passo 2:** Verificar com produto afetado e sem.
- [ ] **Passo 3:** Commit.

**Ponto de revisão da Fase 6.**

---

## Riscos

**A extração pode alterar números em silêncio.** É o risco mais caro do plano: um erro aqui muda o preço que o cliente cobra de verdade. Mitigação: as Tasks 3–4 são refactor puro com valores copiados sem alteração, cada plataforma tem teste com números conferidos à mão, e cada extração é conferida na tela antes do commit.

**O comparador pode esconder premissas.** Plataformas com entradas diferentes não são comparáveis sem assumir valores. Mitigação: a premissa usada aparece em cada linha e é editável.

**`inputs` como JSONB não tem schema.** Se a forma do input mudar, produtos antigos podem não recalcular. Mitigação: gravar `fee_version` junto e tratar input desconhecido como "não recalculável", nunca como zero.
