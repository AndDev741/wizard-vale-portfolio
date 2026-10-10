---
title: "Contando com threads, do Java 8 ao 27"
summary: "Quatro threads somando num mesmo contador. Escrevi esse contador de sete jeitos, rodei em todo JDK do 8 ao 27, medi com JMH e depois passei tudo para threads virtuais. O count++ perde incrementos em todos eles, e a ordem dos contadores seguros nunca mudou. As threads virtuais foram o que mais mudou, e o synchronized ficou mais lento sob disputa pesada no 25 e no 27."
emoji: "🧵"
date: 2026-10-09
tags: [java, concurrency, jvm, benchmark]
---

**Minha máquina**: um AMD Ryzen 7 5700U, 8 núcleos com 2 threads cada, ou seja, 16 threads de hardware. Os JDKs são builds do Amazon Corretto instalados pelo SDKMAN: 8.0.504, 17.0.18, 21.0.12, 25 e 27.0.0.

---

# A pergunta

Várias threads somam num mesmo contador ao mesmo tempo. O que cada versão do Java, do 8 ao 27, muda nisso?

Escrevi o contador de sete jeitos e rodei cada um no Java 8, 17, 21, 25 e 27. Primeiro com cronômetros simples no `main()`, depois com JMH. No fim passei o teste inteiro para threads virtuais.

## A resposta curta

- **A corretude não mudou.** O contador simples e o `volatile` perdem incrementos em todo JDK, e os cinco contadores seguros dão o número exato em todo JDK. O `count++` continua sendo uma leitura e uma escrita separadas, e o Java Memory Model por trás disso é o mesmo desde o Java 5.
- **O ranking também não saiu do lugar.** Com 16 threads disputando um contador, o LongAdder faz uns 2.000 incrementos por µs. O `ReentrantLock` não justo e o `AtomicInteger` fazem de 60 a 100, o `synchronized` de 8 a 16 e o lock justo uns 0,2. Essa ordem vale em todo JDK. Com uma thread só, cada contador fica a poucos por cento do mesmo número nos cinco.
- **As threads virtuais (Java 21) são a grande novidade.** Com 10.000 threads, a mesma contagem cai de uns 800 ms em threads de plataforma para algo entre 6 e 183 ms.
- **O Java 24 fez o `synchronized` funcionar com threads virtuais (JEP 491).** 1.000 threads virtuais dormindo dentro de um `synchronized` levam 1.267 ms no Java 21 e uns 22 ms no 25 e no 27.
- **Uma coisa ficou mais lenta.** O `synchronized` com 4 ou 16 threads brigando por ele fica uns 25 a 35% mais lento no 25 e no 27 do que do 8 ao 21. Meu melhor palpite é a mesma mudança do Java 24. Não provei.
- **A inicialização ficou bem mais rápida.** A primeira lambda custa uns 65 ms no Java 8 e 9 ms no Java 21.

# O bug

Todo teste deste texto tem o mesmo formato. 4 threads dividem um contador e cada uma chama `increment()` 1.000.000 de vezes, então o total devia dar 4.000.000.

O primeiro contador não tem proteção nenhuma:

```java
int count = 0;

public void increment() {
    count++;
}
```

O `count++` lê o campo e depois escreve de volta esse valor mais um. Outra thread pode rodar entre a leitura e a escrita:

```
count = 41
Thread A lê 41
Thread B lê 41
Thread A escreve 42
Thread B escreve 42
-> dois incrementos, o count só subiu um
```

Rodei 10 vezes em cada JDK:

| | Média | Pior execução | Melhor execução |
|---|---|---|---|
| Java 8 | 3.293.487 (18% perdidos) | 66% perdidos | 4% perdidos |
| Java 21 | 3.536.310 (12% perdidos) | 27% perdidos | 6% perdidos |

