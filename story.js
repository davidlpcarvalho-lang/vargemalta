// Roteiro de "Caminhos da Memória — Vargem Alta (ES)".
// Fatos históricos seguem estritamente a pesquisa de referência (ver FONTES).
// Nomes, falas, encontros e tarefas são criações educativas (ver NOTAS).
import { riverX, trackX } from './terrain.js';

const E = (dx, z) => [riverX(z) + dx, z]; // a leste do rio
const W = (dx, z) => [riverX(z) - dx, z]; // a oeste do rio

export const P = {
  camp: W(40, -35), falls: W(76, -80), ridge: E(70, 24),
  casa: E(52, 40), senzala: E(48, 66), terreiro: E(34, 58), coffeeE: E(70, 48),
  quilombo: E(50, -48), fire: E(60, -58), pedra: E(112, -86),
  lote: W(40, 58), coffeeW: W(64, 60), ford: [riverX(30), 30],
  station: [trackX(0) + 6.85, 0], plaza: [trackX(0) - 7, -2], plat: [trackX(0) + 2.75, 0], shop: E(44, 12), capela: E(52, -18)
};

export const N = 'Narração';

export const CHAPTERS = [
  {
    id: 'puri', hero: 'arue', num: 'I', name: 'Aruê', people: 'Povo Puri',
    era: 'Sul capixaba · antes da colonização e século XIX', plaque: 'INDÍGENA',
    tagline: 'O território antes das cercas', time: 'morning', music: 'puri',
    spawn: [P.camp[0] + 7, P.camp[1] + 6],
    intro: {
      kicker: 'Capítulo I', title: 'Aruê e o território Puri',
      body: 'Muito antes de existir um município chamado Vargem Alta, estas serras cobertas de Mata Atlântica já eram território dos <b>Puris</b>. Havia trilhas, saberes, famílias e histórias. Você é Aruê, um jovem Puri.'
    },
    npcs: {
      anciã: { name: 'Anciã', pos: [P.camp[0] - 2, P.camp[1] - 3], look: 'puriElder' },
      tio: { name: 'Tio', pos: [P.falls[0] + 9, P.falls[1] + 3], look: 'puriMan', anim: 'fish' },
      prima: { name: 'Prima', pos: [P.camp[0] + 5, P.camp[1] - 6], look: 'puriWoman', anim: 'work' },
      menino: { name: 'Menino', pos: [P.camp[0] + 2, P.camp[1] + 4], look: 'puriChild' }
    },
    beats: [
      { type: 'talk', npc: 'anciã', obj: 'Fale com a anciã no acampamento', lines: [
        ['Anciã', 'Aruê, acordou junto com os pássaros? Venha. Hoje você vai caminhar pelo nosso território.'],
        ['Anciã', 'Os de fora dizem que estas matas são vazias. Não são. Cada trilha, cada rio e cada serra guardam a história do nosso povo.'],
        ['Anciã', 'Traga frutos de urucum. Com eles fazemos a tinta vermelha que usamos no corpo.']
      ] },
      { type: 'collect', item: 'urucum', obj: 'Colete frutos de urucum na mata',
        pts: [[-9, 13], [14, -15], [-17, -9], [19, 11]].map(([a, b]) => [P.camp[0] + a, P.camp[1] + b]) },
      { type: 'talk', npc: 'anciã', obj: 'Leve o urucum para a anciã', lines: [
        ['Anciã', 'Muito bem. A mata dá alimento, remédio, tinta e abrigo — para quem sabe ler os seus sinais.'],
        ['Anciã', 'Agora vá até a cachoeira, onde seu tio está pescando. Os rios também são caminhos.']
      ] },
      { type: 'talk', npc: 'tio', obj: 'Encontre seu tio na cachoeira', lines: [
        ['Tio', 'Os rios ligam lugares de caça, de coleta e de encontro. Nós nos movemos por este território conforme as estações.'],
        ['Tio', 'Escute a água, Aruê. Ela conhece estas serras há mais tempo que qualquer um de nós.'],
        ['Tio', 'Suba ao alto do morro, do outro lado do rio, e olhe para o sul. Dizem que algo está mudando.']
      ] },
      { type: 'goto', at: P.ridge, r: 6, obj: 'Atravesse o vau do rio e suba ao alto do morro', do: ['smoke'], lines: [
        ['Aruê', 'Fumaça... muitas colunas de fumaça, onde antes só havia mata.'],
        [N, 'No século XIX, a expansão de fazendas e povoados avançou sobre as terras indígenas do sul do Espírito Santo. Matas foram derrubadas, e os Puris foram pressionados em seus territórios.']
      ] },
      { type: 'talk', npc: 'anciã', obj: 'Volte ao acampamento e conte à anciã', lines: [
        ['Anciã', 'Eu também vi. E há notícias de um aldeamento do governo, para onde estão levando parentes nossos.'],
        [N, 'Entre 1845 e 1860, no Aldeamento Imperial Afonsino, no sul capixaba, Puris foram submetidos ao trabalho compulsório: sua liberdade era limitada e sua mão de obra era usada à força em serviços públicos.'],
        [N, 'Ainda assim, os Puris desenvolveram estratégias de resistência diante dessas imposições, como mostram Oliveira e Costa (2019).'],
        ['Anciã', 'Lembre-se, Aruê: podem trocar os nomes desta terra, mas não apagam quem esteve aqui primeiro.']
      ] }
    ],
    outro: {
      title: 'Antes de tudo, havia gente aqui',
      body: 'Os Puris são sujeitos históricos da formação desta região. Reconhecer sua presença é recusar a ideia de que o território de Vargem Alta era uma “terra vazia” antes da colonização.',
      note: 'O Aldeamento Imperial Afonsino (1845–1860) faz parte do contexto regional do sul capixaba; o jogo não afirma que ele estivesse no território atual de Vargem Alta.'
    }
  },
  {
    id: 'bento', hero: 'bento', num: 'II', name: 'Bento', people: 'Comunidade quilombola de Pedra Branca',
    era: 'Sul capixaba · década de 1880', plaque: 'ESCRAVIZADO',
    tagline: 'Da fazenda à liberdade em Pedra Branca', time: 'afternoon', music: 'bento',
    spawn: [P.terreiro[0] + 4, P.terreiro[1] - 6],
    intro: {
      kicker: 'Capítulo II', title: 'Bento e o caminho para Pedra Branca',
      body: 'Fazenda de café, década de 1880. Bento foi <b>escravizado</b> — uma condição imposta pela violência, que não define quem ele é. Bento tem nome, família, memória e um plano.'
    },
    npcs: {
      rosa: { name: 'Tia Rosa', pos: [P.senzala[0] - 5, P.senzala[1] - 6], look: 'blackElderF' },
      joao: { name: 'João', pos: [P.terreiro[0] - 6, P.terreiro[1] + 4], look: 'blackMan', anim: 'work' },
      benedita: { name: 'Benedita', pos: [riverX(64) + 9, 64], look: 'blackWoman', anim: 'work' },
      tome: { name: 'Seu Tomé', pos: [P.coffeeE[0] - 6, P.coffeeE[1] - 8], look: 'blackElderM', anim: 'work' },
      luzia: { name: 'Dona Luzia', pos: [P.quilombo[0] - 4, P.quilombo[1] + 5], look: 'blackWoman2', hidden: true },
      tambor1: { name: 'Tamboreiro', pos: [P.fire[0] - 4.2, P.fire[1] + 0.5], look: 'blackMan2', anim: 'drum', hidden: true },
      tambor2: { name: 'Tamboreiro', pos: [P.fire[0] - 3.4, P.fire[1] - 2.6], look: 'blackElderM2', anim: 'drum', hidden: true }
    },
    beats: [
      { type: 'talk', npc: 'rosa', obj: 'Fale com Tia Rosa, perto da senzala', lines: [
        ['Tia Rosa', 'Bento, fala baixo. Dizem que tem gente vivendo livre lá para as bandas da Pedra Branca.'],
        ['Bento', 'Então é verdade... gente que saiu das fazendas Pedra Branca, São Pedro e Prosperidade.'],
        ['Tia Rosa', 'Ninguém vai sozinho. Avise os nossos, sem chamar atenção.']
      ] },
      { type: 'visit', obj: 'Avise os companheiros', npcs: [
        ['joao', 'Conte comigo, Bento. Quando a lua sumir atrás do morro, a gente vai.'],
        ['benedita', 'Vou levar minha filha. Ela vai crescer livre.'],
        ['tome', 'Conheço a trilha pela mata. Eu guio vocês até a Pedra Branca.']
      ] },
      { type: 'goto', at: E(60, 26), r: 5, obj: 'Encontre o grupo na beira da mata', do: ['time:night', 'gather'], lines: [
        [N, 'Fugir era muito arriscado. Ainda assim, muitas pessoas escravizadas enfrentaram o cativeiro fugindo e criando novos lugares para viver.'],
        ['Seu Tomé', 'Sigam os vaga-lumes e não se afastem. Pela mata, rente ao morro.']
      ] },
      { type: 'trail', obj: 'Guie o grupo pela trilha até a Pedra Branca', follow: ['rosa', 'joao', 'benedita', 'tome'],
        pts: [E(64, 10), E(62, -8), E(58, -26), E(54, -40)], do: ['time:dawn', 'free', 'arrive'], lines: [
        ['Seu Tomé', 'Olhem: a Pedra Branca. Aqui a mata protege a gente.'],
        [N, 'Segundo o Inventário Nacional de Referências Culturais do IPHAN (2014), por volta de 1886 pessoas saídas das fazendas Pedra Branca, São Pedro e Prosperidade ocuparam esta área. Ligadas às fugas do cativeiro, formaram agrupamentos que abrigavam famílias em ranchos.'],
        ['Dona Luzia', 'Sejam bem-vindos. Aqui tem lugar para quem chega. Mas cada família levanta o seu rancho.'],
        ['Bento', 'Aqui ninguém é dono da gente.']
      ] },
      { type: 'collect', item: 'sape', obj: 'Junte taquara e sapê para o rancho', do: ['build:rancho', 'time:day'],
        pts: [[-14, 6], [-10, -12], [12, 14], [16, -6], [2, 18]].map(([a, b]) => [P.quilombo[0] + a, P.quilombo[1] + b]), lines: [
        ['Benedita', 'Um teto nosso. Pequeno, mas nosso.'],
        [N, 'A comunidade ficou conhecida como São Pedro. Hoje, a comunidade quilombola de Pedra Branca guarda essa história em sua memória.']
      ] },
      { type: 'talk', npc: 'rosa', obj: 'Ao anoitecer, vá até a roda na fogueira', pre: ['time:dusk', 'jongo'], lines: [
        ['Tia Rosa', 'Bate o tambor, Bento! Hoje tem caxambu.'],
        [N, 'O inventário do IPHAN registra memórias de Amélia Santos da Cunha e descreve celebrações com rodas de jongo e caxambu, tambores, fogueiras e o preparo coletivo de alimentos.'],
        [N, 'Essas práticas mantêm vivos os laços comunitários e a transmissão de saberes. Hoje, o grupo “Caxambu Fé Raça em um Só Coração — Pedra Branca” segue celebrando essa herança.'],
        ['Bento', 'A liberdade, a gente também faz junto.']
      ] }
    ],
    outro: {
      title: 'Resistência que virou comunidade',
      body: 'Em 13 de maio de 1888, a Lei Áurea aboliu a escravidão no Brasil. Mas a liberdade também foi construída antes e depois dela — por quem resistiu, fugiu e fez comunidades como a de Pedra Branca.',
      note: 'Bento é um personagem ficcional e não corresponde a um fundador historicamente identificado. A data de 1886 é aproximada, conforme a própria fonte do IPHAN.'
    }
  },
  {
    id: 'pietro', hero: 'pietro', num: 'III', name: 'Pietro', people: 'Imigração italiana',
    era: 'Sul capixaba · final do século XIX', plaque: 'ITALIANO',
    tagline: 'Terra, lavoura e trilhos', time: 'morning', music: 'pietro',
    spawn: W(30, 84),
    intro: {
      kicker: 'Capítulo III', title: 'Pietro e a terra nova',
      body: 'Final do século XIX. Depois da longa travessia do Atlântico, famílias italianas chegam às serras do sul capixaba para trabalhar na lavoura. Você é Pietro, e sua família acaba de chegar.'
    },
    npcs: {
      papa: { name: 'Papà Antonio', pos: [P.lote[0] + 5, P.lote[1] + 7], look: 'italianMan' },
      mamma: { name: 'Mamma Lucia', pos: [P.lote[0] + 8, P.lote[1] + 4], look: 'italianWoman', anim: 'work' },
      bianca: { name: 'Bianca', pos: [P.lote[0] + 10, P.lote[1] + 7], look: 'italianChild' },
      benedita: { name: 'Dona Benedita', pos: W(20, 40), look: 'blackWoman' },
      tropeiro: { name: 'Seu Zé', pos: [P.plat[0], P.plat[1] + 7], look: 'tropeiro', hidden: true }
    },
    beats: [
      { type: 'talk', npc: 'papa', obj: 'Encontre seu pai no lote da família', lines: [
        ['Papà Antonio', 'Pietro, guarda! Olha só estas montanhas... Lembram as da nossa terra, mas aqui tudo é mais verde.'],
        ['Pietro', 'É aqui que vamos morar, papà?'],
        ['Papà Antonio', 'É aqui que vamos trabalhar. Comece pelas mudas de café, ali na encosta.']
      ] },
      { type: 'collect', item: 'cova', obj: 'Plante as mudas de café na encosta', do: ['grow'],
        pts: [[-5, -8], [-1, -2], [3, 4], [-6, 6], [5, -4]].map(([a, b]) => [P.coffeeW[0] + a, P.coffeeW[1] + b]), lines: [
        ['Mamma Lucia', 'Café demora anos para dar fruto. Até lá, plantamos milho e feijão para comer.']
      ] },
      { type: 'talk', npc: 'benedita', obj: 'Converse com a vizinha, Dona Benedita', lines: [
        ['Dona Benedita', 'Bom dia, moço. Vocês chegaram agora, né?'],
        ['Pietro', 'Sì... sim! Ainda não sei falar direito.'],
        ['Dona Benedita', 'Aprende. Aqui a gente planta mandioca e milho na encosta e sabe onde a água brota. Quem é daqui ensina, quem chega aprende.'],
        [N, 'A formação de Vargem Alta foi feita de encontros entre povos — e também de desigualdades e disputas pela terra.']
      ] },
      { type: 'collect', item: 'lenha', obj: 'Junte madeira para a casa da família', do: ['build:house'],
        pts: [[-16, -14], [-22, -4], [-12, -22], [-26, 6]].map(([a, b]) => [P.lote[0] + a, P.lote[1] + b]), lines: [
        ['Papà Antonio', 'Uma casa nossa! Agora a família tem onde crescer.']
      ] },
      { type: 'card', do: ['years'], kicker: 'Anos depois…', title: 'Chegam os trilhos',
        body: 'O café plantado por famílias como a de Pietro começa a produzir. Com o tempo, a ferrovia transforma a região.' },
      { type: 'collect', item: 'saca', obj: 'Pegue as sacas de café no terreiro da casa',
        pts: [[3, -3], [5, -2], [4, -5]].map(([a, b]) => [P.lote[0] + a, P.lote[1] + b]) },
      { type: 'goto', at: [P.plat[0], P.plat[1] + 4], r: 4, obj: 'Leve as sacas até a estação, atravessando a ponte', do: ['train'], lines: [
        ['Seu Zé', 'Antes, o café descia no lombo de burro, devagar. Agora segue pelos trilhos!'],
        [N, 'O perfil histórico da Prefeitura de Vargem Alta destaca a Estrada de Ferro Leopoldina no desenvolvimento local e na formação de núcleos populacionais.'],
        [N, 'No final do século XIX, a chegada de imigrantes italianos esteve ligada à ocupação agrícola da região. Seus descendentes fazem parte da identidade de Vargem Alta.'],
        ['Pietro', 'A lavoura que plantamos chegou longe, papà.']
      ] }
    ],
    outro: {
      title: 'Trabalho, terra e trilhos',
      body: 'A imigração italiana, no final do século XIX, ligou-se à ocupação agrícola da região. Mais tarde, a ferrovia ajudou a escoar a produção e a formar núcleos de povoamento.',
      note: 'A família de Pietro, sua propriedade e suas experiências foram criadas para o jogo. A ferrovia aparece como transformação posterior à chegada da família.'
    }
  },
  {
    id: 'youssef', hero: 'youssef', num: 'IV', name: 'Youssef', people: 'Migração libanesa',
    era: 'Vargem Alta · anos 1920', plaque: 'LIBANÊS',
    tagline: 'Comércio, caminhos e vínculos', time: 'afternoon', music: 'youssef',
    spawn: [P.plat[0], P.plat[1] - 3],
    intro: {
      kicker: 'Capítulo IV', title: 'Youssef, o mascate',
      body: 'Anos 1920. Das montanhas do Líbano, migrantes atravessaram o mar e fizeram do comércio um caminho. Muitos começaram como <b>mascates</b>, levando mercadorias de porta em porta. Você é Youssef.'
    },
    npcs: {
      elias: { name: 'Primo Elias', pos: [P.plat[0], P.plat[1] + 2], look: 'lebaneseMan' },
      pietro: { name: 'Seu Pietro', pos: [P.lote[0] + 6, P.lote[1] + 6], look: 'italianOld' },
      ana: { name: 'Dona Ana', pos: [P.quilombo[0] + 3, P.quilombo[1] + 4], look: 'blackWoman2' },
      zelia: { name: 'Dona Zélia', pos: [P.casa[0] - 11, P.casa[1] - 2], look: 'ladyF' },
      menina: { name: 'Menina', pos: [P.shop[0] - 5, P.shop[1] - 6], look: 'blackChild' }
    },
    beats: [
      { type: 'talk', npc: 'elias', obj: 'Fale com o Primo Elias na plataforma', do: ['depart'], lines: [
        ['Primo Elias', 'Ahlan, Youssef! Bem-vindo a Vargem Alta. Fez boa viagem desde Cachoeiro?'],
        ['Youssef', 'Longa, primo. Mas o trem encurta o caminho.'],
        ['Primo Elias', 'Cachoeiro de Itapemirim é o grande centro de comércio do sul. As mercadorias passam por lá e seguem pelos trilhos.'],
        ['Primo Elias', 'Aqui está sua mala de mascate: tecidos, linhas, agulhas e botões. Vá de casa em casa. O comércio começa pela confiança.'],
        [N, 'Quando muitos emigraram, o Líbano fazia parte do Império Otomano — por isso, no Brasil, libaneses e sírios eram frequentemente chamados de “turcos”.']
      ] },
      { type: 'visit', obj: 'Visite os fregueses pela região', npcs: [
        ['pietro', 'Chita para a festa da capela? Minha mãe vai gostar. E traga notícias de Cachoeiro!'],
        ['ana', 'Linha e agulha boas assim é difícil achar. Volte no mês que vem, moço.'],
        ['zelia', 'Pode trazer mais botões e tecidos? Pago na colheita do café.']
      ] },
      { type: 'goto', at: [P.plat[0], P.plat[1] + 1], r: 4, obj: 'Volte à estação: chegam caixas de Cachoeiro', do: ['train'], lines: [
        ['Youssef', 'As caixas chegaram! Com essas mercadorias dá para abrir uma venda.']
      ] },
      { type: 'collect', item: 'caixa', obj: 'Pegue as caixas na plataforma',
        pts: [-9, -5, 5, 9].map(dz => [P.plat[0] + 0.4, P.plat[1] + dz]) },
      { type: 'goto', at: [P.shop[0] - 7, P.shop[1]], r: 4, obj: 'Leve as caixas até a venda, em frente à estação', do: ['build:shop'], lines: [
        ['Youssef', 'Tecidos na prateleira, botões no balcão, sacas na porta... A venda está pronta!']
      ] },
      { type: 'talk', npc: 'elias', obj: 'Mostre a venda ao Primo Elias', pre: ['move:elias:shop'], lines: [
        ['Primo Elias', 'Mabruk, primo! Agora você tem endereço: as pessoas sabem onde te encontrar.'],
        [N, 'Segundo Mintaha Alcuri Campos (Revista IJSN, 1985), em 1927 havia nove comerciantes libaneses registrados em Vargem Alta. O comércio no sul capixaba dependia de Cachoeiro de Itapemirim e das conexões ferroviárias.'],
        ['Youssef', 'Cheguei como estrangeiro. Fiquei como vizinho.']
      ] }
    ],
    outro: {
      title: 'Comércio, caminhos e vínculos',
      body: 'Mascates e comerciantes libaneses ligaram povoados, fazendas e comunidades, tecendo relações de confiança e fazendo do comércio uma forma de pertencer ao lugar.',
      note: 'Youssef é ficcional: não foi identificado documentalmente um comerciante com esse nome. A bandeira com o cedro, vista no memorial, foi adotada pelo Líbano em 1943 e aparece como símbolo de identidade.'
    }
  }
];

