---
title: "Counting with threads, from Java 8 to 27"
summary: "Four threads add to one shared counter. I wrote that counter seven ways, ran it on every JDK from 8 to 27, measured it with JMH, and then moved it onto virtual threads. count++ loses updates on all of them, and the order of the safe counters never moved. Virtual threads changed the most, and synchronized got slower under heavy contention on 25 and 27."
emoji: "🧵"
date: 2026-10-09
tags: [java, concurrency, jvm, benchmark]
---

**My machine**: an AMD Ryzen 7 5700U, 8 cores with 2 threads each, so 16 hardware threads. The JDKs are Amazon Corretto builds installed with SDKMAN: 8.0.504, 17.0.18, 21.0.12, 25 and 27.0.0.

---

# The question

Several threads add to one counter at the same time. What does each Java version from 8 to 27 change about that?

I wrote the counter seven ways and ran every one on Java 8, 17, 21, 25 and 27. Plain timers in `main()` came first and JMH after. At the end I moved the whole test onto virtual threads.

## The short answer

- **Correctness hasn't changed.** The plain counter and the `volatile` one lose updates on every JDK, and the five safe counters are exact on every JDK. `count++` is still a separate read and write, and the Java Memory Model behind it has been the same since Java 5.
- **The ranking hasn't moved either.** With 16 threads fighting over one counter, LongAdder does about 2,000 increments per µs. The unfair `ReentrantLock` and `AtomicInteger` do 60 to 100, `synchronized` does 8 to 16, and the fair lock about 0.2. That order holds on every JDK. With one thread, each counter scores within a few percent of the same number on all five.
- **Virtual threads (Java 21) are the big addition.** With 10,000 threads the same counting drops from about 800 ms on platform threads to between 6 and 183 ms.
- **Java 24 made `synchronized` work with virtual threads (JEP 491).** 1,000 virtual threads sleeping inside `synchronized` take 1,267 ms on Java 21 and about 22 ms on 25 and 27.
- **One thing got slower.** `synchronized` with 4 or 16 threads fighting over it is about 25 to 35% slower on 25 and 27 than on 8 to 21. My best guess is the same Java 24 change. I haven't proven it.
- **Startup got much faster.** The first lambda costs about 65 ms on Java 8 and 9 ms on Java 21.

# The bug

Every test in this text has the same shape. 4 threads share one counter and each one calls `increment()` 1,000,000 times, so the total should be 4,000,000.

The first counter has no protection at all:

```java
int count = 0;

public void increment() {
    count++;
}
```

`count++` reads the field and then writes back that value plus one. Another thread can run between the read and the write:

```
count = 41
Thread A reads 41
Thread B reads 41
Thread A writes 42
Thread B writes 42
-> two increments, count only went up by one
```

I ran it 10 times on each JDK:

| | Mean | Worst run | Best run |
|---|---|---|---|
| Java 8 | 3,293,487 (18% lost) | 66% lost | 4% lost |
| Java 21 | 3,536,310 (12% lost) | 27% lost | 6% lost |

An earlier batch of 10 on Java 21 lost 31% on average. So the same JDK moved more between two batches than the gap between Java 8 and 21 in this table. Every run on both lost updates. The JIT and the OS scheduler change how many go missing on a given run, and nothing they do makes the counter correct.

# How I fooled myself first

Before I saw the race I got the right number for the wrong reason several times. Each of these compiles and looks reasonable.

**10,000 threads, one increment each.** I got 10,000 on most runs and 9,999 now and then. Starting a thread costs tens of microseconds and `count++` takes a few nanoseconds, so each thread was done before the next one started and they almost never overlapped. A race needs threads on the same field at the same moment, which means a few threads with lots of work each. The 9,999 still counts, though. A race that shows up once in twenty runs passes the tests and then fails in production under load.

**`run()` in place of `start()`.** Always exactly 4,000,000. `run()` executes the lambda on the calling thread, `main`, and creates no thread at all. Only `start()` creates one. Printing `Thread.currentThread().getName()` inside the lambda shows it.

**`join()` right after each `start()`.** `main` waits for each thread to end before it starts the next one, so they run one at a time. Start all of them first and join them after.

