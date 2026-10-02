---
title: "CPU Cache benchmark between array and linked list"
summary: "I summed the same numbers from an array and from two linked lists on my laptop, doubling the size from 4 KiB up to 256 MiB, and read the CPU's hardware counters along the way. Past the size of the caches, the shuffled list waits on RAM for nearly every node. The same nodes linked in memory order stay flat, because the prefetcher can't tell them apart from an array."
emoji: "🔬"
date: 2026-09-30
tags: [cpu, cache, benchmark, c, data-structures]
---

**My Machine**: 
- AMD Ryzen 7 5700U (Zen 2)
- 8 cores with 2 threads each
  - Every core has a 32 KiB L1 data cache and a 512 KiB L2
  - Each group of 4 cores shares a 4 MiB L3
  - Cache lines are 64 bytes and memory pages are 4 KiB.

---

# How I measure
Before the rules, nice to know:
> First I activate this setting: `sudo sysctl kernel.perf_event_paranoid=1`
> necessary to allow the profilers to get data from the kernel
> 
I pin each code execution to 1 core using the flag `taskset -c 2`
### How I select the runs
The logic used in the scripts was several runs, but selecting the fastest one. With this we can discard some that can have any interference.
### Why each measurement has to last milliseconds
There are several things that can interfere in a benchmark run. So, instead of running one function and getting the time, we need to write a function to run for a fixed time in milliseconds and measure inside that. An example:
| What was timed | Result |
|---|---|
| one clock read | 21.5 ns |
| one short sum, timed alone (fastest / median / slowest) | 140 / 151 / 39,785 ns |
| the same sum, averaged inside a 9 ms measurement | 134 to 138 ns |

1. **The counter takes time:** If we measure one clock read, we're getting the time of the stopwatch (the counter that measures the clock time). In the one clock read, about 16ns is the stopwatch (12% of the time)
2. **The computer interrupts the program**: The kernel has a timer to interrupt programs, 1 time per second. Each interruption takes some microseconds. In single runs that can cost a lot. But if we're measuring in a time range, the cost is smaller.
3. **Cold start**: The first runs always take more time. We have a cold cache, so the CPU will spend time reaching for the data. Once we have some runs, we don't have this problem anymore.

### What hardware counters and how a program can read
Each core of the CPU has a small block called the performance monitoring unit (PMU). Our CPU has 6 counters, one is always taken, so we have 5 available. Each counter is a pair of registers:
- **A control register**, which says which event to count and when to count it
- The **count register**, a number the hardware increases by 1 every time an event happens

With the flag we activate (`kernel.perf_event_paranoid=1`), we allow the kernel to let the program ask for metrics, like this flow:
``` 
script                        kernel                              CPU core
-------                        ------                              --------
perf_event_open(cycles)  -->  picks a free counter, writes code
                              0x76 + "user code only" into its
                              control register
                         <--  returns a file descriptor

ioctl(RESET, ENABLE)     -->  sets the count to 0, turns it on --> +1 every tick
     ... the script runs ...
ioctl(DISABLE)           -->  turns it off                     --> stops

read(fd)                 -->  reads the count register
                         <--  returns the number
```
The kernel also takes care of a few details for us:
- **It counts your program only**. The counter belongs to a core, and the OS switches that core between programs many times a second. On every switch, the kernel stops the counter and saves its value, then restores it when the program runs again. That's what `pid 0` ("this process") asks for in bench.
- **It translates names into codes**. The script asks for `PERF_COUNT_HW_CPU_CYCLES`, not 0x76. The kernel's AMD driver turns that name into the CPU's code. On an Intel laptop, the same program would get Intel's code.
- **It shares counters when there aren't enough**. If we ask for more events than there are free counters, the kernel rotates them through the counters and scales the results up, so the counts become estimates. The script asks for 4 events and the CPU has 5 free counters, so all four counts are real.

# Array vs linked list
The experiment is: Load many elements in each data structure, and measure the time to load each element. Small arrays / linked lists are fast because most of the elements fit in the CPU caches. But when the size starts increasing, interesting things start happening. Let's divide in each measurement I did:
## CPU Time per element

![Nanoseconds per operation](/writing/cache-benchmark/ns_per_op.png)

This graph shows the nanoseconds per operation, that is, per element in the list. Let me explain each data structure and the meaning of the graph:

- **Array**: Data structure where the elements are structured in a contiguous memory
- **Linked List in order**: Each element is in a different memory position. But in this case, we allocate them next to each other in memory
- **Linked List shuffled**: Each element is in a different memory position, but in this case, not next to each other, in real random positions.

Linked list differences:
```
memory:     node 0   node 1   node 2   node 3   node 4   node 5   node 6   node 7
address:    0        16       32       48       64       80       96       112
            |------- cache line 1 --------|     |------- cache line 2 ---------|

in order:   0 -> 16 -> 32 -> 48 -> 64 -> 80 -> 96 -> 112
shuffled:   80 -> 32 -> 112 -> 0 -> 64 -> 16 -> 96 -> 48
```

### Meaning of the graph
The x axis of the graph is the size. From 4K to 256M. The y is the time spent per element. What we can get is that until it reaches 32K of size (the L1 cache size of my CPU) both linked lists have the same time, and the array 4x less. 
Here we can see how many CPU cycles were spent adding each element per data structure:
![Cycles per operation](/writing/cache-benchmark/cycles_per_op.png)
Each int in the array is 4 bytes. Each linked list node is 16 bytes.
Loading a value from L1 takes 4 cycles on my CPU. In the list loop, the next node's address is stored inside the current node, so each load has to finish before the next one can start:
```
list:   load node 1 --4 cycles--> now node 2's address is known --4 cycles--> node 3's address ...
array:  address of element i+1 = address of element i + 4 bytes, known right away
```
The array loop never has to wait for a load to learn the next address. The CPU starts loads for many upcoming elements at once and finishes about one element per cycle.

### Instructions per cycle
Another interesting graph that shows the CPU time is the IPC (Instructions per cycle). This shows how busy the CPU is. Around 4 to 5 means it's running at full speed, 1.2 means it's waiting part of the time, and 0.011 means it spends almost every cycle waiting for memory.
![Instructions per cycle](/writing/cache-benchmark/ipc.png)
If we see, the 3 graphs are linked, and this one is the inverse of the others, we see that the array keeps the instructions linear, but the shuffled linked list increases the CPU idle time when the size starts increasing, because there are more cache misses and the CPU needs to wait for the other cache levels or RAM to send the data.

## Cache miss
![Cache miss](/writing/cache-benchmark/cache_miss.png)

Here we can see. Until it reaches 32K (L1 cache size), we don't have L1 cache misses. But when the size keeps increasing, they're more common because the data structure stops fitting in the CPU caches.

## Why arrays and ordered linked lists stay linear with big sizes

Now an interesting part: even when arrays and ordered linked lists become bigger than the L3 cache, the operations don't grow, they stay linear. Here comes an important logic in the CPU, **the prefetcher**. Part of the CPU watches the addresses your loads use. When it sees them moving forward through memory line after line, it starts fetching the next lines before the program asks for them. It only sees addresses, so it doesn't know this is a linked list. These nodes happen to sit in increasing order in memory, so the pattern looks the same as reading an array. The shuffled list jumps around at random, and the prefetcher has nothing to predict.

`cache_misses_per_op` shows this directly. In RAM, the in-order list misses L2 about once every 100 nodes (0.01), while the shuffled list misses about once per node (1.0).

---
That's it, a small experiment to understand a little bit more about CPUs, caches and operations in these 2 data structures. Here is the script I use to measure:

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