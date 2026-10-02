---
title: "Benchmark de cache da CPU: array contra lista encadeada"
summary: "Somei os mesmos números de um array e de duas listas encadeadas no meu laptop, dobrando o tamanho de 4 KiB até 256 MiB, e fui lendo os contadores de hardware da CPU no caminho. Quando passa do tamanho dos caches, a lista embaralhada fica esperando a RAM em quase todo nó. Os mesmos nós ligados na ordem da memória continuam estáveis, porque o prefetcher não consegue diferenciá-los de um array."
emoji: "🔬"
date: 2026-09-30
tags: [cpu, cache, benchmark, c, data-structures]
---

**Minha máquina**:
- AMD Ryzen 7 5700U (Zen 2)
- 8 núcleos com 2 threads cada
  - Cada núcleo tem 32 KiB de cache L1 de dados e 512 KiB de L2
  - Cada grupo de 4 núcleos divide um L3 de 4 MiB
  - As linhas de cache têm 64 bytes e as páginas de memória, 4 KiB.

---

# Como eu meço
Antes das regras, é bom saber:
> Primeiro eu ativo esta configuração: `sudo sysctl kernel.perf_event_paranoid=1`
> Ela é necessária para os profilers conseguirem pegar dados do kernel.

Eu fixo cada execução do código em 1 núcleo com `taskset -c 2`.
### Como eu escolho as execuções
Os scripts rodam várias vezes e ficam com a mais rápida. Assim dá para descartar as execuções que sofreram alguma interferência.
### Por que cada medição precisa durar milissegundos
Tem muita coisa que pode atrapalhar um benchmark. Então, em vez de rodar uma função uma vez e pegar o tempo, a gente escreve uma função que roda por um tempo fixo de alguns milissegundos e mede lá dentro. Um exemplo:
| O que foi medido | Resultado |
|---|---|
| uma leitura do relógio | 21,5 ns |
| uma soma curta, medida sozinha (mais rápida / mediana / mais lenta) | 140 / 151 / 39.785 ns |
| a mesma soma, com a média tirada dentro de uma medição de 9 ms | 134 a 138 ns |

1. **O contador gasta tempo:** quando a gente mede uma leitura do relógio, está medindo o próprio cronômetro (o contador que marca o tempo). Numa medição única, uns 16 ns são do cronômetro, cerca de 12% do tempo.
2. **O computador interrompe o programa**: o kernel tem um timer que interrompe os programas, 1 vez por segundo. Cada interrupção leva alguns microssegundos. Numa execução única isso pode custar caro. Medindo dentro de uma janela de tempo, o custo fica pequeno.
3. **Partida a frio**: as primeiras execuções sempre demoram mais. O cache ainda está frio e a CPU gasta tempo indo buscar os dados. Depois de algumas execuções esse problema some.

### Quais contadores de hardware existem e como um programa lê
Cada núcleo da CPU tem um bloquinho chamado unidade de monitoramento de desempenho (PMU). A minha CPU tem 6 contadores, e um deles está sempre ocupado, então sobram 5. Cada contador é um par de registradores:
- **Um registrador de controle**, que diz qual evento contar e quando contar
- **O registrador de contagem**, um número que o hardware aumenta em 1 toda vez que o evento acontece

Com a flag que a gente ativou (`kernel.perf_event_paranoid=1`), o kernel deixa o programa pedir métricas, neste fluxo:
```
script                        kernel                              núcleo da CPU
------                        ------                              -------------
perf_event_open(cycles)  -->  escolhe um contador livre e grava
                              o código 0x76 + "só código de
                              usuário" no registrador de controle
                         <--  devolve um file descriptor

ioctl(RESET, ENABLE)     -->  zera a contagem e liga          --> +1 a cada tick
     ... o script roda ...
ioctl(DISABLE)           -->  desliga                         --> para

read(fd)                 -->  lê o registrador de contagem
                         <--  devolve o número
```
O kernel também cuida de alguns detalhes pra gente:
- **Ele conta só o seu programa**. O contador pertence a um núcleo, e o sistema troca esse núcleo entre programas muitas vezes por segundo. A cada troca, o kernel para o contador e guarda o valor dele, e restaura quando o programa volta a rodar. É isso que o `pid 0` ("este processo") pede no bench.
- **Ele traduz nomes em códigos**. O script pede `PERF_COUNT_HW_CPU_CYCLES`, e não 0x76. O driver AMD do kernel transforma esse nome no código da CPU. Num laptop Intel, o mesmo programa receberia o código da Intel.
- **Ele reveza os contadores quando não tem para todo mundo**. Se a gente pede mais eventos do que tem contadores livres, o kernel faz um rodízio dos eventos nos contadores e escala os resultados para cima, e aí as contagens viram estimativas. O script pede 4 eventos e a CPU tem 5 contadores livres, então as quatro contagens são reais.