**No `join()` at all.** I got 40,000, then 58,894, and sometimes 4,000,000. `main` printed while the threads were still running, so the number only showed how far they had gotten. It says nothing about lost updates.

Two smaller ones. A `Thread` starts only once, and calling `start()` on it again throws `IllegalThreadStateException`. And `start()` returns `void`, so `Thread t = new Thread(...).start();` doesn't compile. Declare the thread, call `t.start()` on its own line, and the variable is still there for `t.join()`.

# Six other ways to count

Each counter below went through the same test: 4 threads, 1,000,000 increments each, 10 runs per JDK, and a timer that starts after the threads are created. The times for the first five are in a table at the end of this part.

## synchronized

```java
public synchronized void increment() {
    count++;
}
```

Every Java object has a built-in lock, called its monitor. A `synchronized` method locks the object it's called on, so it behaves like `synchronized (this) { count++; }`. All four threads share one counter, which means they compete for one monitor. A thread takes it before `count++` and releases it after. Any thread that arrives in the meantime waits:

```
count = 41
A takes the lock, reads 41
B wants the lock -> waits
A writes 42, releases the lock
B takes the lock, reads 42, writes 43, releases the lock
```

`javap -c` shows the same four instructions for `count++` in both classes: `getfield`, `iconst_1`, `iadd`, `putfield`. In the bytecode, the synchronized version differs by one method flag, `ACC_SYNCHRONIZED`.

On top of exclusion the lock gives visibility. Whatever a thread wrote before releasing a lock is visible to the next thread that takes the same lock. Without that rule B could read a stale 41 from its core's cache.

`get()` isn't synchronized, and in this test that's fine, because `join()` guarantees that `main` sees everything the joined thread wrote. Another thread calling `get()` while the counters are still running could read a stale value. Making `get()` `synchronized` too, or the field `volatile`, fixes that.

It always comes out at exactly 4,000,000, about twenty times slower than the broken counter. Taking a free lock costs one compare-and-swap on the object header. When the lock is held, the JVM spins for a moment and then parks the waiting thread through the OS, which costs thousands of times more than `count++`. In this test almost every one of the 4,000,000 acquisitions finds the lock held.

A few things to watch:

- The lock belongs to the object. Four separate counters would mean four locks and no protection.
- `static synchronized` locks the class object (`SynchronizedCounter.class`).
- It's reentrant. The thread holding the lock can call another `synchronized` method on the same object.
- An exception thrown inside still releases the lock.

Java 8 still has biased locking, on by default. Bias only pays off when a single thread keeps taking the same lock, and four threads take this one. Forcing it on from startup didn't help, and turning it off made Java 8 about 10% slower, for a reason this test can't show.

## volatile

```java
volatile int count = 0;

public void increment() {
    count++;
}
```

`volatile` means every read sees the latest write, and the JIT may not keep the value in a register. `count++` on a volatile field is still a separate read and write, so two threads can still read the same value in between. It lost about 57% of the updates.

That's far more than the plain field lost. With a plain field the JIT is allowed to keep `count` in a register and fold several increments into one write, so the threads touch shared memory less often. With `volatile`, every increment does a real read and a real write on memory the other cores are fighting over, and every write adds a memory fence. Each increment is slower, and there are many more chances to collide.

Where `volatile` fits is a flag that one thread writes and others read, like `volatile boolean running`.

## AtomicInteger

```java
AtomicInteger count = new AtomicInteger(0);

public void increment() {
    count.incrementAndGet();
}
```

`incrementAndGet()` does the read, the add and the write as one indivisible step. The Java source is a compare-and-swap loop, but on x86 the JIT replaces it with a single `lock xadd` instruction. The CPU holds the cache line, adds, and returns the result, and it never has to retry.

No thread ever sleeps, so it runs about five times faster than `synchronized`. It costs about the same as the broken `volatile` counter, since both pay for one locked memory operation per increment on a shared cache line.

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

A LongAdder keeps a base value plus an array of cells. When threads collide on the base, each one moves to its own cell, and each cell sits on its own cache line. After that the four threads mostly write to different memory and stop fighting.

The cost moves to the read. `sum()` walks every cell, and while writers are still running the result isn't an exact snapshot. It fits counters that get written a lot and read rarely, like metrics.

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

