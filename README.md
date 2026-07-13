# 🧇 Inglês! 🇧🇷→🇬🇧

Curso de inglês gratuito e de código aberto para brasileiros, construído com o mesmo motor
pedagógico comprovado das três versões de neerlandês:
[nederlands-voor-brazilianen](https://github.com/Cloesick/nederlands-voor-brazilianen),
[nederlands-para-hispanos](https://github.com/Cloesick/nederlands-para-hispanos), e
[nederlands-para-ingleses](https://github.com/Cloesick/nederlands-para-ingleses).

## O que tem
- Lições com frases alinhadas por cores entre português e inglês (mesmo tipo de palavra = mesmo
  estilo nas duas línguas)
- Exercícios estilo Babbel: múltipla escolha, ouvir, completar, ordenar, associar
- Foco em armadilhas reais para brasileiros: falsos cognatos, uso de a/an/the, o auxiliar do/does
- Flashcards com repetição espaçada
- PWA instalável, funciona offline
- Sem cadastro, progresso salvo só no aparelho

## Estado atual
Lançamento inicial com nível A1 (2 lições: apresentações, artigos e falsos cognatos). Cresce nível
por nível, igual às versões de neerlandês.

## Stack
Vanilla JS, sem build, sem framework. `/api` contém funções serverless da Vercel (Stripe +
Supabase) para o Premium opcional, ainda não ativado.

## Desenvolvimento local
```
python -m http.server 8000
```
E abra `http://localhost:8000`.
