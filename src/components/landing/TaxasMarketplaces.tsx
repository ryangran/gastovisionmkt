import { MarketplaceLogo, type MarketplaceKey } from "@/components/MarketplaceLogo";

interface LinhaTaxa {
  key: MarketplaceKey;
  nome: string;
  comissao: string;
  fixa: string;
  frete: string;
}

/**
 * Resumo público das taxas, para quem chega pesquisando "taxas da Shopee",
 * "comissão do Mercado Livre" e afins. Os números vêm das mesmas tabelas que a
 * calculadora usa (src/lib/pricing).
 */
const LINHAS: LinhaTaxa[] = [
  {
    key: "shopee",
    nome: "Shopee",
    comissao: "20% até R$79,99 · 14% acima",
    fixa: "R$4 por item até R$79,99 · R$16 a R$26 acima (50% do valor abaixo de R$8)",
    frete: "Programa de frete grátis, com subsídio Pix de 5% a 8% nas faixas acima de R$80",
  },
  {
    key: "mercadolivre",
    nome: "Mercado Livre",
    comissao: "Varia por categoria e por tipo de anúncio (clássico ou premium)",
    fixa: "Custo fixo por item nos anúncios abaixo de R$79",
    frete: "Tabela de custo de envio por faixa de peso e faixa de preço (Full, Coleta e Agências)",
  },
  {
    key: "amazon",
    nome: "Amazon",
    comissao: "Percentual por categoria, algumas escalonadas por faixa de preço",
    fixa: "Taxa fixa por item conforme a categoria",
    frete: "FBA, FBA Onsite ou DBA, com valor por peso e zona de entrega",
  },
  {
    key: "magalu",
    nome: "Magalu",
    comissao: "18% fixo",
    fixa: "Taxa fixa por pedido conforme o contrato",
    frete: "Tabela Preço Certo por faixa de peso, com níveis de desconto de 25%, 50% e 75%",
  },
  {
    key: "tiktok",
    nome: "TikTok Shop",
    comissao: "10% abaixo de R$50 · 6% de R$50 para cima",
    fixa: "R$4 por item abaixo de R$50 · R$6 de R$50 para cima",
    frete: "Frete grátis da plataforma cobra 6% adicionais sobre o preço de venda",
  },
  {
    key: "shein",
    nome: "Shein",
    comissao: "16%",
    fixa: "Sem taxa fixa por item",
    frete: "Cobrado por peso cubado, que costuma ser maior que o peso da balança",
  },
];

export const TaxasMarketplaces = () => (
  <section id="taxas" className="border-y border-border bg-card/40">
    <div className="container mx-auto px-4 py-16 lg:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          Taxas de cada marketplace: comissão, taxa fixa e frete
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Resumo das regras que a Vetrex usa para calcular o seu lucro. Cada plataforma cobra de
          um jeito diferente, e a diferença aparece no que sobra na sua conta.
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-5xl overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <caption className="sr-only">
            Comissão, taxa fixa e frete cobrados por Shopee, Mercado Livre, Amazon, Magalu, TikTok
            Shop e Shein
          </caption>
          <thead className="bg-muted/40">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium text-foreground">Marketplace</th>
              <th scope="col" className="px-4 py-3 font-medium text-foreground">Comissão</th>
              <th scope="col" className="px-4 py-3 font-medium text-foreground">Taxa fixa</th>
              <th scope="col" className="px-4 py-3 font-medium text-foreground">Frete</th>
            </tr>
          </thead>
          <tbody>
            {LINHAS.map((l) => (
              <tr key={l.key} className="border-t border-border align-top">
                <th scope="row" className="px-4 py-4 font-medium text-foreground">
                  <span className="flex items-center gap-2">
                    <MarketplaceLogo platform={l.key} className="h-4 w-auto max-w-12" />
                    <span>{l.nome}</span>
                  </span>
                </th>
                <td className="px-4 py-4 text-muted-foreground">{l.comissao}</td>
                <td className="px-4 py-4 text-muted-foreground">{l.fixa}</td>
                <td className="px-4 py-4 text-muted-foreground">{l.frete}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mx-auto mt-4 max-w-3xl text-center text-xs text-muted-foreground">
        As tabelas completas ficam no sistema e são atualizadas quando a plataforma muda a regra.
        Confira as condições do seu contrato: categoria, nível de vendedor e programas ativos
        alteram os valores.
      </p>
    </div>
  </section>
);