`synchronized` releases its lock on its own. With `ReentrantLock` you call `unlock()` yourself, always in `finally`, or an exception leaves the lock held and every other thread waits forever. In exchange you get options `synchronized` doesn't have: `tryLock()`, `tryLock(timeout)`, `lockInterruptibly()`, fairness, and more than one `Condition` per lock.

The locks ran in a later batch while the machine had other work going on (load average around 4.6), so their numbers only compare within that batch. There the default lock, which is unfair, took 58 to 87 ms on Java 8 and 61 to 81 ms on Java 21. `synchronized` took 462 to 572 ms and 269 to 401 ms. That's about five times faster.

Unfair means a thread that just released the lock can take it again straight away, even with others waiting. So one thread does a long run of increments while the rest stay parked, and handoffs are rare. Why `synchronized` comes out slower depends on how HotSpot's monitor manages its waiting threads, and this test can't show that.

## The fair lock

```java
final ReentrantLock lock = new ReentrantLock(true);
```

Same code with one argument changed, and it ran hundreds of times slower: 19.7 to 31.7 seconds on Java 8.

A fair lock always goes to the thread that has waited longest. The thread that just released it has to queue at the back, so every one of the 4,000,000 increments hands the lock to a parked thread that the OS has to wake. A wake-up costs microseconds, and how many depends on what else the machine is doing. That's why runs swung anywhere from 0.2 s to 30 s.

Fairness is for when no thread may starve, and it costs a lot of throughput.

## Side by side

The first five counters, 10 runs each, times in ms:

| Counter | Java 8 | Java 21 | Final count |
|---|---|---|---|
| unsafe | 19 to 30 | 16 to 27 | 2.5M to 3.8M |
| volatile | 57 to 76 | 51 to 79 | 1.3M to 2.2M |
| synchronized | 357 to 397 | 352 to 471 | always exact |
| AtomicInteger | 65 to 84 | 61 to 76 | always exact |
| LongAdder | 22 to 51 | 31 to 43 | always exact |

Java 8 beat Java 21 with LongAdder in this batch, most of its runs under 31 ms. Under JMH the two came out equal at 1 and 4 threads, with Java 8 about 7% ahead at 16.

# Why the stopwatch lied

My first timer started before the first `new Thread`. On the broken counter it gave 88 to 104 ms on Java 8 and 28 to 33 ms on Java 21. With the timer moved to after the threads exist, the same test took 13 to 23 ms on Java 8 and 12 to 17 ms on Java 21.

Most of that difference was the first lambda. The first time a JVM builds a lambda it has to load and link the lambda machinery. Measured on its own, the first `() -> {}` costs about 65 ms on Java 8 and about 9 ms on Java 21, because Java 21 ships most of that work prepared in its class data archive.

That cost shows in short programs and disappears in steady state. Short `main()` runs also include the JVM warming up, and one launch can land in a faster or slower mode than the next. Every comparison between JDKs from here on comes from JMH.

## The JMH setup

There's one `@Benchmark` method per counter. Each calls `increment()` on a counter that all the benchmark threads share (`Scope.Benchmark`), so the contention is the same as in the `main()` tests. The score is throughput: increments per microsecond, summed over all threads. Higher is better.

For each counter and each thread count (1, 4 and 16), JMH starts 2 forks, which are fresh JVMs. Each fork does 3 warmup iterations of 1 second and then 5 measured ones. JMH reports the mean of those 10 measured iterations with an error margin. A full run takes about 6 minutes per JDK. I ran all five after a restart with nothing else open, one JDK after another, about 30 minutes in total.

# Java 8 to 27

![Increments per microsecond for each counter at 1, 4 and 16 threads, on Java 8, 17, 21, 25 and 27](/writing/counting-with-threads/scaling.png)

Each counter has five lines, one per JDK. Where the JDKs agree their lines draw over each other, and on most counters they do. The scale is logarithmic, because at 16 threads the fair lock and LongAdder are four orders of magnitude apart. The full tables are in the appendix.

