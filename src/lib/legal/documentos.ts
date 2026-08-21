/**
 * Fonte única dos documentos legais.
 *
 * O modal de aceite do cadastro e as páginas públicas (/termos, /privacidade,
 * /cookies) leem daqui. Manter os textos em dois lugares faria a versão aceita
 * divergir da versão publicada com o tempo.
 *
 * `versao` é o que fica gravado em `aceites_legais`. Ao mudar o texto de forma
 * substantiva, suba a versão: o aceite antigo passa a não cobrir o novo texto.
 *
 * AVISO: texto não revisado por advogado. Cobre a estrutura que a LGPD pede,
 * mas precisa de revisão jurídica antes de valer como contrato.
 */

export type DocumentoId = "termos" | "privacidade" | "cookies";

/** Parágrafo corrido, lista com marcadores ou destaque em caixa. */
export type BlocoLegal =
  | { tipo: "paragrafo"; texto: string }
  | { tipo: "lista"; itens: string[] }
  | { tipo: "destaque"; texto: string };

export interface SecaoLegal {
  titulo: string;
  blocos: BlocoLegal[];
}

export interface DocumentoLegal {
  id: DocumentoId;
  titulo: string;
  /** Vai para o banco. Data ISO. */
  versao: string;
  /** Só exibição. */
  atualizadoEm: string;
  resumo: string;
  secoes: SecaoLegal[];
}

// Endereço de propósito fora dos documentos: a sede é residencial. Razão
// social, CNPJ e canal de contato já identificam o controlador, que é o que a
// LGPD e o CDC exigem.
const RAZAO_SOCIAL = "VETREX COMPANY";
const CNPJ = "61.986.179/0001-92";
const CONTATO = "ryanzinho.gran@gmail.com";

const VERSAO = "2026-08-21";
const ATUALIZADO_EM = "21 de agosto de 2026";

