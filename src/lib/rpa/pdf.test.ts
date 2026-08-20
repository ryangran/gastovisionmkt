import { describe, it, expect } from "vitest";
import { montarLinhasValores, numeroRecibo, nomeArquivo } from "./pdf";
import { calcularRpa } from "./impostos";
import type { EmpresaRpa } from "./pdf";
import type { Afiliado } from "./planilha";

const empresa: EmpresaRpa = {
  razaoSocial: "X", cnpj: "1", endereco: "R", municipio: "ITU", uf: "SP", cep: "",
  inscricaoEstadual: "", descricaoServico: "Comissão",
  reterInss: true, reterIrrf: true, reterIss: false, issPercent: 0,
};

const agnes: Afiliado = {
  nome: "AGNES MACHADO DE SOUZA", cpf: "848.412.220-49",
  nascimento: "04/05/2000", endereco: "Av X", valorBruto: 1.43,
};

describe("montarLinhasValores", () => {
  it("reproduz as linhas do recibo de exemplo", () => {
    const r = calcularRpa({ bruto: 1.43, reterInss: true, reterIrrf: true, issPercent: 0 });
    const linhas = montarLinhasValores(r, empresa);
    expect(linhas.map((l) => l.descricao)).toEqual([
      "Valor Bruto do Serviço", "(-) INSS", "(-) IRRF", "VALOR LÍQUIDO A RECEBER",
    ]);
    expect(linhas[1].aliquota).toBe("11%");
    expect(linhas[2].aliquota).toBe("Isento");
    expect(linhas[3].valor).toBeCloseTo(1.27, 2);
  });

  it("omite a retenção desligada em vez de mostrar R$ 0,00", () => {
    const semNada = { ...empresa, reterInss: false, reterIrrf: false };
    const r = calcularRpa({ bruto: 100, reterInss: false, reterIrrf: false, issPercent: 0 });
    const linhas = montarLinhasValores(r, semNada);
    expect(linhas).toHaveLength(2);
    expect(linhas[1].valor).toBeCloseTo(100, 2);
  });

  it("mostra o ISS só quando ligado e com alíquota", () => {
    const comIss = { ...empresa, reterIss: true, issPercent: 5 };
    const r = calcularRpa({ bruto: 1000, reterInss: true, reterIrrf: true, issPercent: 5 });
    expect(montarLinhasValores(r, comIss).some((l) => l.descricao === "(-) ISS")).toBe(true);

    const issZero = { ...empresa, reterIss: true, issPercent: 0 };
    expect(montarLinhasValores(r, issZero).some((l) => l.descricao === "(-) ISS")).toBe(false);
  });

  it("a linha de total fecha com o bruto menos as retenções listadas", () => {
    const comIss = { ...empresa, reterIss: true, issPercent: 3 };
    const r = calcularRpa({ bruto: 5000, reterInss: true, reterIrrf: true, issPercent: 3 });
    const linhas = montarLinhasValores(r, comIss);
    const bruto = linhas[0].valor;
    const descontos = linhas.slice(1, -1).reduce((s, l) => s + l.valor, 0);
    expect(linhas[linhas.length - 1].valor).toBeCloseTo(bruto - descontos, 2);
  });
});

describe("formato da alíquota de ISS", () => {
  it("usa vírgula decimal, como manda documento fiscal brasileiro", () => {
    const comIss = { ...empresa, reterIss: true, issPercent: 3.96 };
    const r = calcularRpa({ bruto: 0.53, reterInss: true, reterIrrf: true, issPercent: 3.96 });
    const iss = montarLinhasValores(r, comIss).find((l) => l.descricao === "(-) ISS");
    expect(iss?.aliquota).toBe("3,96%");
  });

  it("formata certo mesmo quando o valor chega como texto do banco", () => {
    // NUMERIC do Postgres volta como string em alguns casos, e
    // String.toLocaleString devolveria "3.96" sem formatar.
    const comIss = { ...empresa, reterIss: true, issPercent: "3.96" as unknown as number };
    const r = calcularRpa({ bruto: 0.53, reterInss: true, reterIrrf: true, issPercent: 3.96 });
    const iss = montarLinhasValores(r, comIss).find((l) => l.descricao === "(-) ISS");
    expect(iss?.aliquota).toBe("3,96%");
  });

  it("reproduz o recibo de R$0,53 com ISS de 3,96%", () => {
    const r = calcularRpa({ bruto: 0.53, reterInss: true, reterIrrf: true, issPercent: 3.96 });
    expect(r.inss).toBeCloseTo(0.06, 2);
    expect(r.irrf).toBe(0);
    expect(r.iss).toBeCloseTo(0.02, 2);
    expect(r.liquido).toBeCloseTo(0.45, 2);
  });
});

describe("numeroRecibo", () => {
  it("é estável para o mesmo afiliado no mesmo mês", () => {
    expect(numeroRecibo(agnes, "Julho de 2026")).toBe(numeroRecibo(agnes, "Julho de 2026"));
  });

  it("muda quando muda o mês de referência", () => {
    expect(numeroRecibo(agnes, "Julho de 2026")).not.toBe(numeroRecibo(agnes, "Agosto de 2026"));
  });

  it("muda entre afiliados diferentes", () => {
    const outro = { ...agnes, nome: "JOAO SILVA", cpf: "111" };
    expect(numeroRecibo(agnes, "Julho de 2026")).not.toBe(numeroRecibo(outro, "Julho de 2026"));
  });
});

describe("nomeArquivo", () => {
  it("usa o nome do afiliado sem acento nem caractere proibido", () => {
    expect(nomeArquivo({ ...agnes, nome: "José da Silva/Souza" })).toBe("JOSE DA SILVASOUZA.pdf");
  });

  it("não devolve arquivo sem nome quando o afiliado não tem nome utilizável", () => {
    expect(nomeArquivo({ ...agnes, nome: "###" })).toBe("RPA.pdf");
  });
});