Um lote anterior de 10 no Java 21 perdeu 31% em média. Então o mesmo JDK variou mais entre dois lotes do que a diferença entre o Java 8 e o 21 nesta tabela. Toda execução nos dois perdeu incrementos. O JIT e o escalonador do sistema operacional mudam quantos somem numa execução, e nada do que eles fazem deixa o contador correto.

# Como eu me enganei primeiro

Antes de ver a corrida eu acertei o número pelo motivo errado várias vezes. Tudo isto compila e parece razoável.

**10.000 threads, um incremento cada.** Dava 10.000 na maioria das vezes e 9.999 de vez em quando. Iniciar uma thread custa dezenas de microssegundos e o `count++` leva poucos nanossegundos, então cada thread terminava antes de a próxima começar e elas quase nunca se sobrepunham. Uma corrida precisa de threads no mesmo campo no mesmo instante, ou seja, poucas threads com muito trabalho cada. O 9.999 conta mesmo assim. Uma corrida que aparece uma vez em vinte execuções passa nos testes e depois falha em produção, sob carga.

**`run()` no lugar de `start()`.** Sempre exatamente 4.000.000. O `run()` executa a lambda na thread que chamou, a `main`, e não cria thread nenhuma. Só o `start()` cria. Imprimir `Thread.currentThread().getName()` dentro da lambda mostra isso.

**`join()` logo depois de cada `start()`.** A `main` espera cada thread terminar antes de iniciar a próxima, então elas rodam uma de cada vez. Inicie todas primeiro e faça o join depois.

**Nenhum `join()`.** Deu 40.000, depois 58.894 e às vezes 4.000.000. A `main` imprimiu enquanto as threads ainda rodavam, então o número só mostrava até onde elas tinham chegado. Não diz nada sobre incrementos perdidos.

Mais dois, menores. Uma `Thread` só inicia uma vez, e chamar `start()` de novo lança `IllegalThreadStateException`. E o `start()` retorna `void`, então `Thread t = new Thread(...).start();` não compila. Declare a thread, chame `t.start()` numa linha própria, e a variável continua ali para o `t.join()`.

# Outros seis jeitos de contar

Cada contador abaixo passou pelo mesmo teste: 4 threads, 1.000.000 de incrementos cada, 10 execuções por JDK e um cronômetro que começa depois que as threads são criadas. Os tempos dos cinco primeiros estão numa tabela no fim desta parte.

## synchronized

```java
public synchronized void increment() {
    count++;
}
```

Todo objeto Java tem um lock embutido, chamado monitor. Um método `synchronized` trava o objeto em que foi chamado, então ele funciona como `synchronized (this) { count++; }`. As quatro threads dividem um contador, o que quer dizer que disputam um monitor só. Uma thread pega o lock antes do `count++` e solta depois. Qualquer thread que chegar nesse meio tempo espera:

```
count = 41
A pega o lock, lê 41
B quer o lock -> espera
A escreve 42, solta o lock
B pega o lock, lê 42, escreve 43, solta o lock
```

O `javap -c` mostra as mesmas quatro instruções para o `count++` nas duas classes: `getfield`, `iconst_1`, `iadd`, `putfield`. No bytecode, a versão synchronized difere por uma flag do método, `ACC_SYNCHRONIZED`.

Além da exclusão, o lock dá visibilidade. Tudo o que uma thread escreveu antes de soltar um lock fica visível para a próxima thread que pegar o mesmo lock. Sem essa regra, B poderia ler um 41 velho do cache do núcleo dela.

O `get()` não é synchronized, e neste teste tudo bem, porque o `join()` garante que a `main` vê tudo o que a thread terminada escreveu. Outra thread chamando `get()` enquanto os contadores ainda rodam poderia ler um valor velho. Deixar o `get()` `synchronized` também, ou o campo `volatile`, resolve isso.

Sempre dá exatamente 4.000.000, umas vinte vezes mais lento que o contador quebrado. Pegar um lock livre custa um compare-and-swap no cabeçalho do objeto. Quando o lock está ocupado, a JVM gira um pouco e depois estaciona a thread que espera pelo sistema operacional, o que custa milhares de vezes mais que o `count++`. Neste teste quase todas as 4.000.000 aquisições encontram o lock ocupado.