- **Contention costs more than any version change.** Going from 1 to 16 threads, the plain counter drops from about 610 to 255, `volatile` from 238 to about 98, and `synchronized` from about 115 to about 11. The bottleneck is the one cache line holding `count`, moving between cores.
- **LongAdder is the only counter that scales:** about 260, then 925, then 2,000 as the threads go from 1 to 4 to 16. Every other counter gets slower with more threads.
- **The unfair lock keeps up with AtomicInteger** (75 to 89 against 64 to 87 at 4 threads). It lets one thread take many increments in a row, so the cache line moves between cores less often.
- **The fair lock** does about 0.2 increments per µs from 4 threads on, on every JDK.

# Checking the surprises

A few gaps between versions looked interesting. The JDKs had run in order, though, 8 first and 27 last, on a laptop that kept warming up for 30 minutes. A trend from 8 to 27 could just be heat.

So I ran the suspicious ones again from one jar built with Java 8, which means only the JVM changes. The JDKs alternated: 8, 27, 21, 25, 17, then the same list backwards, one fork per run.

**LongAdder getting slower on newer JDKs.** At 16 threads the main run slid from 2,026 on Java 8 to 1,688 on Java 27. In the alternating runs Java 27 got about 1,920, so most of the slide was run order. What remains is 5 to 10% between Java 8 and 25 or 27.

**The Java 25 single-thread dips.** LongAdder at 200, the fair lock at 81, AtomicInteger with an error of ±24%. Two more runs on 25 gave 242 to 252 for AtomicInteger, 261 for LongAdder and 111 to 119 for the fair lock, the same as Java 27 next to it. It was one noisy stretch.

**The fair lock on Java 21.** In the `main()` runs Java 21 won every pair against Java 8. In a second batch with the JDKs alternated, 6 runs each, Java 21 took 0.23 to 10 s and Java 8 took 0.85 to 22 s. JMH didn't confirm it. After warmup the fair lock does about 0.2 increments per µs on every JDK from 8 to 27. The gap only showed in short runs that include the JVM warming up, on a lock whose timing swings by a factor of 100.

One I can't explain is **AtomicInteger on Java 21**. It scored 101 at 16 threads, where the other JDKs sat between 57 and 84. In the reruns Java 21 gave 100 once and 62 the next time. Some JVM launches land in that faster mode and some don't. The likely causes are JIT code layout or where the OS puts the threads, and telling which needs a profiler.

# synchronized got slower on 25 and 27

![synchronized at 16 threads on each JDK, the main JMH run and the alternating reruns](/writing/counting-with-threads/synchronized.png)

At 16 threads `synchronized` does 12 to 13 increments per µs on Java 8 to 21 and 8 to 9 on 25 and 27. The reruns, the dots in the chart, kept the drop. At 4 threads it looks the same: 15 to 16 on Java 8 to 21, then 12 on 25 and 9.9 on 27.

My first suspect was the locking mode, which is how HotSpot locks an object for `synchronized`. It changes across exactly these versions (from `-XX:+PrintFlagsFinal`):

| JDK | Locking |
|---|---|
| 8 | biased locking on, legacy (stack) locking |
| 17 | biased locking off, legacy locking |
| 21 | `LockingMode=1`, legacy |
| 25 | `LockingMode=2`, lightweight locking, the default since Java 23 |
| 27 | no `LockingMode` flag left, lightweight only, `UseObjectMonitorTable=true` |

The drop starts exactly where lightweight locking became the default, so I flipped each setting on the same JDK. `synchronized` at 16 threads, two runs each:

| JDK | Default | Switched |
|---|---|---|
| 21 | legacy: 11.4, 11.4 | lightweight: 12.7, 16.1 |
| 25 | lightweight: 8.8, 7.9 | legacy: 9.9, 10.7 |
| 27 | monitor table on: 9.1, 9.4 | monitor table off: 9.0, 8.9 |

Lightweight locking didn't slow Java 21 down. Switching Java 25 back to legacy won back only part of the gap, and the monitor table makes no difference. Most of the drop comes from something else that changed between 21 and 25.

The best candidate is JEP 491 in Java 24. It changed monitors so a virtual thread can block inside `synchronized` without holding on to its carrier thread, which the next part shows. If that's the cause, the trade was this: `synchronized` got much better for virtual threads and slower for platform threads under heavy contention. I haven't proven it. That would take a profiler (`-prof perfasm`) or runs on Java 22, 23 and 24.

