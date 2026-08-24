import { describe, expect, it } from "vitest";
import {
  apenasDigitos,
  formatarTelefone,
  linkWhatsApp,
  pareceFixo,
  telefoneValido,
} from "./telefone";

describe("telefoneValido", () => {
  it("aceita celular de 11 dígitos e fixo de 10", () => {
    expect(telefoneValido("(11) 99749-6533")).toBe(true);
    expect(telefoneValido("(19) 3852-1313")).toBe(true);
    expect(telefoneValido("11997496533")).toBe(true);
  });

  it("recusa contagem de dígitos fora de 10 e 11", () => {
    expect(telefoneValido("99749-6533")).toBe(false);
    expect(telefoneValido("(11) 9")).toBe(false);
    expect(telefoneValido("119974965331")).toBe(false);
    expect(telefoneValido("")).toBe(false);
  });

  it("recusa DDD que não existe", () => {
    // Erro típico de quem perde um dígito ao digitar.
    expect(telefoneValido("(01) 99749-6533")).toBe(false);
    expect(telefoneValido("(10) 99749-6533")).toBe(false);
  });

  it("recusa celular de 11 dígitos que não começa com 9", () => {
    expect(telefoneValido("(11) 89749-6533")).toBe(false);
  });
});

describe("pareceFixo", () => {
  it("reconhece o fixo pelo primeiro dígito depois do DDD", () => {
    expect(pareceFixo("(19) 3852-1313")).toBe(true);
    expect(pareceFixo("(11) 2631-4998")).toBe(true);
    expect(pareceFixo("(11) 99749-6533")).toBe(false);
  });
});

describe("formatarTelefone", () => {
  it("aplica a máscara conforme digita", () => {
    expect(formatarTelefone("")).toBe("");
    expect(formatarTelefone("11")).toBe("(11");
    expect(formatarTelefone("1199")).toBe("(11) 99");
    expect(formatarTelefone("1199749")).toBe("(11) 9974-9");
    expect(formatarTelefone("11997496533")).toBe("(11) 99749-6533");
  });

  it("corta o que passa de 11 dígitos em vez de deixar crescer", () => {
    expect(formatarTelefone("119974965339999")).toBe("(11) 99749-6533");
  });

  it("ignora o que não é dígito, para colar de qualquer lugar funcionar", () => {
    expect(formatarTelefone("+55 (11) 99749-6533")).toBe("(55) 11997-4965");
    expect(formatarTelefone("11 99749 6533")).toBe("(11) 99749-6533");
  });
});

describe("linkWhatsApp", () => {
  it("monta o link com o 55 na frente", () => {
    expect(linkWhatsApp("(11) 99749-6533")).toBe("https://wa.me/5511997496533");
  });

  it("devolve null para número inválido", () => {
    // Botão desabilitado é melhor que abrir conversa com um estranho.
    expect(linkWhatsApp("9974-6533")).toBeNull();
    expect(linkWhatsApp("")).toBeNull();
  });

  it("escapa a mensagem, para acento não corromper a URL", () => {
    const link = linkWhatsApp("(11) 99749-6533", "Olá! Tudo bem?") as string;
    expect(link).not.toContain(" ");
    expect(decodeURIComponent(link.split("?text=")[1])).toBe("Olá! Tudo bem?");
  });
});

describe("apenasDigitos", () => {
  it("tira tudo que não é número", () => {
    expect(apenasDigitos("+55 (11) 99749-6533")).toBe("5511997496533");
  });
});