Alguns cuidados:

- O lock pertence ao objeto. Quatro contadores separados seriam quatro locks e nenhuma proteção.
- `static synchronized` trava o objeto da classe (`SynchronizedCounter.class`).
- Ele é reentrante. A thread que tem o lock pode chamar outro método `synchronized` do mesmo objeto.
- Uma exceção lançada lá dentro solta o lock mesmo assim.

O Java 8 ainda tem biased locking, ligado por padrão. O bias só compensa quando uma única thread pega o mesmo lock repetidamente, e aqui são quatro. Forçar o bias desde a inicialização não ajudou, e desligar deixou o Java 8 uns 10% mais lento, por um motivo que este teste não mostra.

## volatile

```java
volatile int count = 0;

public void increment() {
    count++;
}
```

`volatile` quer dizer que toda leitura vê a última escrita, e o JIT não pode guardar o valor num registrador. O `count++` num campo volatile continua sendo uma leitura e uma escrita separadas, então duas threads ainda podem ler o mesmo valor no meio. Ele perdeu uns 57% dos incrementos.

É muito mais do que o campo simples perdeu. Com um campo simples o JIT pode guardar o `count` num registrador e juntar vários incrementos numa escrita só, então as threads mexem menos na memória compartilhada. Com `volatile`, cada incremento faz uma leitura e uma escrita de verdade numa memória que os outros núcleos estão disputando, e cada escrita acrescenta uma barreira de memória. Cada incremento fica mais lento, e as chances de colisão aumentam muito.

O lugar do `volatile` é numa flag que uma thread escreve e as outras leem, tipo `volatile boolean running`.

## AtomicInteger

```java
AtomicInteger count = new AtomicInteger(0);

public void increment() {
    count.incrementAndGet();
}
```

O `incrementAndGet()` faz a leitura, a soma e a escrita num passo só, indivisível. O código Java é um loop de compare-and-swap, mas no x86 o JIT troca isso por uma única instrução `lock xadd`. A CPU segura a linha de cache, soma e devolve o resultado, sem precisar tentar de novo.

Nenhuma thread dorme, então ele roda umas cinco vezes mais rápido que o `synchronized`. Custa mais ou menos o mesmo que o contador `volatile` quebrado, já que os dois pagam uma operação de memória travada por incremento, numa linha de cache compartilhada.

## LongAdder

```java
LongAdder count = new LongAdder();

public void increment() {
    count.add(1);
}

public long get() {
    return count.sum();
}
```

Um LongAdder guarda um valor base mais um array de células. Quando as threads colidem na base, cada uma vai para uma célula própria, e cada célula fica numa linha de cache própria. Depois disso as quatro threads escrevem quase sempre em memórias diferentes e param de brigar.

O custo vai para a leitura. O `sum()` percorre todas as células, e enquanto ainda tem gente escrevendo o resultado não é uma foto exata. Serve para contadores muito escritos e pouco lidos, como métricas.

## ReentrantLock

```java
final ReentrantLock lock = new ReentrantLock();

public void increment() {
    lock.lock();
    try {
        count++;
    } finally {
        lock.unlock();
    }
}
```

O `synchronized` solta o lock sozinho. Com o `ReentrantLock` quem chama o `unlock()` é você, sempre no `finally`, senão uma exceção deixa o lock preso e todas as outras threads esperam para sempre. Em troca você ganha opções que o `synchronized` não tem: `tryLock()`, `tryLock(timeout)`, `lockInterruptibly()`, justiça (fairness) e mais de uma `Condition` por lock.

Os locks rodaram num lote posterior, com a máquina fazendo outras coisas (load average perto de 4,6), então os números deles só se comparam dentro desse lote. Ali o lock padrão, que é não justo, levou de 58 a 87 ms no Java 8 e de 61 a 81 ms no Java 21. O `synchronized` levou de 462 a 572 ms e de 269 a 401 ms. Umas cinco vezes mais rápido.