# Array contra lista encadeada
O experimento é este: carregar muitos elementos em cada estrutura de dados e medir o tempo para carregar cada elemento. Arrays e listas pequenos são rápidos porque quase todos os elementos cabem nos caches da CPU. Quando o tamanho começa a crescer, a coisa fica interessante. Vou separar por medição:
## Tempo de CPU por elemento

![Nanossegundos por operação](/writing/cache-benchmark/ns_per_op.png)

Este gráfico mostra os nanossegundos por operação, ou seja, por elemento da lista. Explicando cada estrutura de dados e o que o gráfico quer dizer:

- **Array**: estrutura de dados em que os elementos ficam em memória contígua
- **Lista encadeada em ordem**: cada elemento fica numa posição diferente da memória, mas neste caso a gente aloca um do lado do outro
- **Lista encadeada embaralhada**: cada elemento fica numa posição diferente da memória, e aqui eles ficam espalhados em posições aleatórias de verdade.

A diferença entre as duas listas:
```
memória:     nó 0     nó 1     nó 2     nó 3     nó 4     nó 5     nó 6     nó 7
endereço:    0        16       32       48       64       80       96       112
             |------- linha de cache 1 ---|     |------- linha de cache 2 ----|

em ordem:    0 -> 16 -> 32 -> 48 -> 64 -> 80 -> 96 -> 112
embaralhada: 80 -> 32 -> 112 -> 0 -> 64 -> 16 -> 96 -> 48
```

### O que o gráfico quer dizer
O eixo x do gráfico é o tamanho, de 4K até 256M. O eixo y é o tempo gasto por elemento. Dá para ver que, até chegar em 32K de tamanho (o tamanho do cache L1 da minha CPU), as duas listas levam o mesmo tempo, e o array leva 4x menos.
Aqui dá para ver quantos ciclos de CPU foram gastos para somar cada elemento, em cada estrutura de dados:
![Ciclos por operação](/writing/cache-benchmark/cycles_per_op.png)
Cada int no array tem 4 bytes. Cada nó da lista tem 16.
Carregar um valor do L1 leva 4 ciclos nesta CPU. No loop da lista, o endereço do próximo nó fica guardado dentro do nó atual, então cada leitura precisa terminar antes de a próxima começar:
```
lista:  lê o nó 1 --4 ciclos--> agora o endereço do nó 2 é conhecido --4 ciclos--> endereço do nó 3 ...
array:  endereço do elemento i+1 = endereço do elemento i + 4 bytes, conhecido na hora
```
O loop do array nunca precisa esperar uma leitura para descobrir o próximo endereço. A CPU dispara as leituras de vários elementos à frente ao mesmo tempo e termina mais ou menos um elemento por ciclo.

### Instruções por ciclo
Outro gráfico interessante sobre o tempo de CPU é o IPC (instruções por ciclo). Ele mostra o quanto a CPU está ocupada. Algo entre 4 e 5 é a CPU a toda velocidade. Com 1,2 ela já passa parte do tempo esperando, e 0,011 quer dizer que quase todo ciclo vai embora esperando a memória.
![Instruções por ciclo](/writing/cache-benchmark/ipc.png)
Os 3 gráficos estão ligados, e este aqui é o inverso dos outros. O array mantém as instruções num ritmo constante. Já a lista embaralhada aumenta o tempo ocioso da CPU conforme o tamanho cresce, porque os cache misses aumentam e a CPU precisa esperar os outros níveis de cache ou a RAM mandarem os dados.

## Cache miss
![Cache miss](/writing/cache-benchmark/cache_miss.png)

Dá para ver aqui. Até chegar em 32K (o tamanho do cache L1), não tem cache miss no L1. Conforme o tamanho continua crescendo, eles ficam mais comuns, porque a estrutura de dados começa a não caber mais nos caches da CPU.

## Por que o array e a lista em ordem continuam estáveis com tamanhos grandes

Agora uma parte interessante: mesmo quando o array e a lista em ordem ficam maiores que o cache L3, o custo das operações não cresce, continua estável. Aqui entra uma peça importante da CPU, **o prefetcher**. Uma parte da CPU fica observando os endereços que as leituras usam. Quando vê esses endereços avançando pela memória, linha após linha, ela começa a buscar as próximas linhas antes de o programa pedir. Ela só enxerga endereços, então não sabe que aquilo é uma lista encadeada. Esses nós estão em ordem crescente na memória, e o padrão fica igual ao de ler um array. A lista embaralhada pula para lugares aleatórios, e o prefetcher não tem nada para prever.

O `cache_misses_per_op` mostra isso direto. Na RAM, a lista em ordem dá miss no L2 mais ou menos uma vez a cada 100 nós (0,01). A lista embaralhada dá miss mais ou menos uma vez por nó (1,0).

---
É isso, um experimento pequeno para entender um pouco mais de CPU, de caches e das operações nessas 2 estruturas de dados. Este é o script que eu uso para medir:

```c
/*
 * Array vs linked list.
 *
 * Adds up every element of three data structures, for sizes from 4 KiB to 256 MiB:
 *
 *   array          a plain array of ints
 *   list_in_order  a linked list whose nodes sit one after another in memory
 *   list_shuffled  the same nodes, linked together in a random order
 *
 * The size is how much memory the structure takes up, so all three cross the
 * cache sizes at the same point on the plot. A node takes 16 bytes and an int
 * takes 4, so at the same size a list holds 4 times fewer elements.
 * All results are per element.
 */

#include "bench.h"

#include <stdio.h>
#include <stdlib.h>

#define REPEATS 5

/* Elements visited per measurement. Lower than in example_sum because the
 * shuffled list gets very slow once it no longer fits in the caches. */
#define TOTAL_OPS ((size_t)16 * 1024 * 1024)

typedef struct Node {
    struct Node *next;  /* 8 bytes */
    int value;          /* 4 bytes. The compiler adds 4 more bytes of padding so that,
                           in an array of nodes, every pointer starts at a multiple of 8. */
} Node;

static void *allocate(size_t bytes) {
    void *memory = malloc(bytes);
    if (memory == NULL) {
        fprintf(stderr, "out of memory\n");
        exit(1);
    }
    return memory;
}

/* How many times to go over `count` elements so a measurement visits about TOTAL_OPS. */
static size_t passes_for(size_t count) {
    size_t passes = TOTAL_OPS / count;
    if (passes == 0) {
        passes = 1;  /* the structure is bigger than TOTAL_OPS: go over it once */
    }
    return passes;
}

static void measure_array(size_t size) {
    size_t count = size / sizeof(int);
    size_t passes = passes_for(count);

    int *array = allocate(size);
    for (size_t i = 0; i < count; i++) {
        array[i] = (int)i;
    }

    Measurement best;
    for (int r = 0; r < REPEATS; r++) {
        bench_start();

        uint64_t sum = 0;
        for (size_t p = 0; p < passes; p++) {
            for (size_t i = 0; i < count; i++) {
                sum += array[i];
            }
        }

        Measurement m = bench_stop();
        bench_keep(sum);
        if (r == 0 || m.ns < best.ns) {
            best = m;
        }
    }

    bench_print_row("array", size, best, passes * count);
    free(array);
}

/* Links each node to the one right after it in memory: 0 -> 1 -> 2 -> 3 ... */
static Node *link_in_order(Node *nodes, size_t count) {
    for (size_t i = 0; i < count - 1; i++) {
        nodes[i].next = &nodes[i + 1];
    }
    nodes[count - 1].next = NULL;
    return &nodes[0];
}

/* Links the same nodes in a random order, for example 5 -> 2 -> 7 -> 0 ... */
static Node *link_shuffled(Node *nodes, size_t count) {
    /* Start with the order 0, 1, 2, 3 ... and shuffle it (Fisher-Yates shuffle:
     * walk backwards, swapping each position with a random earlier one). */
    size_t *order = allocate(count * sizeof(size_t));
    for (size_t i = 0; i < count; i++) {
        order[i] = i;
    }
    for (size_t i = count - 1; i > 0; i--) {
        size_t j = (size_t)rand() % (i + 1);
        size_t temp = order[i];
        order[i] = order[j];
        order[j] = temp;
    }

    /* The node at order[0] points to the node at order[1], and so on. */
    for (size_t i = 0; i < count - 1; i++) {
        nodes[order[i]].next = &nodes[order[i + 1]];
    }
    nodes[order[count - 1]].next = NULL;

    Node *head = &nodes[order[0]];
    free(order);
    return head;
}

static void measure_list(const char *variant, Node *head, size_t size, size_t count) {
    size_t passes = passes_for(count);

    Measurement best;
    for (int r = 0; r < REPEATS; r++) {
        bench_start();

        uint64_t sum = 0;
        for (size_t p = 0; p < passes; p++) {
            for (Node *node = head; node != NULL; node = node->next) {
                sum += node->value;
            }
        }

        Measurement m = bench_stop();
        bench_keep(sum);
        if (r == 0 || m.ns < best.ns) {
            best = m;
        }
    }

    bench_print_row(variant, size, best, passes * count);
}

int main(void) {
    bench_init();
    bench_print_header("size_bytes");

    srand(1);  /* the same "random" order on every run, so results can be repeated */

    for (size_t size = 4 * KiB; size <= 256 * MiB; size *= 2) {
        measure_array(size);

        /* Both lists use the same block of nodes. Only the links between them change. */
        size_t count = size / sizeof(Node);
        Node *nodes = allocate(size);
        for (size_t i = 0; i < count; i++) {
            nodes[i].value = (int)i;
        }

        Node *head = link_in_order(nodes, count);
        measure_list("list_in_order", head, size, count);

        head = link_shuffled(nodes, count);
        measure_list("list_shuffled", head, size, count);

        free(nodes);
    }
    return 0;
}
```
