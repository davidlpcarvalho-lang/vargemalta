# Caminhos da Memória — Vargem Alta (ES)

Jogo educativo 3D (com suporte a óculos VR via WebXR) sobre a formação histórica do município capixaba de **Vargem Alta**, contada por quatro protagonistas:

| Capítulo | Protagonista | Trajetória | Época |
|---|---|---|---|
| I | **Aruê** | Povo Puri — o território antes da colonização; Aldeamento Imperial Afonsino (1845–1860) no contexto regional | Antes da colonização e séc. XIX |
| II | **Bento** | Da fazenda de café à comunidade quilombola de **Pedra Branca** (c. 1886), roda de jongo e caxambu | Década de 1880 |
| III | **Pietro** | Imigração italiana, lavoura de café e a chegada da ferrovia (Estrada de Ferro Leopoldina) | Final do séc. XIX |
| IV | **Youssef** | Migração libanesa, o mascate, Cachoeiro de Itapemirim e os nove comerciantes de 1927 | Anos 1920 |
| Epílogo | — | Lei Estadual nº 4.063 (6/5/1988) e instalação do município (1/1/1989) | — |

Tudo é procedural (personagens, relevo, Mata Atlântica, Pedra Branca, cachoeira, construções, trem, música e sons), sem downloads pesados.

## Rodar localmente

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # gera a pasta dist/
```

## Publicar na Vercel

**Com GitHub:** importe o repositório na Vercel (o `vercel.json` já configura Vite e a pasta `dist`).

**Sem GitHub (direto do computador):**

```bash
npm install
npx vercel          # faz login e cria o projeto (aceite as opções padrão)
npx vercel --prod   # publica a versão final
```

A pasta `dist/` também é um site estático pronto: pode ser enviada para qualquer hospedagem estática.

## Controles

- **Teclado/mouse:** WASD ou setas para andar · Shift corre · arrastar o mouse gira a câmera · roda do mouse aproxima · **E**/Espaço/clique para conversar e avançar · Esc pausa.
- **Celular/tablet:** joystick na esquerda, arrastar na direita gira a câmera, botão ✋ para interagir.
- **Gamepad:** analógico esquerdo anda, direito gira a câmera, A interage, Start pausa.
- **Óculos VR (Meta Quest e similares):** abra o site no navegador do óculos e toque em **Entrar em VR**. Analógico esquerdo anda (segure o grip para correr), analógico direito gira 30°, **gatilho** escolhe personagem, conversa e avança textos.

## Qualidade gráfica

A qualidade se ajusta sozinha (óculos e celulares usam o modo leve). Para forçar: `?q=low` (computadores fracos) ou `?q=high`.

## Fontes

Todos os arquivos ficam na raiz (sem pastas), para facilitar o envio pelo site do GitHub.

Ver a tela **Fontes e notas** no jogo. Personagens, falas, encontros e cenários são criações educativas baseadas na pesquisa de referência; fatos históricos seguem estritamente as fontes citadas.
