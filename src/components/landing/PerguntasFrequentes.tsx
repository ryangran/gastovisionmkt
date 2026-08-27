export interface Pergunta {
  pergunta: string;
  resposta: string;
}

/** Perguntas que as pessoas digitam na busca antes de precificar um produto. */
export const PERGUNTAS: Pergunta[] = [
  {
    pergunta: "Como precificar um produto para marketplace?",
    resposta:
      "Some o custo do produto, a comissão e a taxa fixa da plataforma, o frete, o imposto do seu regime, o custo de anúncio e a embalagem. Só o que sobra depois disso é lucro. Na Vetrex você informa custo, preço e peso e o cálculo sai com as tabelas reais de cada marketplace.",
  },
  {
    pergunta: "Quanto a Shopee cobra por venda?",
    resposta:
      "A comissão é de 20% até R$79,99 e 14% acima disso, mais uma taxa fixa por item de R$4 nas vendas até R$79,99 e de R$16 a R$26 nas faixas maiores. Abaixo de R$8 a taxa fixa é de 50% do valor do item.",
  },
  {
    pergunta: "Como calcular a taxa do Mercado Livre?",
    resposta:
      "A comissão depende da categoria e de o anúncio ser clássico ou premium, existe custo fixo por item abaixo de R$79 e o custo de envio segue uma tabela por faixa de peso e faixa de preço. A calculadora aplica as três coisas juntas.",
  },
  {
    pergunta: "Quais são as taxas do TikTok Shop?",
    resposta:
      "Itens abaixo de R$50 pagam 10% de comissão mais R$4 fixos. De R$50 para cima são 6% mais R$6 fixos. Se o produto entra no frete grátis da plataforma, somam-se 6% sobre o preço de venda.",
  },
  {
    pergunta: "Qual margem de lucro é saudável para vender em marketplace?",
    resposta:
      "Depende do giro e do custo de anúncio. Uma margem de 20% sobre o preço de venda significa ROAS de equilíbrio 5: abaixo disso o anúncio consome o lucro inteiro. A Vetrex mostra o teto de ACOS e o ROAS-alvo do produto.",
  },
  {
    pergunta: "Preciso pagar para usar a calculadora?",
    resposta:
      "Não. A conta é gratuita, criada com email e senha, e já vem com a calculadora liberada para conferir produtos por dia. Os planos abrem o comparador, o painel de estoque e os demais módulos.",
  },
];

export const PerguntasFrequentes = () => (
  <section id="faq" className="container mx-auto px-4 py-16 lg:py-20">
    <div className="mx-auto max-w-3xl">
      <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
        Perguntas frequentes sobre precificação e taxas
      </h2>
      <dl className="mt-8 space-y-6">
        {PERGUNTAS.map((p) => (
          <div key={p.pergunta} className="rounded-xl border border-border bg-card p-5">
            <dt className="font-display text-base font-semibold text-foreground">{p.pergunta}</dt>
            <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.resposta}</dd>
          </div>
        ))}
      </dl>
    </div>
  </section>
);
