export interface ProdutoSalvo {
  id: string;
  /** Nome de exibição da plataforma, como gravado no banco ("Mercado Livre"). */
  platform: string;
  product_name: string;
  sale_price: number;
  cost: number;
  profit_margin_percent: number;
  profit_margin_value: number;
  stock_quantity: number;
  inputs: Record<string, unknown>;
  created_at: string;
  /** Margem antes do último recálculo por mudança de taxa. */
  previous_margin_percent?: number | null;
  recalculated_at?: string | null;
}

export interface ResumoPlataforma {
  platform: string;
  produtos: number;
  custoEstoque: number;
  unidades: number;
}

export interface ResumoCarteira {
  totalProdutos: number;
  /** Dinheiro parado em estoque: soma de custo x quantidade. */
  custoTotalEstoque: number;
  /** Quanto o estoque vale se vender tudo pelo preço cadastrado. */
  valorVendaEstoque: number;
  /** Total de unidades em estoque, somando todos os produtos. */
  unidadesEmEstoque: number;
  lucroPotencial: number;
  /** Margem ponderada pelo valor de venda em estoque, em pontos percentuais. */
  margemMedia: number;
  porPlataforma: ResumoPlataforma[];
  produtosNoPrejuizo: ProdutoSalvo[];
}

/** Linhas gravadas antes da migration não têm stock_quantity. */
function unidades(p: ProdutoSalvo): number {
  const q = Number(p.stock_quantity);
  return Number.isFinite(q) && q > 0 ? q : 0;
}

export function agregarCarteira(produtos: ProdutoSalvo[]): ResumoCarteira {
  let custoTotalEstoque = 0;
  let valorVendaEstoque = 0;
  let lucroPotencial = 0;
  let unidadesEmEstoque = 0;
  const porPlataforma = new Map<string, ResumoPlataforma>();
  const produtosNoPrejuizo: ProdutoSalvo[] = [];

  for (const p of produtos) {
    const qtd = unidades(p);
    custoTotalEstoque += p.cost * qtd;
    valorVendaEstoque += p.sale_price * qtd;
    lucroPotencial += p.profit_margin_value * qtd;
    unidadesEmEstoque += qtd;

    if (p.profit_margin_value < 0) produtosNoPrejuizo.push(p);

    const atual = porPlataforma.get(p.platform) ?? {
      platform: p.platform,
      produtos: 0,
      custoEstoque: 0,
      unidades: 0,
    };
    atual.produtos += 1;
    atual.custoEstoque += p.cost * qtd;
    atual.unidades += qtd;
    porPlataforma.set(p.platform, atual);
  }

  // Ponderada pelo valor de venda em estoque: a média simples das margens deixa
  // um SKU barato de margem alta esconder um SKU caro de margem baixa.
  const margemMedia = valorVendaEstoque > 0 ? (lucroPotencial / valorVendaEstoque) * 100 : 0;

  return {
    totalProdutos: produtos.length,
    custoTotalEstoque,
    valorVendaEstoque,
    unidadesEmEstoque,
    lucroPotencial,
    margemMedia,
    porPlataforma: [...porPlataforma.values()].sort((a, b) => b.custoEstoque - a.custoEstoque),
    produtosNoPrejuizo,
  };
}