# Virtual threads

A virtual thread is a plain Java object. The JVM runs virtual threads on a small pool of platform threads called carriers, one per core by default, 16 on this machine. When a virtual thread blocks, the JVM takes it off its carrier (unmounts it) and the carrier runs another one. That's why you can have a million of them.

These tests compile only on JDK 21 and later. The platform and virtual versions differ in one thing, the executor:

```java
ExecutorService executor = virtual
        ? Executors.newVirtualThreadPerTaskExecutor()
        : Executors.newThreadPerTaskExecutor(
                Thread.ofPlatform().factory());
// close() at the end of the try waits for every task
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

They're quick `main()` runs, the median of 5 after one warmup, on a machine that wasn't idle. Treat the numbers as rough.

## Pinning

1,000 virtual threads, each with its own lock, each sleeping 20 ms while holding it:

```java
// one lock per task, nothing is shared
Object lock = new Object();
executor.submit(() -> {
    synchronized (lock) {
        sleep();              // Thread.sleep(20)
    }
});
```

No lock is shared, so all 1,000 can sleep at the same time. The whole thing should take about 20 ms.

| | no lock | synchronized | ReentrantLock |
|---|---|---|---|
| Java 21 | 22 to 25 ms | **1,266 to 1,269 ms** | 22 to 25 ms |
| Java 25 | 22 to 23 ms | 21 to 25 ms | 22 to 24 ms |
| Java 27 | 22 to 23 ms | 22 to 31 ms | 22 to 29 ms |

On Java 21 a virtual thread that blocks inside `synchronized` can't unmount. It stays stuck to its carrier, which is called pinning. Only 16 can sleep at a time, so 1,000 / 16 × 20 ms = 1,250 ms, and that's what it took. `ReentrantLock` never pinned. Java 21 reports it with `-Djdk.tracePinnedThreads=short`:

```
VirtualThread[#1058]/runnable@ForkJoinPool-1-worker-16 reason:MONITOR
    studie.counter.PinningTest.lambda$main$1(PinningTest.java:28) <== monitors:1
```

Java 24 fixed it with JEP 491. A virtual thread can now block inside `synchronized` and still unmount. On Java 21 the advice was to use `ReentrantLock` around anything that blocks in virtual thread code. From Java 24 on, `synchronized` is fine.

## The counter on virtual threads

The usual 4 threads × 1,000,000 increments first. Each cell is the range over Java 21, 25 and 27, in ms:

| Counter | Platform | Virtual |
|---|---|---|
| synchronized | 282 to 467 | 311 to 346 |
| ReentrantLock | 62 to 69 | 137 to 186 |
| AtomicInteger | 79 to 113 | 64 to 92 |
| LongAdder | 11 to 17 | 10 to 13 |

Then the same 4,000,000 increments spread over 10,000 threads, 400 each:

![The 10,000 thread run on platform and virtual threads, on Java 21, 25 and 27](/writing/counting-with-threads/virtual-threads.png)

- **Virtual threads don't make CPU work faster.** With 4 threads that each have plenty of work, AtomicInteger and LongAdder come out about the same on both kinds. The carriers do the same work either way.
- **ReentrantLock gets 2 to 3 times slower on virtual threads.** Each time a virtual thread blocks on the lock it gets unmounted, and later mounted again on a carrier. That costs more than parking a platform thread.
- **Many threads is where they win.** 10,000 platform threads take 730 to 850 ms whatever the counter, because creating and scheduling 10,000 OS threads is the cost. On virtual threads the same work takes 6 to 183 ms. LongAdder goes from about 800 ms to 6.
- **JEP 491 shows up here too.** 10,000 virtual threads on `synchronized` take 327 ms on Java 21 and 105 to 117 ms on 25 and 27. On 21 a virtual thread waiting to enter the monitor holds its carrier. From 24 on it lets go.

The `synchronized` row of the first table has the slowdown from the previous part in it. 4 platform threads take 282 ms on Java 21, and 442 and 467 ms on 25 and 27. Both changes to `synchronized` land in the same range of versions, which fits the JEP 491 idea.

# What I learned about measuring

- Start the timer after one-time setup like class loading and the first lambda, or it measures the JVM warming up.
- A race needs a few threads with lots of work each. Thousands of tiny threads hide it.
- On a laptop, results drift as it heats up. Alternate the order of what you compare, or a trend can be just heat.
- One JVM launch can land in a faster or slower mode. That's why JMH uses several forks. Look at the ± before believing a gap.
- Rerun outliers before explaining them. The Java 25 dips needed no explanation.

# Next

The open question is which release brings the `synchronized` slowdown and which brings the pinning fix. Installing Java 22, 23 and 24 and running the `synchronized` benchmark and the pinning test on each would answer it.

After that, a second experiment:

- **LocalCounter.** Each thread counts in a local variable and adds its total once at the end.
- **VarHandle** (Java 9), the low-level API under the atomic classes.
- **Deadlock.** Two threads take two locks in opposite order, then `jstack` finds it.
- **Watching threads.** `jstack` or JDK Mission Control during the `synchronized` run, to see threads in the `BLOCKED` state.
- **wait/notify, then `BlockingQueue`.** A producer and a consumer, written both ways.

# Appendix: the JMH tables

Increments per microsecond, all threads together, higher is better. The ± is JMH's error margin. Columns are the Java version.

## 1 thread

| Counter | 8 | 17 | 21 | 25 | 27 |
|---|---|---|---|---|---|
| unsafe | 612 ±0% | 615 ±0% | 614 ±0% | 601 ±2% | 602 ±2% |
| volatile | 238 ±0% | 239 ±0% | 239 ±0% | 235 ±1% | 237 ±1% |
| synchronized | 119 ±4% | 121 ±0% | 117 ±0% | 112 ±9% | 110 ±5% |
| AtomicInteger | 255 ±0% | 255 ±0% | 253 ±2% | 222 ±24% | 244 ±8% |
| LongAdder | 262 ±0% | 266 ±0% | 265 ±0% | 200 ±3% | 262 ±3% |
| ReentrantLock | 108 ±0% | 122 ±0% | 122 ±1% | 106 ±13% | 103 ±13% |
| fair lock | 107 ±0% | 114 ±3% | 121 ±1% | 81 ±8% | 118 ±1% |

## 4 threads

| Counter | 8 | 17 | 21 | 25 | 27 |
|---|---|---|---|---|---|
| unsafe | 271 ±10% | 286 ±2% | 283 ±2% | 278 ±5% | 260 ±18% |
| volatile | 94 ±7% | 108 ±14% | 103 ±8% | 88 ±9% | 90 ±10% |
| synchronized | 15 ±9% | 16 ±7% | 15 ±5% | 12 ±11% | 9.89 ±44% |
| AtomicInteger | 64 ±2% | 87 ±18% | 83 ±7% | 71 ±7% | 70 ±9% |
| LongAdder | 925 ±5% | 925 ±3% | 944 ±10% | 897 ±8% | 797 ±6% |
| ReentrantLock | 78 ±8% | 86 ±10% | 86 ±6% | 89 ±10% | 75 ±13% |
| fair lock | 0.20 ±2% | 0.21 ±2% | 0.22 ±7% | 0.22 ±2% | 0.24 ±28% |

## 16 threads

| Counter | 8 | 17 | 21 | 25 | 27 |
|---|---|---|---|---|---|
| unsafe | 254 ±2% | 258 ±2% | 259 ±2% | 253 ±2% | 256 ±2% |
| volatile | 94 ±1% | 98 ±1% | 101 ±1% | 100 ±2% | 100 ±2% |
| synchronized | 13 ±4% | 12 ±6% | 13 ±18% | 9.01 ±5% | 8.19 ±6% |
| AtomicInteger | 57 ±1% | 63 ±1% | 101 ±1% | 84 ±31% | 70 ±3% |
| LongAdder | 2026 ±1% | 2017 ±1% | 1882 ±4% | 1831 ±4% | 1688 ±5% |
| ReentrantLock | 74 ±2% | 82 ±10% | 85 ±3% | 85 ±6% | 81 ±12% |
| fair lock | 0.17 ±9% | 0.19 ±14% | 0.21 ±2% | 0.20 ±10% | 0.19 ±11% |
