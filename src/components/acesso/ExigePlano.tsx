import type { ReactNode } from "react";
import { BloqueioPlano } from "@/components/acesso/BloqueioPlano";
import { useAcesso } from "@/components/layout/AcessoProvider";

interface ExigePlanoProps {
  titulo: string;
  descricao: string;
  amostra?: readonly string[];
  children: ReactNode;
}

/**
 * Troca a ferramenta pela tela de venda enquanto a pessoa não assinou.
 *
 * Fica nas rotas, e não dentro de cada página, para a regra de quem vê o quê
 * caber numa tela só em App.tsx. Página que nasce nova entra aqui e já está
 * protegida.
 */
export const ExigePlano = ({ titulo, descricao, amostra, children }: ExigePlanoProps) => {
  const { carregando, ilimitado } = useAcesso();

  // Mostrar a tela de venda antes de saber a resposta faria quem paga ver um
  // paywall piscando toda vez que troca de aba.
  if (carregando) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!ilimitado) {
    return <BloqueioPlano titulo={titulo} descricao={descricao} amostra={amostra} />;
  }

  return <>{children}</>;
};

/** O texto de venda de cada ferramenta, junto para não repetir em App.tsx. */
export const TRAVAS = {
  dashboard: {
    titulo: "O painel está nos planos",
    descricao:
      "Cada produto salvo guarda a quantidade em estoque. O painel soma quanto dinheiro está parado, quanto vale se você vender tudo e quanto sobra de lucro no fim.",
    amostra: [
      "Quanto capital está parado no seu estoque agora",
      "Quanto entra se vender tudo pelo preço atual",
      "Seus produtos ordenados do pior para o melhor, para o problema aparecer primeiro",
    ],
  },
  comparador: {
    titulo: "O comparador está nos planos",
    descricao:
      "Um formulário, os seis marketplaces lado a lado, ordenados por lucro. Num teste com produto de R$120 e custo de R$45, deu R$49 de diferença por unidade entre o melhor e o pior.",
    amostra: [
      "Os seis marketplaces calculados de uma vez só",
      "Ordenados do que mais sobra para o que menos sobra",
      "Cada linha mostra a premissa usada, porque comparação que esconde premissa engana",
    ],
  },
  ads: {
    titulo: "A calculadora de anúncios está nos planos",
    descricao:
      "Margem de 20% quer dizer ROAS de equilíbrio 5. Abaixo disso o anúncio come o lucro inteiro, e você só descobre no fechamento do mês.",
    amostra: [
      "ROAS de equilíbrio e teto de ACOS do seu produto",
      "Pergunta se você quer girar estoque ou lucrar mais, e ajusta a meta",
      "Quanto sai do seu bolso a cada venda, quando a campanha está abaixo do equilíbrio",
    ],
  },
  produtosSalvos: {
    titulo: "Salvar produto está nos planos",
    descricao:
      "Salva uma vez e reaproveita o cálculo em outra plataforma, sem redigitar nada. É também o que alimenta o painel e o aviso de mudança de taxa.",
    amostra: [
      "Produtos salvos sem limite, com a quantidade em estoque",
      "O mesmo produto reaproveitado em outro marketplace",
      "Recalculados sozinhos quando a plataforma muda a taxa",
    ],
  },
  rpa: {
    titulo: "O RPA de afiliados está nos planos",
    descricao:
      "Sobe o relatório do mês da Shopee e sai um recibo por afiliado em PDF, com INSS e IRRF calculados. Quem trabalha com o Programa de Afiliados sabe o tempo que isso toma na mão.",
    amostra: [
      "Relatório mensal vira um recibo por afiliado",
      "INSS e IRRF calculados pela tabela vigente",
      "Todos os afiliados de uma vez, num arquivo só",
    ],
  },
} as const;