export const TERMOS_DE_USO: DocumentoLegal = {
  id: "termos",
  titulo: "Termos de Uso",
  versao: VERSAO,
  atualizadoEm: ATUALIZADO_EM,
  resumo:
    "As regras de uso da Vetrex: o que a plataforma faz, o que você pode fazer nela e onde ficam os limites da nossa responsabilidade.",
  secoes: [
    {
      titulo: "1. Quem somos e o que este documento faz",
      blocos: [
        {
          tipo: "paragrafo",
          texto: `A Vetrex é uma plataforma de precificação para marketplaces, operada por ${RAZAO_SOCIAL}, inscrita no CNPJ sob o nº ${CNPJ}. O contato oficial para qualquer assunto relativo a estes Termos é ${CONTATO}.`,
        },
        {
          tipo: "paragrafo",
          texto:
            "Estes Termos formam um contrato entre você e a Vetrex. Ao criar uma conta, você declara que leu, entendeu e concorda com todas as condições abaixo. Se não concordar com alguma delas, não crie a conta e não use a plataforma.",
        },
        {
          tipo: "paragrafo",
          texto:
            "Para usar a Vetrex você precisa ter pelo menos 18 anos e capacidade civil plena, ou estar representado por quem a tenha. Se você aceita em nome de uma empresa, declara ter poderes para obrigá-la a estes Termos.",
        },
      ],
    },
    {
      titulo: "2. O que a plataforma faz",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "A Vetrex calcula preço, custo e margem de produtos vendidos em marketplaces. Reúne calculadoras específicas para Shopee, Mercado Livre, Amazon, Magalu, TikTok Shop e Shein, um comparador entre elas, precificação reversa por margem, calculadora de anúncios, controle de estoque e cadastro de custos recorrentes.",
        },
        {
          tipo: "paragrafo",
          texto:
            "As contas são feitas a partir das tabelas de comissão, frete e taxas que cada marketplace publica, somadas aos dados que você informa: custo do produto, peso, embalagem, imposto e demais despesas.",
        },
      ],
    },
    {
      titulo: "3. Os resultados são estimativa, não garantia",
      blocos: [
        {
          tipo: "destaque",
          texto: "Esta é a cláusula mais importante deste documento. Leia com atenção.",
        },
        {
          tipo: "paragrafo",
          texto:
            "Os valores que a Vetrex apresenta são estimativas calculadas a partir de tabelas públicas dos marketplaces e dos dados que você informa. Eles não são, e não substituem, o extrato oficial da plataforma onde você vende.",
        },
        {
          tipo: "paragrafo",
          texto: "O resultado pode divergir do valor real por motivos fora do nosso controle:",
        },
        {
          tipo: "lista",
          itens: [
            "os marketplaces alteram comissões, tabelas de frete e taxas fixas quando querem, muitas vezes sem aviso prévio;",
            "campanhas, cupons, programas de frete grátis e condições negociadas individualmente mudam o cálculo;",
            "a categoria em que o produto está cadastrado altera a comissão aplicada;",
            "peso, dimensão e peso cubado informados errado mudam o frete;",
            "o regime tributário e a alíquota que você informa são de sua responsabilidade.",
          ],
        },
        {
          tipo: "paragrafo",
          texto:
            "Decisões comerciais tomadas com base nos cálculos são de sua inteira responsabilidade. Confira sempre o extrato oficial do marketplace antes de fechar preço, e trate o resultado da Vetrex como apoio à decisão, nunca como número final auditado.",
        },
      ],
    },
    {
      titulo: "4. Sua conta",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "A conta é pessoal e intransferível. A senha é sua responsabilidade: não compartilhe, e escolha uma que você não use em outros serviços.",
        },
        {
          tipo: "paragrafo",
          texto: `Você responde por tudo que acontecer na sua conta. Se desconfiar de acesso indevido, troque a senha e avise imediatamente em ${CONTATO}.`,
        },
        {
          tipo: "paragrafo",
          texto:
            "Os dados que você informa no cadastro precisam ser verdadeiros e atualizados. Cadastro com dado falso pode ser encerrado sem reembolso.",
        },
      ],
    },
    {
      titulo: "5. O que você não pode fazer",
      blocos: [
        { tipo: "paragrafo", texto: "Ao usar a Vetrex, você concorda em não:" },
        {
          tipo: "lista",
          itens: [
            "compartilhar seu acesso com terceiros, revender ou sublicenciar a plataforma;",
            "extrair as tabelas de taxas, os cálculos ou qualquer conteúdo para montar produto concorrente;",
            "usar robô, raspador ou automação não autorizada para coletar dados da plataforma;",
            "tentar burlar limites de uso, autenticação ou controles de permissão;",
            "fazer engenharia reversa, descompilar ou tentar obter o código-fonte;",
            "sobrecarregar a infraestrutura de propósito ou atrapalhar o uso por outras pessoas;",
            "inserir conteúdo ilícito, ofensivo ou que viole direito de terceiro.",
          ],
        },
        {
          tipo: "paragrafo",
          texto:
            "Descumprir qualquer item acima pode levar à suspensão ou ao encerramento da conta, sem reembolso e sem prejuízo das medidas legais cabíveis.",
        },
      ],
    },
    {
      titulo: "6. Planos, pagamento e cancelamento",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "Parte das funcionalidades exige plano ativo. Preço, forma de cobrança e duração de cada plano são os informados na página de planos no momento da contratação.",
        },
        {
          tipo: "paragrafo",
          texto: `Nos termos do artigo 49 do Código de Defesa do Consumidor, você pode desistir da contratação em até 7 (sete) dias corridos, contados da data da compra, com devolução integral do valor pago. Basta pedir por ${CONTATO}.`,
        },
        {
          tipo: "paragrafo",
          texto:
            "Passado esse prazo, o cancelamento interrompe as cobranças seguintes, e o acesso continua até o fim do período já pago. Não há devolução proporcional de período em curso, salvo se a lei exigir.",
        },
        {
          tipo: "paragrafo",
          texto:
            "Podemos alterar preços a qualquer momento. A mudança nunca vale para período já pago, e avisamos por email com pelo menos 30 dias de antecedência antes de aplicá-la à sua renovação.",
        },
      ],
    },
    {
      titulo: "7. Propriedade intelectual",
      blocos: [
        {
          tipo: "paragrafo",
          texto: `A plataforma, a marca Vetrex, o código, o layout, os textos e a lógica de cálculo pertencem a ${RAZAO_SOCIAL} e são protegidos pela legislação de propriedade intelectual. O plano dá a você uma licença de uso pessoal, limitada, não exclusiva e revogável — não transfere titularidade de nada.`,
        },
        {
          tipo: "paragrafo",
          texto:
            "Os dados que você insere continuam seus. Você nos concede apenas a licença necessária para operar o serviço: armazenar, processar e exibir esses dados para você.",
        },
        {
          tipo: "paragrafo",
          texto:
            "As marcas dos marketplaces citados pertencem a seus respectivos titulares. A Vetrex não tem vínculo, patrocínio nem parceria com Shopee, Mercado Livre, Amazon, Magalu, TikTok Shop ou Shein.",
        },
      ],
    },
    {
      titulo: "8. Disponibilidade do serviço",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "Trabalhamos para manter a plataforma no ar, mas não prometemos funcionamento ininterrupto. Pode haver parada para manutenção, atualização, falha de fornecedor de infraestrutura ou evento fora do nosso controle.",
        },
        {
          tipo: "paragrafo",
          texto:
            "Manutenções programadas são avisadas com antecedência sempre que possível. Podemos alterar, suspender ou descontinuar funcionalidades; se a mudança reduzir de forma relevante o que você contratou, avisamos com pelo menos 30 dias e você pode cancelar com devolução proporcional.",
        },
      ],
    },
    {
      titulo: "9. Limite de responsabilidade",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "Na máxima extensão permitida pela lei brasileira, a Vetrex não responde por lucro cessante, perda de oportunidade comercial, prejuízo por preço mal calculado, decisão de estoque ou qualquer dano indireto decorrente do uso da plataforma.",
        },
        {
          tipo: "paragrafo",
          texto:
            "Havendo responsabilidade reconhecida, ela fica limitada ao valor que você pagou à Vetrex nos 12 meses anteriores ao fato.",
        },
        {
          tipo: "paragrafo",
          texto:
            "Nada aqui afasta direitos que o Código de Defesa do Consumidor garante e que não podem ser renunciados por contrato.",
        },
      ],
    },
    {
      titulo: "10. Encerramento",
      blocos: [
        {
          tipo: "paragrafo",
          texto: `Você pode encerrar sua conta quando quiser, pedindo por ${CONTATO}.`,
        },
        {
          tipo: "paragrafo",
          texto:
            "Podemos encerrar ou suspender sua conta em caso de descumprimento destes Termos, de uso fraudulento ou de exigência legal. Sempre que a situação permitir, avisamos antes e damos prazo para correção.",
        },
        {
          tipo: "paragrafo",
          texto:
            "Encerrada a conta, seus dados são tratados conforme a Política de Privacidade. Peça exportação antes do encerramento se quiser guardar seus cálculos.",
        },
      ],
    },
    {
      titulo: "11. Mudanças nestes Termos",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "Podemos atualizar estes Termos. Mudança relevante é avisada por email e dentro da plataforma com pelo menos 30 dias de antecedência, e pedimos novo aceite.",
        },
        {
          tipo: "paragrafo",
          texto:
            "Continuar usando a plataforma depois da entrada em vigor significa concordar com a nova versão. Se não concordar, você pode cancelar antes, com devolução proporcional do período já pago.",
        },
      ],
    },
    {
      titulo: "12. Lei aplicável e foro",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "Estes Termos são regidos pela lei brasileira. Fica eleito o foro do domicílio do consumidor para resolver qualquer controvérsia, conforme o Código de Defesa do Consumidor.",
        },
        { tipo: "paragrafo", texto: `Dúvidas sobre este documento: ${CONTATO}.` },
      ],
    },
  ],
};

