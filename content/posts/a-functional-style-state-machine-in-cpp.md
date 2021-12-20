---
title: A Functional-Style State Machine in C++
published: true
description: It turns out that C++'s type-system does not allow for recursive types. This is annoying. There is no reason why a function should not be able to return itself.
# tags: cpp, functional, programming
# series: A Functional-Style State Machine in C++
date: 2017-05-26
---

If you go to any of your colleagues now and ask them, _"can a function in C++ return itself?"_ they will probably give you the wrong answer.
Now ask them what the return type of the function is going to be. Here, let me help you:

```C++
using SelfReturning = SelfReturning (*)();

SelfReturning A() { return A; }
```

Great!
But it doesn't compile. and neither does

```C++
auto A() { return A; }
```

It turns out that C++'s type-system does not allow for recursive types. This is annoying. There is no reason why a function should not be able to return itself. It is even more annoying given that object methods can return the objects that hold them:

```C++
struct A {
    A operator()() { return A(); }
};
```

This code works. And for obvious reasons. Object methods are not a part of the object. They do not affect the object size or its construction. They are just a syntactic utility. There is no type-system recursion going on here.

With functions there is obvious type-recursion. But if you look at the work the compiler actually has to do - it seems absurd. A function is never constructed, it just is. It is not allocated. The function's signature changes nothing about the type.

```C++
void* A() {
    return reinterpret_cast<void*>(A);  // Same as C's `(void*)A`
}

int main() { 
    auto a = A;

    while (true) {
        // Cast back to function pointer
        a = reinterpret_cast<void*(*)()>(A());
    }

    return 0;
}
```
See? No missing information. The compiler has all the knowledge it needs, but the type-system still prevents us from writing our code (or, in this case, from writing it in a type-safe manner). We can do better.

We already know that objects can be used to break type recursion. Let's see if we can use them here without creating so much boiler-plate code:

```C++
struct SelfReturning {
	using FuncType = SelfReturning(*)(); // (1)
	
	SelfReturning(FuncType func) : _func{func} {} // (2)
	SelfReturning operator() () { return _func(); } // (3)

	private:
		FuncType _func;
};
```
The answer is yes. We _can_. Just substitute this class for the failed type definition of the first example and everything works as advertised. But how does it work?
To break the type-recursion, we create a proxy object. Its sole purpose is to hold a function pointer and call it.
Line **(1)** defines the function type that we expect to hold. Note that there is no direct recursion there. **(2)** is the constructor, taking the function pointer and storing it. **(3)** is where we forward the call to the function pointer. Note that here, too there is no type recursion as the type of the class is distinct from the type of its `operator()` function.
As a bonus, this compiles identical to the `reinterpret_cast<void*>` version in both Clang and GCC when using `-O3` (see [here](https://godbolt.org/g/QDz9Oc) and [here](https://godbolt.org/g/ln0AZG)), and at the same time maintaining type-safety. Zero-cost abstraction at work.

But why is that interesting? What are the use-cases?


Well, during the last few months, I've routinely consumed one programming-related talk per day. I find it a great way to expand my knowledge, and far easier to do than reading an article every day.

Last week, while working on some minor state-machine, I came across [Declarative Thinking, Declarative Practice](https://youtu.be/nrVIlhtoE3Y) by [Kevlin Henney](https://twitter.com/KevlinHenney). Upon seeing [this slide](https://youtu.be/nrVIlhtoE3Y?t=1h17m3s):

![](https://thepracticaldev.s3.amazonaws.com/i/6103sjmjyeq7bpp7aiz8.png)

I thought - bare functions instead of the State design pattern? I have to try that! So I went ahead and wrote my code, iterating through the steps described above. 
At a quick glance, the functor solution may seem satisfying. But in effect functors, unlike functions, have different types and cannot be assigned to the same variable. To bridge the gap, we use an abstract base-class and polymorphism. Once we do that, we are forced to use pointers to hold the states. I use `std::unique_ptr` as I don't want to manage the memory myself.

```C++
#include <memory>

struct IState {
    virtual std::unique_ptr<IState> operator()() = 0;
    virtual ~IState() {};
};

struct A : public IState { std::unique_ptr<IState> operator()(); };
struct B : public IState { std::unique_ptr<IState> operator()(); };

std::unique_ptr<IState> A::operator()() { return std::make_unique<B>(); }
std::unique_ptr<IState> B::operator()() { return std::make_unique<A>(); }

int main() {
    std::unique_ptr<IState> state = std::make_unique<A>();

    while (true) { state = (*state)(); }

    return 0;
}
```
The proxy-object trick, however, has no such overhead. We know that we are using objects, but the code does not show it. The compiled version is far simpler as well (see [here](https://godbolt.org/g/RoIt28) and [here](https://godbolt.org/g/lXJpb8)).


```C++
struct State {
    using FuncType = State(*)();
    State(FuncType func) : _func{func} {};
    State operator()() { return _func(); }
    FuncType _func;
};

State A();
State B();

State A() { return B; }
State B() { return A; }

int main() {
    State state = A;

    while (true) { state = state(); }
    
    return 0;
}
```

Enhancing it a bit, to handle events and operate on a context, we still maintain very simple, straight-forward code. For the purpose of this example, `abort()` and `printf()` are used instead of `throw std::runtime_error` and `std::cout` because the compiled output is easier to read. See compilation [here](https://godbolt.org/g/LcAsfU) and execution [here](http://coliru.stacked-crooked.com/a/64b54b8c5282ac23).

```C++
#include <cstdio>
#include <cstdlib>

enum class Event{ A, B, };

struct Context {
    int counter = 0;
};

struct State {
    using FuncType = State(*)(Context&, Event);
    State(FuncType func) : _func{func} {};
    State operator()(Context& ctx, Event evt) { return _func(ctx, evt); }
    FuncType _func;
};

State A(Context&, Event);
State B(Context&, Event);

State A(Context& ctx, Event evt) {
    printf("State A, counter = %d\n", ctx.counter);
    ++ctx.counter;
    switch (evt) {
        case Event::A :
            return A;
        case Event::B :
            return B;
        default:
            abort();
    }
}

State B(Context& ctx, Event evt) {
    printf("State B, counter = %d\n", ctx.counter);
    ++ctx.counter;
    switch (evt) {
        case Event::A :
            return A;
        case Event::B :
            return B;
        default:
            abort();
    }
}

int main() {
    State state = A;
    Context ctx{};
    Event events[] = {Event::B, Event::A, Event::B, Event::A, };

    for (auto evt : events) {
        state = state(ctx, evt);
    }

    return 0;
}
```

For those keen on functional programming, we can even pass in a const reference to the context, and return a new context along with the new state. [Compilation](https://godbolt.org/g/Dd1XKr), [execution](http://coliru.stacked-crooked.com/a/e7ef3a7ab08e0e88).

```C++
#include <tuple>
#include <cstdio>
#include <cstdlib>

enum class Event{ A, B, };

struct Context {
    Context Inc() const {
        return Context{counter + 1};
    }
    int counter = 0;
};

struct State {
    using RetType = std::pair<State, const Context>;
    using FuncType = RetType(*)(const Context&, Event);
    State(FuncType func) : _func{func} {};
    RetType operator()(Context& ctx, Event evt) { return _func(ctx, evt); }
    FuncType _func;
};

State::RetType A(const Context&, Event);
State::RetType B(const Context&, Event);

State::RetType A(const Context& ctx, Event evt) {
    printf("State A, counter = %d\n", ctx.counter);
    switch (evt) {
        case Event::A :
            return {A, ctx};
        case Event::B :
            return {B, ctx.Inc()};
        default:
            abort();
    }
}

State::RetType B(const Context& ctx, Event evt) {
    printf("State B, counter = %d\n", ctx.counter);
    switch (evt) {
        case Event::A :
            return {A, ctx.Inc()};
        case Event::B :
            return {B, ctx};
        default:
            abort();
    }
}

int main() {
    State state = A;
    Context ctx{};
    Event events[] = {Event::B, Event::A, Event::B, Event::A, };

    for (auto evt : events) {
        std::tie(state, ctx) = state(ctx, evt);
    }

    return 0;
}

```

And that's it. We have a state machine based on pure-, bare-functions, in C++. It has a nice, simple look to it and as we've seen, compiles into far simpler code than the alternatives. On the way, we've also learned a bit about C++'s type system and how to use objects to overcome its limitations.
In the [next post](https://dev.to/tmr232/a-functional-style-state-machine-in-c-part-2) (~~_soon to be populated_~~ _now online!_) I will show some exciting (read: never use in production) dark template magic to both generalize the `State` object and to get some compile-time guarantees. Stay tuned!