Não justo quer dizer que uma thread que acabou de soltar o lock pode pegar de novo na hora, mesmo com outras esperando. Então uma thread faz uma sequência longa de incrementos enquanto as outras ficam estacionadas, e as trocas são raras. Por que o `synchronized` sai mais lento depende de como o monitor do HotSpot gerencia as threads que esperam, e este teste não mostra isso.

## O lock justo

```java
final ReentrantLock lock = new ReentrantLock(true);
```

O mesmo código com um argumento trocado, e rodou centenas de vezes mais devagar: de 19,7 a 31,7 segundos no Java 8.

Um lock justo vai sempre para a thread que espera há mais tempo. A thread que acabou de soltar tem que ir para o fim da fila, então cada um dos 4.000.000 de incrementos passa o lock para uma thread estacionada que o sistema operacional precisa acordar. Acordar uma thread custa microssegundos, e quantos depende do que mais a máquina está fazendo. Por isso as execuções variaram de 0,2 s a 30 s.

Justiça serve para quando nenhuma thread pode ficar sem vez, e custa muito em vazão.

## Lado a lado

Os cinco primeiros contadores, 10 execuções cada, tempos em ms:

| Contador | Java 8 | Java 21 | Contagem final |
|---|---|---|---|
| unsafe | 19 a 30 | 16 a 27 | 2,5 mi a 3,8 mi |
| volatile | 57 a 76 | 51 a 79 | 1,3 mi a 2,2 mi |
| synchronized | 357 a 397 | 352 a 471 | sempre exata |
| AtomicInteger | 65 a 84 | 61 a 76 | sempre exata |
| LongAdder | 22 a 51 | 31 a 43 | sempre exata |

O Java 8 ganhou do Java 21 com o LongAdder neste lote, com a maioria das execuções abaixo de 31 ms. No JMH os dois empataram com 1 e 4 threads, e o Java 8 ficou uns 7% na frente com 16.

# Por que o cronômetro mentiu

Meu primeiro cronômetro começava antes do primeiro `new Thread`. No contador quebrado ele deu de 88 a 104 ms no Java 8 e de 28 a 33 ms no Java 21. Com o cronômetro começando depois que as threads existem, o mesmo teste levou de 13 a 23 ms no Java 8 e de 12 a 17 ms no Java 21.

Quase toda essa diferença era a primeira lambda. Na primeira vez que a JVM monta uma lambda, ela precisa carregar e ligar toda a maquinaria de lambdas. Medida sozinha, a primeira `() -> {}` custa uns 65 ms no Java 8 e uns 9 ms no Java 21, porque o Java 21 já traz a maior parte desse trabalho pronta no arquivo de dados de classes (CDS).

Esse custo aparece em programas curtos e some em regime estável. Execuções curtas de `main()` também incluem a JVM aquecendo, e uma inicialização pode cair num modo mais rápido ou mais lento que a seguinte. Daqui em diante, toda comparação entre JDKs vem do JMH.

## Como o JMH foi montado

Tem um método `@Benchmark` por contador. Cada um chama `increment()` num contador que todas as threads do benchmark dividem (`Scope.Benchmark`), então a disputa é a mesma dos testes com `main()`. A nota é a vazão: incrementos por microssegundo, somando todas as threads. Quanto maior, melhor.

Para cada contador e cada quantidade de threads (1, 4 e 16), o JMH sobe 2 forks, que são JVMs novas. Cada fork faz 3 iterações de aquecimento de 1 segundo e depois 5 iterações medidas. O JMH mostra a média dessas 10 iterações medidas com uma margem de erro. Uma rodada completa leva uns 6 minutos por JDK. Rodei os cinco depois de reiniciar o laptop, sem mais nada aberto, um JDK depois do outro, uns 30 minutos no total.