export const POLITICA_PRIVACIDADE: DocumentoLegal = {
  id: "privacidade",
  titulo: "Política de Privacidade",
  versao: VERSAO,
  atualizadoEm: ATUALIZADO_EM,
  resumo:
    "Quais dados a Vetrex coleta, por que coleta, com quem compartilha, por quanto tempo guarda e como você exerce seus direitos sob a LGPD.",
  secoes: [
    {
      titulo: "1. Quem controla seus dados",
      blocos: [
        {
          tipo: "paragrafo",
          texto: `Para efeito da Lei nº 13.709/2018 (LGPD), a controladora dos seus dados é ${RAZAO_SOCIAL}, inscrita no CNPJ sob o nº ${CNPJ}.`,
        },
        {
          tipo: "paragrafo",
          texto: `Canal de contato para assuntos de proteção de dados, incluindo o exercício dos direitos descritos na seção 7: ${CONTATO}.`,
        },
      ],
    },
    {
      titulo: "2. Que dados coletamos",
      blocos: [
        { tipo: "paragrafo", texto: "Dados que você fornece:" },
        {
          tipo: "lista",
          itens: [
            "cadastro: email e senha (guardada apenas como hash, nunca em texto legível);",
            "perfil: nome, nome da loja, telefone, foto, regime tributário e alíquota de imposto;",
            "operação: produtos, custos, preços, pesos, embalagens, cálculos salvos, movimentações de estoque e custos recorrentes;",
            "contato: o que você escreve ao pedir suporte ou preencher o formulário de mentoria.",
          ],
        },
        { tipo: "paragrafo", texto: "Dados coletados automaticamente:" },
        {
          tipo: "lista",
          itens: [
            "registros de acesso: endereço IP, data e hora, conforme o artigo 15 do Marco Civil da Internet;",
            "dados técnicos: tipo de navegador, sistema operacional e idioma;",
            "uso da plataforma: páginas visitadas, funcionalidades acionadas e contagem de cálculos.",
          ],
        },
        {
          tipo: "destaque",
          texto:
            "Não pedimos e não queremos dado sensível — origem racial, opinião política, convicção religiosa, filiação sindical, saúde ou biometria. Não insira esse tipo de informação nos campos livres da plataforma.",
        },
      ],
    },
    {
      titulo: "3. Por que tratamos cada dado",
      blocos: [
        {
          tipo: "paragrafo",
          texto: "A LGPD exige uma base legal para cada tratamento. As nossas são estas:",
        },
        {
          tipo: "lista",
          itens: [
            "Execução do contrato (art. 7º, V): criar e manter sua conta, rodar os cálculos, guardar seus produtos e cálculos, processar pagamento e dar suporte.",
            "Cumprimento de obrigação legal (art. 7º, II): guardar registros de acesso pelo prazo do Marco Civil e emitir documentos fiscais.",
            "Legítimo interesse (art. 7º, IX): segurança da plataforma, prevenção a fraude e abuso, e métricas agregadas de uso para melhorar o produto.",
            "Consentimento (art. 7º, I): envio de comunicação de marketing e cookies não essenciais. Você pode retirar esse consentimento a qualquer momento, sem afetar o uso normal da plataforma.",
          ],
        },
      ],
    },
    {
      titulo: "4. Com quem compartilhamos",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "Não vendemos seus dados. Não os cedemos para terceiros usarem em publicidade própria. O compartilhamento se limita ao necessário para operar o serviço:",
        },
        {
          tipo: "lista",
          itens: [
            "Supabase — autenticação e banco de dados, onde suas informações ficam armazenadas;",
            "provedor de hospedagem e CDN — entrega da aplicação no seu navegador;",
            "processadora de pagamento — cobrança dos planos; os dados do cartão vão direto para ela e não passam pelos nossos servidores;",
            "serviço de envio de email — mensagens transacionais, como confirmação de conta e recuperação de senha;",
            "autoridades públicas — apenas mediante ordem judicial ou requisição legal válida.",
          ],
        },
        {
          tipo: "paragrafo",
          texto:
            "Parte desses fornecedores opera servidores fora do Brasil. Nesses casos a transferência internacional segue o artigo 33 da LGPD, com cláusulas contratuais de proteção equivalentes às exigidas pela lei brasileira.",
        },
      ],
    },
    {
      titulo: "5. Por quanto tempo guardamos",
      blocos: [
        {
          tipo: "lista",
          itens: [
            "Dados de conta e conteúdo que você criou: enquanto a conta existir.",
            "Após o encerramento: até 30 dias para você reverter a exclusão por engano, depois disso apagamos ou anonimizamos.",
            "Registros de acesso: 6 meses, conforme o artigo 15 do Marco Civil da Internet.",
            "Dados fiscais e financeiros: 5 anos, conforme a legislação tributária.",
            "Registro de aceite dos documentos legais: enquanto durar a relação e pelos prazos prescricionais aplicáveis, já que é a prova do seu consentimento.",
          ],
        },
      ],
    },
    {
      titulo: "6. Como protegemos",
      blocos: [
        {
          tipo: "lista",
          itens: [
            "tráfego criptografado em HTTPS ponta a ponta;",
            "senhas guardadas apenas como hash, irreversível — nem nós conseguimos lê-las;",
            "isolamento por cliente no banco via Row Level Security, para que uma conta não alcance dado de outra;",
            "controle de acesso por papel, com privilégio mínimo;",
            "bloqueio temporário após tentativas seguidas de login errado;",
            "backups periódicos do banco de dados.",
          ],
        },
        {
          tipo: "paragrafo",
          texto:
            "Nenhum sistema é imune. Se ocorrer incidente de segurança com risco relevante a você, comunicamos você e a Autoridade Nacional de Proteção de Dados nos termos do artigo 48 da LGPD.",
        },
      ],
    },
    {
      titulo: "7. Seus direitos",
      blocos: [
        { tipo: "paragrafo", texto: "O artigo 18 da LGPD garante a você o direito de:" },
        {
          tipo: "lista",
          itens: [
            "confirmar que tratamos seus dados e acessá-los;",
            "corrigir dado incompleto, inexato ou desatualizado;",
            "pedir anonimização, bloqueio ou eliminação de dado desnecessário ou tratado em desconformidade com a lei;",
            "pedir a portabilidade dos seus dados a outro fornecedor;",
            "eliminar dados tratados com base no seu consentimento;",
            "saber com que entidades compartilhamos seus dados;",
            "ser informado sobre a possibilidade de não consentir e o que isso implica;",
            "revogar o consentimento a qualquer momento;",
            "opor-se a tratamento feito com base em legítimo interesse.",
          ],
        },
        {
          tipo: "paragrafo",
          texto: `Para exercer qualquer um deles, escreva para ${CONTATO}. Respondemos em até 15 dias. Podemos pedir confirmação de identidade antes de atender — é proteção contra alguém se passar por você.`,
        },
      ],
    },
    {
      titulo: "8. Cookies",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "O uso de cookies e tecnologias equivalentes está detalhado na Política de Cookies, que faz parte deste documento.",
        },
      ],
    },
    {
      titulo: "9. Crianças e adolescentes",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "A plataforma é destinada a maiores de 18 anos. Não coletamos dados de menores de forma consciente. Se identificarmos cadastro de menor sem autorização dos responsáveis, a conta é encerrada e os dados eliminados.",
        },
      ],
    },
    {
      titulo: "10. Mudanças nesta Política",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "Podemos atualizar esta Política. Mudança relevante é avisada por email e dentro da plataforma, e a data de atualização no topo do documento é sempre a da última versão.",
        },
        {
          tipo: "paragrafo",
          texto:
            "Você também pode reclamar diretamente à Autoridade Nacional de Proteção de Dados (ANPD) pelo site gov.br/anpd.",
        },
      ],
    },
  ],
};