export const EPILOGUE = {
  kicker: 'Epílogo', title: 'Vargem Alta',
  body: 'Em <b>6 de maio de 1988</b>, a Lei Estadual nº 4.063 elevou Vargem Alta à categoria de município, desmembrado de Cachoeiro de Itapemirim. A instalação ocorreu em <b>1º de janeiro de 1989</b>.<br><br>Mas a formação de Vargem Alta começou muito antes da lei: com os Puris, com a população negra e a comunidade de Pedra Branca, com imigrantes italianos e libaneses. Uma história de trabalho, encontros, conflitos, resistências e memória.'
};

export const SOURCES = [
  'OLIVEIRA, Tatiana Gonçalves de; COSTA, Henrique Antônio Valadares. <i>Os Puri no sul do Espírito Santo: ocupação, territorialização e trabalho compulsório</i>. 2019.',
  'IPHAN. Inventário Nacional de Referências Culturais — ficha dos bens culturais de Vargem Alta (Comunidade Quilombola de Pedra Branca; memórias de Amélia Santos da Cunha). 2014.',
  'IPHAN. Cadastro do grupo “Caxambu Fé Raça em um Só Coração — Pedra Branca”.',
  'PREFEITURA MUNICIPAL DE VARGEM ALTA. Perfil histórico do município (imigração italiana e Estrada de Ferro Leopoldina).',
  'CAMPOS, Mintaha Alcuri. A trajetória do migrante libanês no Espírito Santo. <i>Revista IJSN</i>, ano IV, n. 2, 1985. Reproduzido no portal Morro do Moreno.',
  'IBGE. Histórico do município de Vargem Alta (Lei Estadual nº 4.063, de 6 de maio de 1988; instalação em 1º de janeiro de 1989).'
];

export const NOTES = 'Levantamento bibliográfico e documental feito pela internet, sem entrevistas, pesquisa presencial ou consulta direta a arquivos originais. Os nomes dos protagonistas e dos demais personagens, suas falas, encontros, tarefas e a disposição das construções foram criados para esta experiência educativa. Cenários, roupas e adereços são interpretações artísticas — inclusive a representação Puri, inspirada na imagem de referência — e não reconstruções documentais da geografia ou da arquitetura de época.';