# Do Java 8 ao 27

![Incrementos por microssegundo de cada contador com 1, 4 e 16 threads, no Java 8, 17, 21, 25 e 27](/writing/counting-with-threads/scaling.pt.png)

Cada contador tem cinco linhas, uma por JDK. Onde os JDKs concordam as linhas ficam uma por cima da outra, e na maioria dos contadores é isso que acontece. A escala é logarítmica porque, com 16 threads, o lock justo e o LongAdder estão a quatro ordens de grandeza de distância. As tabelas completas estão no apêndice.

- **A disputa custa mais que qualquer troca de versão.** Indo de 1 para 16 threads, o contador simples cai de uns 610 para 255, o `volatile` de 238 para uns 98 e o `synchronized` de uns 115 para uns 11. O gargalo é a única linha de cache onde mora o `count`, passando de núcleo em núcleo.
- **O LongAdder é o único contador que escala:** uns 260, depois 925, depois 2.000, conforme as threads vão de 1 para 4 e para 16. Todos os outros ficam mais lentos com mais threads.
- **O lock não justo acompanha o AtomicInteger** (75 a 89 contra 64 a 87 com 4 threads). Ele deixa uma thread fazer vários incrementos seguidos, então a linha de cache troca de núcleo menos vezes.
- **O lock justo** faz uns 0,2 incrementos por µs a partir de 4 threads, em todo JDK.

# Conferindo as surpresas

Algumas diferenças entre versões pareciam interessantes. Só que os JDKs rodaram em ordem, o 8 primeiro e o 27 por último, num laptop que foi esquentando durante 30 minutos. Uma tendência do 8 ao 27 podia ser só calor.

Então rodei as suspeitas de novo a partir de um único jar compilado com o Java 8, para só a JVM mudar. Os JDKs alternaram: 8, 27, 21, 25, 17 e depois a mesma lista de trás para frente, um fork por execução.

**O LongAdder ficando mais lento nos JDKs novos.** Com 16 threads a rodada principal escorregou de 2.026 no Java 8 para 1.688 no Java 27. Nas execuções alternadas o Java 27 fez uns 1.920, então quase todo o escorregão era a ordem das execuções. O que sobra são 5 a 10% entre o Java 8 e o 25 ou o 27.

**As quedas do Java 25 com uma thread.** LongAdder em 200, lock justo em 81, AtomicInteger com erro de ±24%. Mais duas execuções no 25 deram de 242 a 252 para o AtomicInteger, 261 para o LongAdder e de 111 a 119 para o lock justo, o mesmo que o Java 27 ao lado. Foi um trecho barulhento.

**O lock justo no Java 21.** Nas execuções com `main()` o Java 21 ganhou todos os pares contra o Java 8. Num segundo lote, com os JDKs alternados e 6 execuções cada, o Java 21 levou de 0,23 a 10 s e o Java 8 de 0,85 a 22 s. O JMH não confirmou. Depois do aquecimento, o lock justo faz uns 0,2 incrementos por µs em todo JDK do 8 ao 27. A diferença só aparecia em execuções curtas, que incluem a JVM aquecendo, num lock cujo tempo varia num fator de 100.

Uma que eu não sei explicar é o **AtomicInteger no Java 21**. Ele fez 101 com 16 threads, enquanto os outros JDKs ficaram entre 57 e 84. Nas repetições o Java 21 deu 100 uma vez e 62 na outra. Algumas inicializações da JVM caem nesse modo mais rápido e outras não. As causas prováveis são o layout do código gerado pelo JIT ou onde o sistema operacional coloca as threads, e descobrir qual precisa de um profiler.

# O synchronized ficou mais lento no 25 e no 27

![synchronized com 16 threads em cada JDK, a rodada principal do JMH e as repetições alternadas](/writing/counting-with-threads/synchronized.pt.png)