export const POLITICA_COOKIES: DocumentoLegal = {
  id: "cookies",
  titulo: "Política de Cookies",
  versao: VERSAO,
  atualizadoEm: ATUALIZADO_EM,
  resumo: "O que a Vetrex guarda no seu navegador, para que serve cada coisa e como você controla.",
  secoes: [
    {
      titulo: "1. O que são",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "Cookies são arquivos pequenos que um site grava no seu navegador. Usamos também duas tecnologias equivalentes: o localStorage, que guarda informação até você apagar, e o sessionStorage, que some quando a aba fecha.",
        },
        {
          tipo: "paragrafo",
          texto:
            "Nesta política, a palavra cookie cobre as três, já que o efeito para você é o mesmo: algo fica guardado no seu navegador.",
        },
      ],
    },
    {
      titulo: "2. Cookies essenciais",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "Sem eles a plataforma não funciona, e por isso não dependem de consentimento — são o que o artigo 7º, V da LGPD chama de necessário à execução do contrato.",
        },
        {
          tipo: "lista",
          itens: [
            "Sessão de autenticação (Supabase): mantém você logado entre uma página e outra. Sem esse, cada clique pediria a senha de novo. Fica no localStorage e dura até você sair.",
            "Preferência de tema: guarda se você escolheu claro ou escuro.",
            "Estado da calculadora: guarda no sessionStorage o que você digitou, para não perder o preenchimento ao trocar de aba dentro da ferramenta. Some ao fechar a aba.",
            "Segurança: controla o limite de tentativas de login para conter ataque de força bruta.",
          ],
        },
      ],
    },
    {
      titulo: "3. Cookies analíticos",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "Servem para entender quais funcionalidades são usadas e onde as pessoas travam, sempre em números agregados. Dependem do seu consentimento e podem ser recusados sem prejuízo nenhum ao uso da plataforma.",
        },
        {
          tipo: "paragrafo",
          texto:
            "Se e quando passarmos a usar ferramenta de análise de terceiro, esta política será atualizada com o nome do fornecedor e a finalidade, e o consentimento será pedido antes.",
        },
      ],
    },
    {
      titulo: "4. O que não usamos",
      blocos: [
        {
          tipo: "destaque",
          texto:
            "Não usamos cookies de publicidade, nem rastreamento entre sites, nem venda de perfil comportamental para redes de anúncio.",
        },
      ],
    },
    {
      titulo: "5. Como você controla",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "Todo navegador permite ver, bloquear e apagar o que os sites guardaram. Costuma estar em Configurações, seção Privacidade e segurança, item Cookies e dados de sites.",
        },
        {
          tipo: "paragrafo",
          texto:
            "Vale saber o efeito: bloquear os cookies essenciais impede o login, porque a sessão não tem onde ficar guardada. Apagar os dados do site desloga você e limpa o preenchimento não salvo da calculadora.",
        },
      ],
    },
    {
      titulo: "6. Mudanças nesta Política",
      blocos: [
        {
          tipo: "paragrafo",
          texto: `Se passarmos a usar cookies novos, principalmente de terceiros, atualizamos esta política e pedimos consentimento antes de ativá-los. Dúvidas: ${CONTATO}.`,
        },
      ],
    },
  ],
};

/** Ordem de leitura no modal de aceite e no rodapé. */
export const DOCUMENTOS_LEGAIS: DocumentoLegal[] = [
  TERMOS_DE_USO,
  POLITICA_PRIVACIDADE,
  POLITICA_COOKIES,
];

export const DOCUMENTOS_POR_ID: Record<DocumentoId, DocumentoLegal> = {
  termos: TERMOS_DE_USO,
  privacidade: POLITICA_PRIVACIDADE,
  cookies: POLITICA_COOKIES,
};

/** Rota pública de cada documento. */
export const ROTA_LEGAL: Record<DocumentoId, string> = {
  termos: "/termos",
  privacidade: "/privacidade",
  cookies: "/cookies",
};

/** Vai no metadata do signUp e vira uma linha por documento em `aceites_legais`. */
export const versoesAceitas = (): Record<DocumentoId, string> => ({
  termos: TERMOS_DE_USO.versao,
  privacidade: POLITICA_PRIVACIDADE.versao,
  cookies: POLITICA_COOKIES.versao,
});
