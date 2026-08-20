# -*- coding: utf-8 -*-
"""Cards de anuncio do rebrand Vetrex. Usa os tokens HSL do src/index.css."""
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

RAIZ = "c:/Users/dep.log1/Downloads/gastovisionmkt"
SAIDA = RAIZ + "/docs/anuncio"

BG      = (10, 10, 10)      # --background 0 0% 4%
FG      = (245, 245, 245)   # --foreground 0 0% 96%
MUTED   = (153, 153, 153)   # --muted-foreground 0 0% 60%
PRIMARY = (237, 44, 44)     # --primary 0 84% 55%
ACCENT  = (184, 30, 30)     # --accent  0 72% 42%
BORDER  = (41, 41, 41)      # --border  0 0% 16%

F = "C:/Windows/Fonts/"
def fonte(peso, tam):
    arq = {"bold": "segoeuib.ttf", "reg": "segoeui.ttf", "light": "segoeuil.ttf"}[peso]
    return ImageFont.truetype(F + arq, tam)

def fundo(w, h, focos):
    """Preto com halos vermelhos radiais, como o degrade do app."""
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    base = np.zeros((h, w, 3), np.float32)
    base[:] = BG
    for cx, cy, raio, forca in focos:
        d = np.sqrt(((x - cx) / raio) ** 2 + ((y - cy) / raio) ** 2)
        g = np.clip(1.0 - d, 0, 1) ** 2 * forca
        for i, c in enumerate(PRIMARY):
            base[:, :, i] += g * c
    return Image.fromarray(np.clip(base, 0, 255).astype(np.uint8))

def arco(img, cx, cy, rx, ry, largura, alfa):
    """Feixe vermelho borrado atravessando o card."""
    cam = Image.new("L", img.size, 0)
    d = ImageDraw.Draw(cam)
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], outline=255, width=largura)
    cam = cam.filter(ImageFilter.GaussianBlur(largura * 1.6))
    cor = Image.new("RGB", img.size, PRIMARY)
    return Image.composite(Image.blend(img, cor, alfa), img, cam.point(lambda v: v))

def espacado(d, xy, texto, font, fill, tracking):
    """PIL nao tem letter-spacing, entao desenha caractere a caractere."""
    x, y = xy
    for ch in texto:
        d.text((x, y), ch, font=font, fill=fill)
        x += d.textlength(ch, font=font) + tracking
    return x - tracking

def larg_espacado(d, texto, font, tracking):
    return sum(d.textlength(c, font=font) for c in texto) + tracking * (len(texto) - 1)

def quebrar(d, texto, font, limite):
    linhas, atual = [], ""
    for p in texto.split():
        teste = (atual + " " + p).strip()
        if d.textlength(teste, font=font) <= limite:
            atual = teste
        else:
            linhas.append(atual); atual = p
    if atual:
        linhas.append(atual)
    return linhas


# ---------------------------------------------------------------- card 1
W, H = 1080, 1080
img = fundo(W, H, [(760, 190, 620, 0.30), (150, 900, 560, 0.20)])
img = arco(img, 540, 1560, 1150, 900, 12, 0.55)
d = ImageDraw.Draw(img)

f_kicker = fonte("bold", 25)
larg = larg_espacado(d, "A GASTO VISION AGORA É", f_kicker, 7)
espacado(d, ((W - larg) / 2, 250), "A GASTO VISION AGORA É", f_kicker, MUTED, 7)

logo = Image.open(RAIZ + "/src/assets/logo-horizontal.png").convert("RGBA")
lw = 640
logo = logo.resize((lw, int(logo.height * lw / logo.width)), Image.LANCZOS)
img.paste(logo, ((W - lw) // 2, 330), logo)

d.line([(W / 2 - 60, 560), (W / 2 + 60, 560)], fill=PRIMARY, width=4)

f_h1 = fonte("bold", 54)
t = "A calculadora virou plataforma"
d.text(((W - d.textlength(t, font=f_h1)) / 2, 626), t, font=f_h1, fill=FG)

f_sub = fonte("reg", 32)
y = 712
for ln in ["Nove novidades, seis marketplaces,", "e o mesmo acesso para quem já comprou."]:
    d.text(((W - d.textlength(ln, font=f_sub)) / 2, y), ln, font=f_sub, fill=MUTED)
    y += 46

# selo dos marketplaces cobertos
f_selo = fonte("bold", 24)
selo = "SHOPEE   MERCADO LIVRE   AMAZON   MAGALU   TIKTOK   SHEIN"
lw2 = larg_espacado(d, selo, f_selo, 3)
d.rounded_rectangle([(W - lw2) / 2 - 34, 872, (W + lw2) / 2 + 34, 940], 34, outline=BORDER, width=2)
espacado(d, ((W - lw2) / 2, 892), selo, f_selo, (200, 200, 200), 3)

img.save(SAIDA + "/vetrex-rebrand.png")
print("vetrex-rebrand.png", img.size)


# ---------------------------------------------------------------- card 2
W, H = 1080, 1350
img = fundo(W, H, [(900, 120, 600, 0.26), (100, 1250, 560, 0.18)])
d = ImageDraw.Draw(img)

marca = Image.open(RAIZ + "/src/assets/logo-mark.png").convert("RGBA")
mh = 52
marca = marca.resize((int(marca.width * mh / marca.height), mh), Image.LANCZOS)
img.paste(marca, (72, 78), marca)

f_kick = fonte("bold", 24)
espacado(d, (72 + marca.width + 24, 92), "O QUE ENTROU", f_kick, PRIMARY, 6)

f_h1 = fonte("bold", 56)
d.text((72, 168), "Nove coisas que", font=f_h1, fill=FG)
d.text((72, 232), "antes não existiam", font=f_h1, fill=FG)

itens = [
    ("Comparador", "Os seis marketplaces lado a lado, ordenados por lucro"),
    ("Precificação reversa", "Arrasta até a margem que quer e o preço aparece"),
    ("Calculadora de anúncios", "ROAS de equilíbrio e teto de ACOS do seu produto"),
    ("Painel de estoque", "Quanto está parado, quanto vale, quanto sobra de lucro"),
    ("Produtos salvos", "Guardam o estoque e viram cálculo em outra plataforma"),
    ("Embalagem e etiqueta", "Cadastra uma vez e reaproveita em todo cálculo"),
    ("Perfil com regime", "Alíquota efetiva do Simples, não a nominal da tabela"),
    ("RPA de afiliados", "Relatório da Shopee vira recibo em PDF com INSS e IRRF"),
    ("Aviso de taxa", "A regra mudou, seus produtos salvos recalculam sozinhos"),
]

f_t = fonte("bold", 31)
f_d = fonte("reg", 25)
y = 348
for i, (titulo, desc) in enumerate(itens, 1):
    d.ellipse([72, y + 12, 82, y + 22], fill=PRIMARY)
    n = f"{i:02d}"
    d.text((104, y + 2), n, font=fonte("bold", 22), fill=ACCENT)
    d.text((156, y), titulo, font=f_t, fill=FG)
    d.text((156, y + 42), desc, font=f_d, fill=MUTED)
    y += 106
    if i < len(itens):
        d.line([(156, y - 24), (W - 72, y - 24)], fill=BORDER, width=1)

img.save(SAIDA + "/vetrex-novidades.png")
print("vetrex-novidades.png", img.size)