Com 16 threads o `synchronized` faz de 12 a 13 incrementos por µs do Java 8 ao 21 e de 8 a 9 no 25 e no 27. As repetições, os pontos no gráfico, mantiveram a queda. Com 4 threads é igual: de 15 a 16 do Java 8 ao 21, depois 12 no 25 e 9,9 no 27.

Meu primeiro suspeito foi o modo de locking, que é como o HotSpot trava um objeto para o `synchronized`. Ele muda exatamente nessas versões (segundo o `-XX:+PrintFlagsFinal`):

| JDK | Locking |
|---|---|
| 8 | biased locking ligado, locking legado (na pilha) |
| 17 | biased locking desligado, locking legado |
| 21 | `LockingMode=1`, legado |
| 25 | `LockingMode=2`, lightweight locking, o padrão desde o Java 23 |
| 27 | sem a flag `LockingMode`, só lightweight, `UseObjectMonitorTable=true` |

A queda começa exatamente onde o lightweight locking virou padrão, então troquei cada configuração no mesmo JDK. `synchronized` com 16 threads, duas execuções cada:

| JDK | Padrão | Trocado |
|---|---|---|
| 21 | legado: 11,4; 11,4 | lightweight: 12,7; 16,1 |
| 25 | lightweight: 8,8; 7,9 | legado: 9,9; 10,7 |
| 27 | monitor table ligada: 9,1; 9,4 | monitor table desligada: 9,0; 8,9 |

O lightweight locking não deixou o Java 21 mais lento. Voltar o Java 25 para o legado recuperou só parte da diferença, e a monitor table não muda nada. A maior parte da queda vem de outra coisa que mudou entre o 21 e o 25.

O melhor candidato é o JEP 491, do Java 24. Ele mudou os monitores para que uma thread virtual possa bloquear dentro de um `synchronized` sem prender a carrier thread dela, como mostra a próxima parte. Se for isso, a troca foi esta: o `synchronized` ficou muito melhor para threads virtuais e mais lento para threads de plataforma sob disputa pesada. Não provei. Para isso precisaria de um profiler (`-prof perfasm`) ou de execuções no Java 22, 23 e 24.

# Threads virtuais

Uma thread virtual é um objeto Java comum. A JVM roda as threads virtuais num pequeno pool de threads de plataforma chamadas carriers, uma por núcleo por padrão, 16 nesta máquina. Quando uma thread virtual bloqueia, a JVM tira ela da carrier (desmonta) e a carrier roda outra. É por isso que dá para ter um milhão delas.

Estes testes só compilam no JDK 21 em diante. As versões de plataforma e virtual diferem numa coisa só, o executor:

```java
ExecutorService executor = virtual
        ? Executors.newVirtualThreadPerTaskExecutor()
        : Executors.newThreadPerTaskExecutor(
                Thread.ofPlatform().factory());
// o close() no fim do try espera todas as tarefas
try (executor) {
    for (int i = 0; i < threads; i++) {
        executor.submit(() -> {
            for (int j = 0; j < perThread; j++) {
                target.increment().run();
            }
        });
    }
}
```

São execuções rápidas com `main()`, a mediana de 5 depois de um aquecimento, numa máquina que não estava parada. Os números são aproximados.

## Pinning

1.000 threads virtuais, cada uma com o seu lock, cada uma dormindo 20 ms segurando ele:

```java
// um lock por tarefa, nada é compartilhado
Object lock = new Object();
executor.submit(() -> {
    synchronized (lock) {
        sleep();              // Thread.sleep(20)
    }
});
```

Nenhum lock é compartilhado, então as 1.000 podem dormir ao mesmo tempo. Tudo devia levar uns 20 ms.

| | sem lock | synchronized | ReentrantLock |
|---|---|---|---|
| Java 21 | 22 a 25 ms | **1.266 a 1.269 ms** | 22 a 25 ms |
| Java 25 | 22 a 23 ms | 21 a 25 ms | 22 a 24 ms |
| Java 27 | 22 a 23 ms | 22 a 31 ms | 22 a 29 ms |

