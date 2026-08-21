import { describe, expect, it } from "vitest";
import { RESPOSTAS_VAZIAS, type RespostasMentoria } from "./perguntas";
import {
  emailValido,
  formatarTelefone,
  linkWhatsApp,
  montarMensagem,
  soNumeros,
  telefoneValido,
} from "./whatsapp";

const BASE: RespostasMentoria = {
  ...RESPOSTAS_VAZIAS,
  nome: "Ana Souza",
  telefone: "(11) 94480-4280",
  faturamento: "5k_20k",
  plataformas: ["shopee", "mercadolivre"],
  tempo_vendendo: "6m_2a",
  precifica_hoje: "planilha",
  objetivos: ["margem", "ads"],
  urgencia: "agora",
  dor: "Vendo bem mas no fim do mês não sobra nada.",
};

describe("formatarTelefone", () => {
  it("monta a máscara de celular com 11 dígitos", () => {
    expect(formatarTelefone("11944804280")).toBe("(11) 94480-4280");
  });

  it("monta a máscara de fixo com 10 dígitos", () => {
    expect(formatarTelefone("1133224455")).toBe("(11) 3322-4455");
  });

  it("aceita digitação parcial sem quebrar", () => {
    expect(formatarTelefone("1")).toBe("1");
    expect(formatarTelefone("119")).toBe("(11) 9");
    expect(formatarTelefone("11944")).toBe("(11) 944");
  });

  it("descarta o que passa de 11 dígitos", () => {
    expect(formatarTelefone("11944804280999")).toBe("(11) 94480-4280");
  });

  it("ignora o que já vem formatado", () => {
    expect(formatarTelefone("(11) 94480-4280")).toBe("(11) 94480-4280");
  });
});

describe("telefoneValido", () => {
  it("aceita celular e fixo", () => {
    expect(telefoneValido("(11) 94480-4280")).toBe(true);
    expect(telefoneValido("(11) 3322-4455")).toBe(true);
  });

  it("recusa quantidade de dígitos fora de 10 e 11", () => {
    expect(telefoneValido("1194480428")).toBe(true);
    expect(telefoneValido("119448042")).toBe(false);
    expect(telefoneValido("119448042801")).toBe(false);
  });

  it("recusa DDD abaixo de 11", () => {
    expect(telefoneValido("(10) 94480-4280")).toBe(false);
    expect(telefoneValido("(01) 94480-4280")).toBe(false);
  });

  it("exige o nono dígito no celular", () => {
    expect(telefoneValido("11844804280")).toBe(false);
  });
});

describe("emailValido", () => {
  it("trata vazio como válido, porque o campo é opcional", () => {
    expect(emailValido("")).toBe(true);
    expect(emailValido("   ")).toBe(true);
  });

  it("recusa endereço malformado", () => {
    expect(emailValido("ana@")).toBe(false);
    expect(emailValido("ana.com")).toBe(false);
  });

  it("aceita endereço normal", () => {
    expect(emailValido("ana@loja.com.br")).toBe(true);
  });
});

describe("montarMensagem", () => {
  it("abre pedindo o diagnóstico gratuito, que é o que foi prometido na página", () => {
    expect(montarMensagem(BASE)).toContain("diagnóstico gratuito");
  });

  it("traduz os valores salvos para os rótulos que a pessoa leu", () => {
    const msg = montarMensagem(BASE);
    expect(msg).toContain("Nome: Ana Souza");
    expect(msg).toContain("Faturamento: R$5 mil a R$20 mil por mês");
    expect(msg).toContain("Plataformas: Shopee, Mercado Livre");
    expect(msg).toContain("Precifico hoje: Planilha própria");
    expect(msg).toContain("Prazo: Quero começar agora");
    expect(msg).toContain("Vendo bem mas no fim do mês não sobra nada.");
  });

  it("omite a linha de objetivos quando nada foi marcado", () => {
    expect(montarMensagem({ ...BASE, objetivos: [] })).not.toContain("Quero:");
  });

  it("avisa quando ainda não vende em nenhuma plataforma", () => {
    expect(montarMensagem({ ...BASE, plataformas: [] })).toContain(
      "Plataformas: nenhuma ainda",
    );
  });

  it("corta dor muito longa para a URL não estourar", () => {
    const msg = montarMensagem({ ...BASE, dor: "a".repeat(2000) });
    expect(msg).toContain("...");
    expect(msg.length).toBeLessThan(1000);
  });

  it("não corta dor dentro do limite", () => {
    const dor = "b".repeat(400);
    expect(montarMensagem({ ...BASE, dor })).toContain(dor);
  });
});

describe("linkWhatsApp", () => {
  it("aponta para o número de destino", () => {
    expect(linkWhatsApp(BASE)).toMatch(/^https:\/\/wa\.me\/5511944804280\?text=/);
  });

  it("escapa a mensagem, para quebra de linha e acento não corromperem a URL", () => {
    const link = linkWhatsApp(BASE);
    expect(link).not.toContain(" ");
    expect(link).not.toContain("\n");
    expect(decodeURIComponent(link.split("?text=")[1])).toBe(montarMensagem(BASE));
  });
});

describe("soNumeros", () => {
  it("remove tudo que não é dígito", () => {
    expect(soNumeros("(11) 94480-4280")).toBe("11944804280");
  });
});
