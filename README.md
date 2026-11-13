# ARTECOOL — protótipo web v1.13

Edição 2026. Site estático com HTML, CSS e JavaScript. Sirva esta pasta por HTTP para revisar as interações. Não é necessário instalar dependências ou executar build para hospedar. Recursos usam caminhos relativos e foram verificados sob o prefixo /artecool/.

## GitHub Pages

Envie o conteúdo desta pasta à raiz do repositório e configure Pages para a raiz da branch desejada. .nojekyll está incluído. O estado da publicação é acompanhado no projeto; noindex/nofollow permanecem nesta distribuição.

## Conteúdo confirmado

Período geral/Royalty 13/11–17/12; intervenções 13/11–13/12; Ópera 20/11, abertura às 18h; Cassol/Menor’D em 02/12; Mica Raddi; classificação livre em todas as ações. De 08 a 17/12, apenas exposição no Royalty. Faltam horários e ordem dos shows, detalhes das intervenções e condições de inscrição/vagas/custo das oficinas. Entrada franca confirmada na Ópera e na exposição do Royalty de08–17/12, sem estender às demais atividades. Canal: @artecoolx.

## Identidade e arquivos

Logo original em curvas. Roc Grotesk Wide nos títulos e Roc Grotesk na leitura, usando arquivos OTF originais fornecidos por Taw. Licença do pacote preservada em assets/fonts/RocGrotesk-license.html; comprovação do escopo de publicação web/domínio não foi fornecida. Não há conversão de subconjuntos PDF nem alegação de licença aberta.

Rodapé com Lei Rouanet, Mili, Sanepar, Ministério da Cultura e Governo Federal. Mobile reorganiza os grupos originais em tamanho maior.

index.html é a página; styles.css contém o sistema visual; app.js contém interações; motion.js compartilha a preferência de movimento reduzido; mosaic.js alterna artistas e formas da abertura; plastic-loader.js, foreground-scene.js e plastic-scene.js carregam e executam a peça 3D elástica em primeiro plano, com estilo em plastic.css; assets reúne os recursos usados. A peça 3D, com50% da escala inicial e trajeto nos espaços livres, atravessa o conteúdo em uma camada fixa e usa Three.js 0.186.1/MIT, copiado localmente com licença em assets/vendor/three/LICENSE.txt, sem CDN. A peça principal mantém presença contínua, sem fade de desvio; as companheiras entram e saem com pop elástico de escala. As transformações seguem as seções, sem depender da altura acumulada da página. O grupo de destaque fica contido na seção. No final, o disco amarelo diminui e estaciona ao lado do controle no rodapé, com movimento lento. Mobile: uma peça pequena em zigue-zague à direita, com destaque e chegada amarela no rodapé; limite de30 quadros/s e densidade de pixels1. Controle compacto no cabeçalho e escolha persistente. Movimento reduzido, economia de dados e falhas de WebGL mantêm a alternativa vetorial; a ativação explícita está disponível. Redução de movimento é respeitada por padrão; o visitante pode ativar explicitamente somente esta experiência. Original do acervo e documentação interna não estão neste pacote. version-manifest.json registra hashes da versão.

## Revisões de conteúdo e mosaico

Ordem Royalty Café → Intervenções urbanas → Ópera de Arame. Galeria alfabética com24 entradas e24 retratos; DJ Spena usa a foto do perfil oficial indicada por Taw. Babs tem destaque como DJ residente. Intervenções concentram os três artistas e os cinco bairros, sem inventar correspondências individuais. Lâminas redundantes removidas.

Mosaico: fotos sorteadas a cada2,5s com fade suave; alternam no mesmo módulo ou em outro. Os seis blocos se reorganizam a cada quatro trocas, preservando nomes, datas e locais. A rotação/espalhamento antigos por rolagem foram removidos; a grade permanece orientada. Os controles usam posição estável e o3D evita trabalho de layout quando desativado e reutiliza geometria em repouso. A preferência de pausa é persistente; em movimento reduzido, o botão permite ativar somente os fades. Pausa/retorno por botão, suspensão fora da abertura e respeito ao movimento reduzido. Imagens decodificadas antes da troca; falha conserva o conteúdo anterior.

A autorização de envio por Taw não resolve as informações ainda pendentes do evento.