No Java 21, uma thread virtual que bloqueia dentro de um `synchronized` não consegue desmontar. Ela fica presa na carrier, e isso se chama pinning. Só 16 conseguem dormir ao mesmo tempo, então 1.000 / 16 × 20 ms = 1.250 ms, e foi isso que levou. O `ReentrantLock` nunca prendeu. O Java 21 mostra o pinning com `-Djdk.tracePinnedThreads=short`:

```
VirtualThread[#1058]/runnable@ForkJoinPool-1-worker-16 reason:MONITOR
    studie.counter.PinningTest.lambda$main$1(PinningTest.java:28) <== monitors:1
```

O Java 24 corrigiu isso com o JEP 491. Agora uma thread virtual pode bloquear dentro de um `synchronized` e desmontar mesmo assim. No Java 21 a recomendação era usar `ReentrantLock` em volta de qualquer coisa que bloqueie em código com threads virtuais. Do Java 24 em diante, o `synchronized` serve.

## O contador em threads virtuais

Primeiro o teste de sempre, 4 threads × 1.000.000 de incrementos. Cada célula é a faixa entre o Java 21, 25 e 27, em ms:

| Contador | Plataforma | Virtual |
|---|---|---|
| synchronized | 282 a 467 | 311 a 346 |
| ReentrantLock | 62 a 69 | 137 a 186 |
| AtomicInteger | 79 a 113 | 64 a 92 |
| LongAdder | 11 a 17 | 10 a 13 |

Depois os mesmos 4.000.000 de incrementos espalhados por 10.000 threads, 400 cada:

![A execução com 10.000 threads, de plataforma e virtuais, no Java 21, 25 e 27](/writing/counting-with-threads/virtual-threads.pt.png)

- **Threads virtuais não deixam trabalho de CPU mais rápido.** Com 4 threads, cada uma com bastante trabalho, o AtomicInteger e o LongAdder saem mais ou menos iguais nos dois tipos. As carriers fazem o mesmo trabalho de qualquer jeito.
- **O ReentrantLock fica 2 a 3 vezes mais lento em threads virtuais.** Cada vez que uma thread virtual bloqueia no lock, ela é desmontada e depois montada de novo numa carrier. Isso custa mais do que estacionar uma thread de plataforma.
- **É com muitas threads que elas ganham.** 10.000 threads de plataforma levam de 730 a 850 ms, qualquer que seja o contador, porque o custo é criar e escalonar 10.000 threads do sistema operacional. Em threads virtuais o mesmo trabalho leva de 6 a 183 ms. O LongAdder vai de uns 800 ms para 6.
- **O JEP 491 aparece aqui também.** 10.000 threads virtuais no `synchronized` levam 327 ms no Java 21 e de 105 a 117 ms no 25 e no 27. No 21, uma thread virtual esperando para entrar no monitor segura a carrier dela. Do 24 em diante ela solta.

A linha do `synchronized` na primeira tabela traz a lentidão da parte anterior. 4 threads de plataforma levam 282 ms no Java 21, e 442 e 467 ms no 25 e no 27. As duas mudanças no `synchronized` caem na mesma faixa de versões, o que combina com a ideia do JEP 491.

# O que aprendi sobre medir

- Comece o cronômetro depois do que só acontece uma vez, como carregar classes e a primeira lambda, senão ele mede a JVM aquecendo.
- Uma corrida precisa de poucas threads com muito trabalho cada. Milhares de threads minúsculas escondem ela.
- Num laptop, os resultados derivam conforme ele esquenta. Alterne a ordem do que você compara, senão uma tendência pode ser só calor.
- Uma inicialização da JVM pode cair num modo mais rápido ou mais lento. É por isso que o JMH usa vários forks. Olhe o ± antes de acreditar numa diferença.
- Repita os pontos fora da curva antes de explicar. As quedas do Java 25 não precisavam de explicação.

# Próximos passos

A pergunta em aberto é qual versão traz a lentidão do `synchronized` e qual traz a correção do pinning. Instalar o Java 22, 23 e 24 e rodar o benchmark do `synchronized` e o teste de pinning em cada um responderia.

Depois disso, um segundo experimento:

- **LocalCounter.** Cada thread conta numa variável local e soma o total uma vez só, no fim.
- **VarHandle** (Java 9), a API de baixo nível por baixo das classes atômicas.
- **Deadlock.** Duas threads pegam dois locks em ordem contrária, e o `jstack` encontra.
- **Observando as threads.** `jstack` ou JDK Mission Control durante a execução do `synchronized`, para ver threads no estado `BLOCKED`.
- **wait/notify, depois `BlockingQueue`.** Um produtor e um consumidor, escritos dos dois jeitos.

# Apêndice: as tabelas do JMH

Incrementos por microssegundo, todas as threads juntas, quanto maior melhor. O ± é a margem de erro do JMH. As colunas são a versão do Java.

## 1 thread

| Contador | 8 | 17 | 21 | 25 | 27 |
|---|---|---|---|---|---|
| unsafe | 612 ±0% | 615 ±0% | 614 ±0% | 601 ±2% | 602 ±2% |
| volatile | 238 ±0% | 239 ±0% | 239 ±0% | 235 ±1% | 237 ±1% |
| synchronized | 119 ±4% | 121 ±0% | 117 ±0% | 112 ±9% | 110 ±5% |
| AtomicInteger | 255 ±0% | 255 ±0% | 253 ±2% | 222 ±24% | 244 ±8% |
| LongAdder | 262 ±0% | 266 ±0% | 265 ±0% | 200 ±3% | 262 ±3% |
| ReentrantLock | 108 ±0% | 122 ±0% | 122 ±1% | 106 ±13% | 103 ±13% |
| lock justo | 107 ±0% | 114 ±3% | 121 ±1% | 81 ±8% | 118 ±1% |

## 4 threads

| Contador | 8 | 17 | 21 | 25 | 27 |
|---|---|---|---|---|---|
| unsafe | 271 ±10% | 286 ±2% | 283 ±2% | 278 ±5% | 260 ±18% |
| volatile | 94 ±7% | 108 ±14% | 103 ±8% | 88 ±9% | 90 ±10% |
| synchronized | 15 ±9% | 16 ±7% | 15 ±5% | 12 ±11% | 9,89 ±44% |
| AtomicInteger | 64 ±2% | 87 ±18% | 83 ±7% | 71 ±7% | 70 ±9% |
| LongAdder | 925 ±5% | 925 ±3% | 944 ±10% | 897 ±8% | 797 ±6% |
| ReentrantLock | 78 ±8% | 86 ±10% | 86 ±6% | 89 ±10% | 75 ±13% |
| lock justo | 0,20 ±2% | 0,21 ±2% | 0,22 ±7% | 0,22 ±2% | 0,24 ±28% |

## 16 threads

| Contador | 8 | 17 | 21 | 25 | 27 |
|---|---|---|---|---|---|
| unsafe | 254 ±2% | 258 ±2% | 259 ±2% | 253 ±2% | 256 ±2% |
| volatile | 94 ±1% | 98 ±1% | 101 ±1% | 100 ±2% | 100 ±2% |
| synchronized | 13 ±4% | 12 ±6% | 13 ±18% | 9,01 ±5% | 8,19 ±6% |
| AtomicInteger | 57 ±1% | 63 ±1% | 101 ±1% | 84 ±31% | 70 ±3% |
| LongAdder | 2026 ±1% | 2017 ±1% | 1882 ±4% | 1831 ±4% | 1688 ±5% |
| ReentrantLock | 74 ±2% | 82 ±10% | 85 ±3% | 85 ±6% | 81 ±12% |
| lock justo | 0,17 ±9% | 0,19 ±14% | 0,21 ±2% | 0,20 ±10% | 0,19 ±11% |
